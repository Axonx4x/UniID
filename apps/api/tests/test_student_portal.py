"""Comprehensive tests for UniID Student Dashboard and Self-Service Portal."""

import uuid
import pytest
import httpx
from sqlalchemy.orm import Session
from app.models.identity import Student, User
from app.models.credential import DigitalCredential
from app.models.student_portal import StudentNotification, StudentRequest
from conftest import login_as


@pytest.mark.anyio
async def test_unauthenticated_student_access_rejected(client: httpx.AsyncClient):
    response = await client.get("/api/v1/student/dashboard")
    assert response.status_code == 401


@pytest.mark.anyio
async def test_student_dashboard_overview(client: httpx.AsyncClient, db_session: Session, seeded_data: dict):
    login_res = await login_as(client, "student")
    assert login_res.status_code == 200

    response = await client.get("/api/v1/student/dashboard")
    assert response.status_code == 200
    data = response.json()

    assert data["account"]["email"] == "student@demo.invalid"
    assert data["institution"]["name"] == "Alpha Fictional Institute"
    assert data["student"]["student_number"] == "SAME-001"
    assert data["verification"]["status"] in ("verified", "approved")
    assert "credential" in data
    assert "eligibility" in data
    assert "unread_notifications_count" in data
    assert "pending_requests_count" in data


@pytest.mark.anyio
async def test_student_profile_read_and_update(client: httpx.AsyncClient, db_session: Session, seeded_data: dict):
    await login_as(client, "student")

    # Read profile
    get_res = await client.get("/api/v1/student/profile")
    assert get_res.status_code == 200
    prof = get_res.json()
    assert prof["account"]["email"] == "student@demo.invalid"
    assert prof["student"]["student_number"] == "SAME-001"

    # Update permitted fields: full_name and phone_number
    patch_res = await client.patch(
        "/api/v1/student/profile",
        json={"full_name": "Updated Student Name", "phone_number": "+265 888 111 222"},
    )
    assert patch_res.status_code == 200
    updated_prof = patch_res.json()
    assert updated_prof["account"]["full_name"] == "Updated Student Name"
    assert updated_prof["student"]["phone_number"] == "+265 888 111 222"
    # Ensure institutional fields are unchanged
    assert updated_prof["student"]["student_number"] == "SAME-001"


@pytest.mark.anyio
async def test_student_photo_upload_validation(client: httpx.AsyncClient, db_session: Session, seeded_data: dict):
    await login_as(client, "student")

    # Reject non-image text file
    invalid_file = ("test.txt", b"This is not a photograph file", "text/plain")
    res_invalid = await client.post(
        "/api/v1/student/profile/photo",
        files={"file": invalid_file},
    )
    assert res_invalid.status_code == 400
    assert "UNSUPPORTED_IMAGE_FORMAT" in res_invalid.text or "image" in res_invalid.text.lower()

    # Accept valid minimal JPEG (starts with \xff\xd8\xff)
    valid_jpeg_bytes = b"\xff\xd8\xff\xe0" + b"\x00" * 200
    valid_file = ("photo.jpg", valid_jpeg_bytes, "image/jpeg")
    res_valid = await client.post(
        "/api/v1/student/profile/photo",
        files={"file": valid_file},
    )
    assert res_valid.status_code == 200
    upload_data = res_valid.json()
    assert upload_data["success"] is True
    assert upload_data["photo_url"].startswith("/api/v1/student/photo/")

    # Also test 'photo' multipart key for resilience
    res_photo_key = await client.post(
        "/api/v1/student/profile/photo",
        files={"photo": ("photo2.jpg", valid_jpeg_bytes, "image/jpeg")},
    )
    assert res_photo_key.status_code == 200


@pytest.mark.anyio
async def test_student_credential_and_history(client: httpx.AsyncClient, db_session: Session, seeded_data: dict):
    await login_as(client, "student")

    res_cred = await client.get("/api/v1/student/credential")
    assert res_cred.status_code == 200

    res_history = await client.get("/api/v1/student/credentials")
    assert res_history.status_code == 200
    history_data = res_history.json()
    assert "current_credential" in history_data
    assert "credentials" in history_data


@pytest.mark.anyio
async def test_student_request_lifecycle(client: httpx.AsyncClient, db_session: Session, seeded_data: dict):
    await login_as(client, "student")

    # Submit correction request
    create_res = await client.post(
        "/api/v1/student/requests",
        json={
            "category": "correction",
            "subject": "Correction of Middle Name",
            "description": "My middle name is missing from the academic registry record.",
            "field_name": "full_name",
            "current_value": "Student Example",
            "requested_value": "Student Alexander Example",
        },
    )
    assert create_res.status_code == 201
    created_req = create_res.json()
    assert created_req["reference"].startswith("REQ-")
    assert created_req["status"] == "pending"
    req_id = created_req["id"]

    # List requests
    list_res = await client.get("/api/v1/student/requests")
    assert list_res.status_code == 200
    req_page = list_res.json()
    assert req_page["total"] >= 1
    assert any(item["id"] == req_id for item in req_page["items"])

    # Get single request
    detail_res = await client.get(f"/api/v1/student/requests/{req_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == req_id


@pytest.mark.anyio
async def test_student_notifications(client: httpx.AsyncClient, db_session: Session, seeded_data: dict):
    await login_as(client, "student")

    notif_res = await client.get("/api/v1/student/notifications")
    assert notif_res.status_code == 200
    notifs = notif_res.json()
    assert "items" in notifs
    assert "unread_count" in notifs

    # Mark all read
    mark_all = await client.post("/api/v1/student/notifications/mark-all-read")
    assert mark_all.status_code == 200


@pytest.mark.anyio
async def test_student_password_change(client: httpx.AsyncClient, db_session: Session, seeded_data: dict):
    await login_as(client, "student")

    # Incorrect current password fails
    fail_res = await client.post(
        "/api/v1/student/security/password",
        json={"current_password": "WrongPassword123!", "new_password": "NewSecretPassword2026!"},
    )
    assert fail_res.status_code == 400

    # Correct current password succeeds
    success_res = await client.post(
        "/api/v1/student/security/password",
        json={"current_password": "ValidPassword!2026", "new_password": "NewSecretPassword2026!"},
    )
    assert success_res.status_code == 200
    assert "success" in success_res.text.lower() or "updated" in success_res.text.lower()
