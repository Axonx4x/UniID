"""Phase 4 QR-based verification service, cryptographic entropy, and privacy tests."""

import uuid
from datetime import timedelta
import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import verification_rate_limiter
from app.models import (
    CredentialEvent,
    DigitalCredential,
    Institution,
    Student,
    VerificationEvent,
)
from app.services.credentials import CredentialLifecycleService, utc_now
from app.services.qr import build_verification_url, generate_qr_data_url
from app.services.verification import VerificationService
from conftest import login_as


def tenant_header(institution: Institution) -> dict[str, str]:
    return {"X-Institution-Context": str(institution.id)}


@pytest.mark.anyio
async def test_qr_reference_generation_and_uniqueness(
    client: httpx.AsyncClient, seeded_data: dict[str, object], db_session: Session
):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    assert isinstance(institution, Institution) and isinstance(student, Student)

    await login_as(client, "registry")
    response = await client.post(
        f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials",
        headers=tenant_header(institution),
    )
    assert response.status_code == 201
    cred_data = response.json()
    ref = cred_data["public_reference"]

    # Verify prefix and sufficient entropy (24 bytes base64 -> 32 chars + 'cr_' prefix = 35 chars)
    assert ref.startswith("cr_")
    assert len(ref) >= 35

    # Check uniqueness in database
    count = db_session.scalar(
        select(func.count())
        .select_from(DigitalCredential)
        .where(DigitalCredential.public_reference == ref)
    )
    assert count == 1


@pytest.mark.anyio
async def test_qr_payload_canonical_url_and_privacy(
    client: httpx.AsyncClient, seeded_data: dict[str, object]
):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    assert isinstance(institution, Institution) and isinstance(student, Student)

    await login_as(client, "registry")
    response = await client.post(
        f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials",
        headers=tenant_header(institution),
    )
    cred_data = response.json()
    ref = cred_data["public_reference"]

    url = build_verification_url(ref)
    assert url.endswith(f"/verify/{ref}")

    qr_data_url = generate_qr_data_url(ref)
    assert qr_data_url.startswith("data:image/svg+xml")

    # Strict check: QR payload must NOT contain student PII or private keys
    assert student.student_number not in url
    assert "Alpha Student" not in url
    assert str(student.id) not in url
    assert str(institution.id) not in url
    assert "password" not in url


@pytest.mark.anyio
async def test_valid_credential_verification_and_minimal_disclosure(
    client: httpx.AsyncClient, seeded_data: dict[str, object]
):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    assert isinstance(institution, Institution) and isinstance(student, Student)

    await login_as(client, "registry")
    issue_res = await client.post(
        f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials",
        headers=tenant_header(institution),
    )
    assert issue_res.status_code == 201
    ref = issue_res.json()["public_reference"]

    # Logout to verify as unauthenticated external verifier
    await client.post("/api/v1/auth/logout")

    res = await client.get(f"/api/v1/public/verify/{ref}")
    assert res.status_code == 200
    assert res.headers["cache-control"] == "no-store, no-cache, must-revalidate, private"
    assert res.headers["pragma"] == "no-cache"

    body = res.json()
    assert body["status"] == "valid"
    assert body["valid"] is True
    assert body["institution_name"] == institution.name
    assert body["student_display_name"] == "Student Example"
    assert body["programme_name"] == "Alpha Programme"
    assert body["issued_at"] is not None
    assert body["expires_at"] is not None
    assert body["verified_at"] is not None
    assert "valid and currently active" in body["message"].lower()

    # Privacy verification: assert no forbidden fields
    forbidden_keys = [
        "student_number", "student_id", "id", "user_id", "email",
        "date_of_birth", "reason", "actor_user_id", "audit", "events"
    ]
    for key in forbidden_keys:
        assert key not in body, f"Disallowed field '{key}' disclosed in public response"


