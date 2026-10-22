"""Tests for student onboarding, OTP verification, verification pathways, and roster management."""

import uuid
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.identity import Membership, Student, User
from app.models.credential import DigitalCredential
from app.models.institution import Institution
from app.models.onboarding import (
    EmailOtpChallenge,
    ImportedStudentRecord,
    RosterImport,
    StudentOnboardingRequest,
)
from app.services.otp import DEV_SIMULATED_MAILBOX
from scripts.seed_demo_tenant import seed_demo_data
from conftest import login_as
from app.core.config import settings


@pytest.mark.anyio
async def test_registration_rejects_unauthorized_email_domain(
    client: httpx.AsyncClient, seeded_data: dict[str, object]
):
    inst_a = seeded_data["institution_a"]
    resp = await client.post(
        "/api/v1/onboarding/register",
        json={
            "institution_id": str(inst_a.id),
            "institutional_email": "intruder@gmail.com",
            "full_name": "Intruder User",
            "password": "ValidPassword!2026",
            "student_number": "AFI/2026/001",
        },
    )
    assert resp.status_code == 400
    assert "not recognized" in resp.json()["error"]["message"]


@pytest.mark.anyio
async def test_registration_and_dev_mailbox_otp(
    client: httpx.AsyncClient, seeded_data: dict[str, object]
):
    inst_a = seeded_data["institution_a"]
    email = "newstudent@student.alpha.invalid"

    resp = await client.post(
        "/api/v1/onboarding/register",
        json={
            "institution_id": str(inst_a.id),
            "institutional_email": email,
            "full_name": "New Alpha Student",
            "password": "ValidPassword!2026",
            "student_number": "AFI/2026/001",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["reference"].startswith("ONB-")
    assert data["status"] == "contact_verification_required"

    # Query dev mailbox
    mailbox_resp = await client.get(f"/api/v1/onboarding/dev-mailbox?email={email}")
    assert mailbox_resp.status_code == 200
    mailbox_data = mailbox_resp.json()
    assert mailbox_data["entry"] is not None
    assert len(mailbox_data["entry"]["code"]) == 6


@pytest.mark.anyio
async def test_registration_requires_configured_mail_delivery(
    client: httpx.AsyncClient, seeded_data: dict[str, object], monkeypatch
):
    monkeypatch.setattr(settings, "OTP_DELIVERY_MODE", "smtp")
    monkeypatch.setattr(settings, "SMTP_HOST", None)
    monkeypatch.setattr(settings, "SMTP_FROM_EMAIL", None)
    inst_a = seeded_data["institution_a"]
    response = await client.post(
        "/api/v1/onboarding/register",
        json={
            "institution_id": str(inst_a.id),
            "institutional_email": "smtp-required@student.alpha.invalid",
            "full_name": "SMTP Required",
            "password": "ValidPassword!2026",
            "student_number": "AFI/2026/001",
        },
    )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "OTP_DELIVERY_FAILED"


@pytest.mark.anyio
async def test_otp_verification_invalid_code_and_lockout(
    client: httpx.AsyncClient, seeded_data: dict[str, object]
):
    inst_a = seeded_data["institution_a"]
    email = "lockout@student.alpha.invalid"

    reg = await client.post(
        "/api/v1/onboarding/register",
        json={
            "institution_id": str(inst_a.id),
            "institutional_email": email,
            "full_name": "Lockout Student",
            "password": "ValidPassword!2026",
        },
    )
    reference = reg.json()["reference"]

    # 4 invalid attempts
    for _ in range(4):
        verify_resp = await client.post(
            "/api/v1/onboarding/verify-code",
            json={"reference": reference, "code": "000000"},
        )
        assert verify_resp.status_code == 422
        assert "Incorrect verification code" in verify_resp.json()["error"]["message"]

    # 5th invalid attempt exhausts attempts
    fifth = await client.post(
        "/api/v1/onboarding/verify-code",
        json={"reference": reference, "code": "000000"},
    )
    assert fifth.status_code == 422
    assert "Maximum attempts exceeded" in fifth.json()["error"]["message"]


@pytest.mark.anyio
async def test_otp_resend_cooldown(
    client: httpx.AsyncClient, seeded_data: dict[str, object]
):
    inst_a = seeded_data["institution_a"]
    email = "cooldown@student.alpha.invalid"

    reg = await client.post(
        "/api/v1/onboarding/register",
        json={
            "institution_id": str(inst_a.id),
            "institutional_email": email,
            "full_name": "Cooldown Student",
            "password": "ValidPassword!2026",
        },
    )
    reference = reg.json()["reference"]

    # Resend immediately -> 429
    resend_resp = await client.post(
        "/api/v1/onboarding/resend-code",
        json={"reference": reference},
    )
    assert resend_resp.status_code == 429
    assert "wait" in resend_resp.json()["error"]["message"].lower()


@pytest.mark.anyio
async def test_path_a_automated_verification_success(
    client: httpx.AsyncClient, seeded_data: dict[str, object], db_session: Session
):
    """Path A: valid student number in SIS adapter auto-verifies and links account."""
    inst_a = seeded_data["institution_a"]
    email = "alice@student.alpha.invalid"
    student_number = "AFI/2026/001"

    reg = await client.post(
        "/api/v1/onboarding/register",
        json={
            "institution_id": str(inst_a.id),
            "institutional_email": email,
            "full_name": "Alice Test",
            "password": "ValidPassword!2026",
            "student_number": student_number,
        },
    )
    reference = reg.json()["reference"]

    # Fetch OTP from dev mailbox
    mailbox = await client.get(f"/api/v1/onboarding/dev-mailbox?email={email}")
    code = mailbox.json()["entry"]["code"]

    verify_resp = await client.post(
        "/api/v1/onboarding/verify-code",
        json={"reference": reference, "code": code},
    )
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["status"] == "verified"
    assert data["pathway_outcome"] == "api_auto_verified"

    # Verify student and membership records were created in DB
    user = db_session.scalar(select(User).where(User.email == email))
    assert user is not None
    student = db_session.scalar(select(Student).where(Student.user_id == user.id))
    assert student is not None
    assert student.student_number == student_number
    membership = db_session.scalar(
        select(Membership).where(
            Membership.user_id == user.id,
            Membership.institution_id == inst_a.id,
        )
    )
    assert membership is not None
    assert membership.role == "student"
    assert membership.status == "active"


@pytest.mark.anyio
async def test_unilia_test_tenant_completes_registration_otp_and_dashboard_access(
    client: httpx.AsyncClient, db_session: Session
):
    """The default UNILIA walkthrough creates a dashboard-ready student account."""
    seed_demo_data(db_session)
    email = "cen-01-41-23@unilia.ac.mw"
    password = "UniliaTest!2026"

    registration = await client.post(
        "/api/v1/onboarding/register",
        json={
            "institution_slug": "unilia",
            "institutional_email": email,
            "full_name": "UNILIA Test Student",
            "password": password,
            "student_number": "cen-01-41-23",
        },
    )
    assert registration.status_code == 201
    reference = registration.json()["reference"]

    mailbox = await client.get(f"/api/v1/onboarding/dev-mailbox?email={email}")
    code = mailbox.json()["entry"]["code"]
    verification = await client.post("/api/v1/onboarding/verify-code", json={"reference": reference, "code": code})
    assert verification.status_code == 200
    assert verification.json()["status"] == "verified"
    assert verification.json()["pathway_outcome"] == "api_auto_verified"

    login = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    unilia_membership = next(
        membership for membership in login.json()["user"]["memberships"]
        if membership["institution"]["slug"] == "unilia"
    )
    profile = await client.get(
        f"/api/v1/institutions/{unilia_membership['institution']['id']}/students/me/credential",
        headers={"X-Institution-Context": unilia_membership["institution"]["id"]},
    )
    assert profile.status_code == 200
    assert profile.json()["credential"]["status"] == "active"


@pytest.mark.anyio
async def test_path_a_unknown_record_routes_to_staff_review(
    client: httpx.AsyncClient, seeded_data: dict[str, object]
):
    """Path A: unknown student number in SIS routes to staff review queue."""
    inst_a = seeded_data["institution_a"]
    email = "unknown@student.alpha.invalid"

    reg = await client.post(
        "/api/v1/onboarding/register",
        json={
            "institution_id": str(inst_a.id),
            "institutional_email": email,
            "full_name": "Unknown Student",
            "password": "ValidPassword!2026",
            "student_number": "NON-EXISTENT/999",
        },
    )
    reference = reg.json()["reference"]
    mailbox = await client.get(f"/api/v1/onboarding/dev-mailbox?email={email}")
    code = mailbox.json()["entry"]["code"]

    verify_resp = await client.post(
        "/api/v1/onboarding/verify-code",
        json={"reference": reference, "code": code},
    )
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["status"] == "verification_review_required"
    assert data["pathway_outcome"] == "api_not_found"


@pytest.mark.anyio
async def test_path_b_roster_match_routes_to_pending_review(
    client: httpx.AsyncClient, seeded_data: dict[str, object], db_session: Session
):
    """Path B: Institution B (file_and_review). Roster match sets verification_pending, never auto-verified."""
    inst_b = seeded_data["institution_b"]
    email = "roster.matched@student.beta.invalid"
    student_no = "BFC/2026/501"

    # Seed an imported roster record for Institution B
    registry_user = seeded_data["users"]["registry"]
    roster_import = RosterImport(
        institution_id=inst_b.id,
        uploaded_by_user_id=registry_user.id,
        version_tag="v2026.01",
        filename="beta_students.csv",
        total_rows=1,
        valid_rows=1,
        is_authoritative_snapshot=True,
        status="committed",
    )
    db_session.add(roster_import)
    db_session.flush()

    record = ImportedStudentRecord(
        institution_id=inst_b.id,
        roster_import_id=roster_import.id,
        student_number=student_no,
        institutional_email=email,
        full_name="Beta Matched Student",
        enrollment_status="Active",
        programme_code="BP",
        campus_code="MAIN",
        academic_year="2026",
        is_current=True,
    )
    db_session.add(record)
    db_session.commit()

    reg = await client.post(
        "/api/v1/onboarding/register",
        json={
            "institution_id": str(inst_b.id),
            "institutional_email": email,
            "full_name": "Beta Matched Student",
            "password": "ValidPassword!2026",
            "student_number": student_no,
        },
    )
    reference = reg.json()["reference"]
    mailbox = await client.get(f"/api/v1/onboarding/dev-mailbox?email={email}")
    code = mailbox.json()["entry"]["code"]

    verify_resp = await client.post(
        "/api/v1/onboarding/verify-code",
        json={"reference": reference, "code": code},
    )
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["status"] == "verification_pending"
    assert data["pathway_outcome"] == "roster_matched_pending_review"

    # Check status endpoint - must NOT return credential card data
    status_resp = await client.get(f"/api/v1/onboarding/status/{reference}")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == "verification_pending"
    assert status_data["roster_match_status"] == "matched"
    assert "credential" not in status_data

    # A roster match is still a staff decision. Make the registry user an
    # administrator for this fixture tenant, then ensure the normal queue can
    # approve it and create a dashboard-ready student/credential record.
    db_session.add(Membership(
        id=uuid.uuid4(),
        user_id=registry_user.id,
        institution_id=inst_b.id,
        role="registry_admin",
        status="active",
    ))
    db_session.commit()
    await login_as(client, "registry")
    headers = {"X-Institution-Context": str(inst_b.id)}
    queue = await client.get(f"/api/v1/institutions/{inst_b.id}/onboarding-queue", headers=headers)
    assert queue.status_code == 200
    item = next(item for item in queue.json()["items"] if item["reference"] == reference)
    approval = await client.post(
        f"/api/v1/institutions/{inst_b.id}/onboarding-queue/{item['id']}/review",
        headers=headers,
        json={"decision": "approve"},
    )
    assert approval.status_code == 200
    assert approval.json()["status"] == "verified"
    student = db_session.scalar(select(Student).where(Student.institution_id == inst_b.id, Student.student_number == student_no))
    assert student is not None
    assert db_session.scalar(select(DigitalCredential).where(DigitalCredential.student_id == student.id)) is not None


@pytest.mark.anyio
async def test_staff_review_queue_and_approval(
    client: httpx.AsyncClient, seeded_data: dict[str, object], db_session: Session
):
    """Staff review queue: list, approve, and verify student account linking."""
    inst_a = seeded_data["institution_a"]
    email = "manual.review@student.alpha.invalid"

    # Register and verify with non-matching student number so it goes to review queue
    reg = await client.post(
        "/api/v1/onboarding/register",
        json={
            "institution_id": str(inst_a.id),
            "institutional_email": email,
            "full_name": "Manual Review Student",
            "password": "ValidPassword!2026",
            "student_number": "MANUAL-001",
        },
    )
    reference = reg.json()["reference"]
    mailbox = await client.get(f"/api/v1/onboarding/dev-mailbox?email={email}")
    code = mailbox.json()["entry"]["code"]
    await client.post(
        "/api/v1/onboarding/verify-code",
        json={"reference": reference, "code": code},
    )

    # Login as registry admin
    await login_as(client, "registry")

    # Access queue with tenant context
    headers = {"X-Institution-Context": str(inst_a.id)}
    queue_resp = await client.get(
        f"/api/v1/institutions/{inst_a.id}/onboarding-queue",
        headers=headers,
    )
    assert queue_resp.status_code == 200
    items = queue_resp.json()["items"]
    target = next((item for item in items if item["reference"] == reference), None)
    assert target is not None

    # Approve request
    review_resp = await client.post(
        f"/api/v1/institutions/{inst_a.id}/onboarding-queue/{target['id']}/review",
        headers=headers,
        json={"decision": "approve", "notes": "Verified student ID manually in admissions office."},
    )
    assert review_resp.status_code == 200
    assert review_resp.json()["status"] == "verified"

    # Confirm user has active membership now
    user = db_session.scalar(select(User).where(User.email == email))
    assert user is not None
    membership = db_session.scalar(
        select(Membership).where(Membership.user_id == user.id, Membership.institution_id == inst_a.id)
    )
    assert membership is not None
    assert membership.status == "active"


@pytest.mark.anyio
async def test_staff_review_queue_cross_tenant_isolation(
    client: httpx.AsyncClient, seeded_data: dict[str, object]
):
    """Staff of Institution A cannot access Institution B's queue."""
    inst_b = seeded_data["institution_b"]

    await login_as(client, "registry")  # registry admin for institution_a only
    headers = {"X-Institution-Context": str(inst_b.id)}

    resp = await client.get(
        f"/api/v1/institutions/{inst_b.id}/onboarding-queue",
        headers=headers,
    )
    assert resp.status_code == 403


@pytest.mark.anyio
async def test_roster_preview_and_commit(
    client: httpx.AsyncClient, seeded_data: dict[str, object]
):
    """Registry admin can preview and commit CSV rosters."""
    inst_a = seeded_data["institution_a"]
    await login_as(client, "registry")
    headers = {"X-Institution-Context": str(inst_a.id)}

    csv_data = """student_number,institutional_email,enrollment_status,programme_code,campus_code,academic_year,full_name
AFI/2026/101,student101@student.alpha.invalid,Active,AP,MAIN,2026,Alpha One
AFI/2026/102,student102@student.alpha.invalid,Active,AP,MAIN,2026,Alpha Two
INVALID_ROW,bad_email,Active,AP,MAIN,2026,Bad Row
"""

    # Preview
    preview_resp = await client.post(
        f"/api/v1/institutions/{inst_a.id}/roster/preview",
        headers=headers,
        json={"csv_content": csv_data, "is_authoritative_snapshot": False},
    )
    assert preview_resp.status_code == 200
    preview = preview_resp.json()
    assert preview["total_rows"] == 3
    assert preview["valid_rows_count"] == 2
    assert preview["rejected_rows_count"] == 1

    # Commit
    commit_resp = await client.post(
        f"/api/v1/institutions/{inst_a.id}/roster/commit",
        headers=headers,
        json={
            "csv_content": csv_data,
            "filename": "alpha_batch_1.csv",
            "is_authoritative_snapshot": True,
        },
    )
    assert commit_resp.status_code == 201
    committed = commit_resp.json()
    assert committed["valid_rows"] == 2
    assert committed["status"] == "committed"

    # Freshness
    freshness_resp = await client.get(
        f"/api/v1/institutions/{inst_a.id}/roster/freshness",
        headers=headers,
    )
    assert freshness_resp.status_code == 200
    freshness = freshness_resp.json()
    assert freshness["is_stale"] is False
    assert freshness["total_active_records"] == 2
