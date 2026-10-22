"""Phase 3 lifecycle, eligibility, event integrity, and tenant authorization coverage."""

from datetime import timedelta

import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditEvent, CredentialEvent, DigitalCredential, Institution, ProgrammeEnrollment, Student
from app.services.credentials import CredentialLifecycleService, utc_now
from conftest import login_as


def headers(institution: Institution) -> dict[str, str]:
    return {"X-Institution-Context": str(institution.id)}


def event_count(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(CredentialEvent)) or 0


@pytest.mark.anyio
async def test_eligible_registry_issuance_creates_credential_event_and_audit(client: httpx.AsyncClient, seeded_data: dict[str, object], db_session: Session):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    assert isinstance(institution, Institution) and isinstance(student, Student)
    await login_as(client, "registry")
    response = await client.post(f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials", headers=headers(institution))
    assert response.status_code == 201
    credential = response.json()
    assert credential["status"] == "active"
    assert credential["public_reference"].startswith("cr_")
    assert "issued_by_user_id" not in credential
    assert event_count(db_session) == 1
    assert db_session.scalar(select(func.count()).select_from(AuditEvent)) == 1
    assert (await client.get(f"/api/v1/institutions/{institution.id}/credentials/{credential['id']}/events", headers=headers(institution))).json()["items"][0]["event_type"] == "credential.issued"


@pytest.mark.anyio
async def test_issuance_rejects_unknown_cross_tenant_inactive_or_ineligible_student(client: httpx.AsyncClient, seeded_data: dict[str, object], db_session: Session):
    institution_a = seeded_data["institution_a"]
    institution_b = seeded_data["institution_b"]
    student_a = seeded_data["student"]
    other_student = seeded_data["other_student"]
    assert isinstance(institution_a, Institution) and isinstance(institution_b, Institution)
    assert isinstance(student_a, Student) and isinstance(other_student, Student)
    await login_as(client, "registry")
    unknown = await client.post(f"/api/v1/institutions/{institution_a.id}/students/00000000-0000-0000-0000-000000000000/credentials", headers=headers(institution_a))
    assert unknown.status_code == 404
    cross = await client.post(f"/api/v1/institutions/{institution_b.id}/students/{other_student.id}/credentials", headers=headers(institution_b))
    assert cross.status_code == 403
    enrollment = db_session.scalar(select(ProgrammeEnrollment).where(ProgrammeEnrollment.student_id == student_a.id))
    assert enrollment is not None
    enrollment.status = "suspended"
    db_session.commit()
    ineligible = await client.post(f"/api/v1/institutions/{institution_a.id}/students/{student_a.id}/credentials", headers=headers(institution_a))
    assert ineligible.status_code == 409
    assert ineligible.json()["error"]["code"] == "CREDENTIAL_INELIGIBLE"
    institution_a.status = "inactive"
    db_session.commit()
    inactive = await client.get(f"/api/v1/institutions/{institution_a.id}/students/{student_a.id}/credential-eligibility", headers=headers(institution_a))
    assert inactive.status_code == 403


@pytest.mark.anyio
async def test_duplicate_active_issuance_and_non_registry_roles_are_denied(client: httpx.AsyncClient, seeded_data: dict[str, object]):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    assert isinstance(institution, Institution) and isinstance(student, Student)
    await login_as(client, "registry")
    first = await client.post(f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials", headers=headers(institution))
    second = await client.post(f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials", headers=headers(institution))
    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "ACTIVE_CREDENTIAL_EXISTS"
    client.cookies.clear()
    await login_as(client, "verifier")
    assert (await client.post(f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials", headers=headers(institution))).status_code == 403
    client.cookies.clear()
    await login_as(client, "student")
    assert (await client.post(f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials", headers=headers(institution))).status_code == 403


@pytest.mark.anyio
async def test_suspend_reinstate_revoke_and_event_integrity(client: httpx.AsyncClient, seeded_data: dict[str, object], db_session: Session):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    assert isinstance(institution, Institution) and isinstance(student, Student)
    await login_as(client, "registry")
    issued = await client.post(f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials", headers=headers(institution))
    credential_id = issued.json()["id"]
    invalid_reason = await client.post(f"/api/v1/institutions/{institution.id}/credentials/{credential_id}/suspend", headers=headers(institution), json={"reason": " "})
    assert invalid_reason.status_code == 422
    suspended = await client.post(f"/api/v1/institutions/{institution.id}/credentials/{credential_id}/suspend", headers=headers(institution), json={"reason": "Synthetic review"})
    assert suspended.status_code == 200 and suspended.json()["status"] == "suspended"
    reinstated = await client.post(f"/api/v1/institutions/{institution.id}/credentials/{credential_id}/reinstate", headers=headers(institution), json={"reason": "Review cleared"})
    assert reinstated.status_code == 200 and reinstated.json()["status"] == "active"
    revoked = await client.post(f"/api/v1/institutions/{institution.id}/credentials/{credential_id}/revoke", headers=headers(institution), json={"reason": "Synthetic final decision"})
    assert revoked.status_code == 200 and revoked.json()["status"] == "revoked"
    terminal = await client.post(f"/api/v1/institutions/{institution.id}/credentials/{credential_id}/reinstate", headers=headers(institution), json={"reason": "Cannot undo"})
    assert terminal.status_code == 409
    events = (await client.get(f"/api/v1/institutions/{institution.id}/credentials/{credential_id}/events", headers=headers(institution))).json()["items"]
    assert {event["event_type"] for event in events} == {"credential.issued", "credential.suspended", "credential.reinstated", "credential.revoked"}
    assert event_count(db_session) == 4


def test_expiry_is_authoritative_and_processing_is_idempotent(db_session: Session, seeded_data: dict[str, object]):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    user = seeded_data["users"]["registry"]
    assert isinstance(institution, Institution) and isinstance(student, Student)
    credential = CredentialLifecycleService.issue(db_session, institution.id, student.id, user.id, utc_now())
    credential.issued_at = utc_now() - timedelta(days=2)
    credential.expires_at = utc_now() - timedelta(seconds=1)
    db_session.commit()
    assert CredentialLifecycleService.is_valid(credential, utc_now()) is False
    assert CredentialLifecycleService.expire_overdue(db_session, utc_now(), institution.id) == 1
    assert CredentialLifecycleService.expire_overdue(db_session, utc_now(), institution.id) == 0
    db_session.refresh(credential)
    assert credential.status == "expired"
    assert event_count(db_session) == 2


def test_issuance_materializes_an_overdue_active_credential_before_replacement(db_session: Session, seeded_data: dict[str, object]):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    user = seeded_data["users"]["registry"]
    assert isinstance(institution, Institution) and isinstance(student, Student)
    overdue = CredentialLifecycleService.issue(db_session, institution.id, student.id, user.id, utc_now())
    overdue.issued_at = utc_now() - timedelta(days=2)
    overdue.expires_at = utc_now() - timedelta(seconds=1)
    db_session.commit()

    replacement = CredentialLifecycleService.issue(db_session, institution.id, student.id, user.id, utc_now())

    db_session.refresh(overdue)
    assert overdue.status == "expired"
    assert replacement.status == "active"
    assert event_count(db_session) == 3


def test_failed_transition_writes_no_event_and_reinstatement_rechecks_eligibility(db_session: Session, seeded_data: dict[str, object]):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    user = seeded_data["users"]["registry"]
    assert isinstance(institution, Institution) and isinstance(student, Student)
    credential = CredentialLifecycleService.issue(db_session, institution.id, student.id, user.id)
    CredentialLifecycleService.suspend(db_session, institution.id, credential.id, user.id, "Synthetic review")
    enrollment = db_session.scalar(select(ProgrammeEnrollment).where(ProgrammeEnrollment.student_id == student.id))
    assert enrollment is not None
    enrollment.status = "suspended"
    db_session.commit()
    before = event_count(db_session)
    with pytest.raises(Exception):
        CredentialLifecycleService.reinstate(db_session, institution.id, credential.id, user.id, "Should fail")
    db_session.rollback()
    assert event_count(db_session) == before


@pytest.mark.anyio
async def test_student_sees_only_own_credential_profile_and_events_are_private(client: httpx.AsyncClient, seeded_data: dict[str, object]):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    assert isinstance(institution, Institution) and isinstance(student, Student)
    await login_as(client, "registry")
    issued = await client.post(f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials", headers=headers(institution))
    credential_id = issued.json()["id"]
    client.cookies.clear()
    await login_as(client, "student")
    own = await client.get(f"/api/v1/institutions/{institution.id}/students/me/credential", headers=headers(institution))
    assert own.status_code == 200
    assert own.json()["credential"]["id"] == credential_id
    private_events = await client.get(f"/api/v1/institutions/{institution.id}/credentials/{credential_id}/events", headers=headers(institution))
    assert private_events.status_code == 403