@pytest.mark.anyio
async def test_suspended_and_reinstated_lifecycle_verification(
    client: httpx.AsyncClient, seeded_data: dict[str, object]
):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    assert isinstance(institution, Institution) and isinstance(student, Student)

    await login_as(client, "registry")
    issue_res = await client.post(
        f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials",
        headers=tenant_header(institution),
    )
    cred_id = issue_res.json()["id"]
    ref = issue_res.json()["public_reference"]

    # Suspend credential
    suspend_res = await client.post(
        f"/api/v1/institutions/{institution.id}/credentials/{cred_id}/suspend",
        headers=tenant_header(institution),
        json={"reason": "Temporary administrative hold for document verification"},
    )
    assert suspend_res.status_code == 200

    # Verify public endpoint immediately reflects suspension
    verify_res = await client.get(f"/api/v1/public/verify/{ref}")
    assert verify_res.status_code == 200
    verify_body = verify_res.json()
    assert verify_body["status"] == "suspended"
    assert verify_body["valid"] is False
    assert "suspended" in verify_body["message"].lower()
    # Ensure suspension reason is NEVER disclosed publicly
    assert "administrative hold" not in str(verify_body)

    # Reinstate credential
    reinstate_res = await client.post(
        f"/api/v1/institutions/{institution.id}/credentials/{cred_id}/reinstate",
        headers=tenant_header(institution),
        json={"reason": "Documentation provided and verified by registrar"},
    )
    assert reinstate_res.status_code == 200

    # Verify public endpoint immediately reflects active status
    verify_res2 = await client.get(f"/api/v1/public/verify/{ref}")
    assert verify_res2.status_code == 200
    assert verify_res2.json()["status"] == "valid"
    assert verify_res2.json()["valid"] is True


@pytest.mark.anyio
async def test_revocation_is_terminal_for_verification(
    client: httpx.AsyncClient, seeded_data: dict[str, object]
):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    assert isinstance(institution, Institution) and isinstance(student, Student)

    await login_as(client, "registry")
    issue_res = await client.post(
        f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials",
        headers=tenant_header(institution),
    )
    cred_id = issue_res.json()["id"]
    ref = issue_res.json()["public_reference"]

    # Revoke credential
    revoke_res = await client.post(
        f"/api/v1/institutions/{institution.id}/credentials/{cred_id}/revoke",
        headers=tenant_header(institution),
        json={"reason": "Permanent withdrawal from academic institution"},
    )
    assert revoke_res.status_code == 200

    # Verify public endpoint reflects terminal revocation
    verify_res = await client.get(f"/api/v1/public/verify/{ref}")
    assert verify_res.status_code == 200
    verify_body = verify_res.json()
    assert verify_body["status"] == "revoked"
    assert verify_body["valid"] is False
    assert "revoked" in verify_body["message"].lower()
    assert "Permanent withdrawal" not in str(verify_body)


@pytest.mark.anyio
async def test_expired_credential_deterministic_clock(
    db_session: Session, seeded_data: dict[str, object]
):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    user = seeded_data["users"]["registry"]
    assert isinstance(institution, Institution) and isinstance(student, Student)

    issued = CredentialLifecycleService.issue(
        db_session, institution.id, student.id, user.id, utc_now()
    )
    ref = issued.public_reference

    # Deterministic clock test without sleeps: test at time past expires_at
    future_now = issued.expires_at + timedelta(minutes=5)
    result = VerificationService.verify(db_session, ref, now=future_now)
    assert result.status == "expired"
    assert result.valid is False
    assert "expired" in result.message.lower()


@pytest.mark.anyio
async def test_pending_credential_is_not_valid(
    client: httpx.AsyncClient, db_session: Session, seeded_data: dict[str, object]
):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    assert isinstance(institution, Institution) and isinstance(student, Student)

    pending_cred = DigitalCredential(
        institution_id=institution.id,
        student_id=student.id,
        status="pending",
        public_reference="cr_draft_pending_12345678",
    )
    db_session.add(pending_cred)
    db_session.commit()

    res = await client.get("/api/v1/public/verify/cr_draft_pending_12345678")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "invalid"
    assert body["valid"] is False
    assert body["institution_name"] is None


@pytest.mark.anyio
async def test_unknown_and_malformed_references(client: httpx.AsyncClient):
    # Unknown reference of valid format
    res = await client.get("/api/v1/public/verify/cr_unknown_reference_1234567890")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "invalid"
    assert body["valid"] is False
    assert body["institution_name"] is None
    assert body["student_display_name"] is None
    assert "invalid or unknown" in body["message"].lower()

    # Oversized reference
    oversized = "cr_" + "x" * 100
    res_oversized = await client.get(f"/api/v1/public/verify/{oversized}")
    assert res_oversized.status_code == 422


@pytest.mark.anyio
async def test_inactive_institution_cannot_have_valid_credentials(
    client: httpx.AsyncClient, db_session: Session, seeded_data: dict[str, object]
):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    assert isinstance(institution, Institution) and isinstance(student, Student)

    await login_as(client, "registry")
    issue_res = await client.post(
        f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials",
        headers=tenant_header(institution),
    )
    ref = issue_res.json()["public_reference"]

    # Deactivate institution
    institution.status = "inactive"
    db_session.commit()

    # Public verification must return invalid without disclosing inactive institution
    res = await client.get(f"/api/v1/public/verify/{ref}")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "invalid"
    assert body["valid"] is False
    assert body["institution_name"] is None


@pytest.mark.anyio
async def test_verification_does_not_mutate_credential_state(
    client: httpx.AsyncClient, db_session: Session, seeded_data: dict[str, object]
):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    assert isinstance(institution, Institution) and isinstance(student, Student)

    await login_as(client, "registry")
    issue_res = await client.post(
        f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials",
        headers=tenant_header(institution),
    )
    cred_id = issue_res.json()["id"]
    ref = issue_res.json()["public_reference"]

    cred_uuid = uuid.UUID(cred_id)
    cred_before = db_session.scalar(
        select(DigitalCredential).where(DigitalCredential.id == cred_uuid)
    )
    assert cred_before is not None
    updated_at_before = cred_before.updated_at
    events_count_before = db_session.scalar(
        select(func.count()).select_from(CredentialEvent)
    )

    # Perform multiple public verifications
    for _ in range(3):
        res = await client.get(f"/api/v1/public/verify/{ref}")
        assert res.status_code == 200

    db_session.expire_all()
    cred_after = db_session.scalar(
        select(DigitalCredential).where(DigitalCredential.id == cred_uuid)
    )
    assert cred_after is not None
    assert cred_after.updated_at == updated_at_before
    assert cred_after.status == "active"

    # Crucial: verification requests must NOT create credential lifecycle events
    events_count_after = db_session.scalar(
        select(func.count()).select_from(CredentialEvent)
    )
    assert events_count_after == events_count_before


@pytest.mark.anyio
async def test_verification_event_recording_and_privacy(
    client: httpx.AsyncClient, db_session: Session, seeded_data: dict[str, object]
):
    institution = seeded_data["institution_a"]
    student = seeded_data["student"]
    assert isinstance(institution, Institution) and isinstance(student, Student)

    await login_as(client, "registry")
    issue_res = await client.post(
        f"/api/v1/institutions/{institution.id}/students/{student.id}/credentials",
        headers=tenant_header(institution),
    )
    ref = issue_res.json()["public_reference"]

    # Verify as guest
    await client.post("/api/v1/auth/logout")
    res = await client.get(f"/api/v1/public/verify/{ref}")
    assert res.status_code == 200

    # Query latest verification event
    event = db_session.scalar(
        select(VerificationEvent).order_by(VerificationEvent.created_at.desc())
    )
    assert event is not None
    assert event.outcome == "valid"
    assert event.institution_id == institution.id
    assert event.verifier_user_id is None

    # Privacy check on metadata: raw reference and full IP addresses must NOT be saved
    metadata_str = str(event.request_metadata)
    assert ref not in metadata_str
    assert "127.0.0.1" not in metadata_str
    assert "Alpha Student" not in metadata_str


@pytest.mark.anyio
async def test_verification_rate_limiting(client: httpx.AsyncClient):
    verification_rate_limiter.reset("verify:testclient")

    # Client IP in testclient
    transport = client._transport

    # Simulate hitting rate limit
    for _ in range(30):
        verification_rate_limiter.record_attempt("verify:testclient")

    assert verification_rate_limiter.is_limited("verify:testclient")


def test_production_https_validation():
    with pytest.raises(ValueError, match="VERIFICATION_BASE_URL must use HTTPS"):
        Settings(
            ENVIRONMENT="production",
            SESSION_SECRET="a" * 32,
            VERIFICATION_BASE_URL="http://insecure-host.example/verify",
        )
