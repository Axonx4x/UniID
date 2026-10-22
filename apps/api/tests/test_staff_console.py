"""Comprehensive test suite for the Institutional Reviewer Console and Import Pipeline.
Tests authentication, institution isolation, student registry CRUD, CSV parsing,
column mapping, transformations, duplicate detection, reconciliation, and transactional commit.
"""

import io
import pytest
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.identity import Campus, Membership, Programme, Student, User
from app.models.institution import Institution
from app.models.onboarding import ImportedStudentRecord, ImportMappingTemplate, RosterImport
from app.models.operations import AuditEvent
from tests.conftest import login_as


@pytest.mark.anyio
async def test_staff_overview_and_permissions(
    client: httpx.AsyncClient,
    seeded_data: dict[str, object],
):
    institution_a = seeded_data["institution_a"]

    # 1. Login as registry_admin (Reviewer)
    login_resp = await login_as(client, "registry")
    assert login_resp.status_code == 200

    headers = {"X-Institution-Context": str(institution_a.id)}
    resp = await client.get("/api/v1/staff/overview", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["institution_id"] == str(institution_a.id)
    assert "pending_reviews_count" in data
    assert "total_active_students" in data
    assert "roster_freshness_status" in data


@pytest.mark.anyio
async def test_cross_institution_isolation(
    client: httpx.AsyncClient,
    seeded_data: dict[str, object],
):
    """Reviewer for Institution A must NOT be able to access Institution B."""
    institution_b = seeded_data["institution_b"]

    await login_as(client, "registry")
    headers = {"X-Institution-Context": str(institution_b.id)}

    resp = await client.get("/api/v1/staff/overview", headers=headers)
    assert resp.status_code == 403, "Reviewer must be forbidden from accessing other institutions"


@pytest.mark.anyio
async def test_student_registry_crud(
    client: httpx.AsyncClient,
    seeded_data: dict[str, object],
    db_session: Session,
):
    institution_a = seeded_data["institution_a"]
    campus_a = seeded_data["campus_a"]
    programme_a = seeded_data["programme_a"]

    await login_as(client, "registry")
    headers = {"X-Institution-Context": str(institution_a.id)}

    # 1. Create student record
    create_payload = {
        "student_number": "REG/00912",
        "full_name": "Blessings Phiri",
        "institutional_email": "blessings@student.test.ac.mw",
        "campus_id": str(campus_a.id),
        "programme_id": str(programme_a.id),
        "academic_year": "2026",
        "study_year": 2,
        "enrollment_status": "active",
    }
    resp = await client.post("/api/v1/staff/records", json=create_payload, headers=headers)
    assert resp.status_code == 201, resp.text
    created = resp.json()
    assert created["student_number"] == "REG/00912"
    record_id = created["id"]

    # 2. Duplicate student number within institution must fail
    dup_resp = await client.post("/api/v1/staff/records", json=create_payload, headers=headers)
    assert dup_resp.status_code in (400, 422), "Duplicate student number must be rejected"

    # 3. Read student record
    get_resp = await client.get(f"/api/v1/staff/records/{record_id}", headers=headers)
    assert get_resp.status_code == 200
    detail = get_resp.json()
    assert detail["student"]["student_number"] == "REG/00912"
    assert len(detail["audit_history"]) >= 1

    # 4. Search student records
    list_resp = await client.get("/api/v1/staff/records?search=Blessings", headers=headers)
    assert list_resp.status_code == 200
    search_data = list_resp.json()
    assert search_data["total"] >= 1
    assert any(s["student_number"] == "REG/00912" for s in search_data["items"])

    # 5. Update permitted fields
    update_payload = {"full_name": "Blessings C. Phiri", "study_year": 3}
    patch_resp = await client.patch(f"/api/v1/staff/records/{record_id}", json=update_payload, headers=headers)
    assert patch_resp.status_code == 200

    # 6. Archive student
    arch_resp = await client.post(f"/api/v1/staff/records/{record_id}/archive", headers=headers)
    assert arch_resp.status_code == 200

    # Verify archived status in list filter
    active_resp = await client.get("/api/v1/staff/records?status=active", headers=headers)
    assert all(s["id"] != record_id for s in active_resp.json()["items"])

    archived_resp = await client.get("/api/v1/staff/records?status=archived", headers=headers)
    assert any(s["id"] == record_id for s in archived_resp.json()["items"])

    # 7. Restore student
    rest_resp = await client.post(f"/api/v1/staff/records/{record_id}/restore", headers=headers)
    assert rest_resp.status_code == 200


@pytest.mark.anyio
async def test_csv_import_pipeline_and_mapping(
    client: httpx.AsyncClient,
    seeded_data: dict[str, object],
):
    institution_a = seeded_data["institution_a"]

    await login_as(client, "registry")
    headers = {"X-Institution-Context": str(institution_a.id)}

    csv_data = (
        "Registration Number,Candidate Name,University Mail,Status,Course Code\n"
        "00123,Kondwani Moyo,kmoyo@unima.ac.mw,Continuing,BSC-CS\n"
        "00124,Tadala Banda,tbanda@unima.ac.mw,On Leave,BSC-CS\n"
    )

    # 1. Upload CSV
    files = {"file": ("students_roster.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    upload_resp = await client.post("/api/v1/staff/imports", files=files, headers=headers)
    assert upload_resp.status_code == 201, upload_resp.text
    upload_data = upload_resp.json()
    import_id = upload_data["import_id"]
    assert upload_data["total_rows"] == 2
    assert "suggested_mappings" in upload_data

    # 2. Check header alias auto-suggestion
    suggestions = upload_data["suggested_mappings"]
    assert suggestions.get("Registration Number") == "student_number"
    assert suggestions.get("Candidate Name") == "full_name"
    assert suggestions.get("University Mail") == "institutional_email"
    assert suggestions.get("Status") == "enrollment_status"

    # 3. Apply column mapping
    mapping_payload = {
        "mappings": {
            "Registration Number": "student_number",
            "Candidate Name": "full_name",
            "University Mail": "institutional_email",
            "Status": "enrollment_status",
            "Course Code": "programme_code",
        },
        "save_as_template": True,
        "template_name": "Standard UNIMA Roster",
    }
    map_resp = await client.put(f"/api/v1/staff/imports/{import_id}/mapping", json=mapping_payload, headers=headers)
    assert map_resp.status_code == 200, map_resp.text
    preview_data = map_resp.json()
    assert preview_data["summary"]["creates_count"] == 2
    assert preview_data["summary"]["invalid_count"] == 0

    # Verify student numbers preserve leading zeros
    row1 = preview_data["rows"][0]
    assert row1["student_number"] == "00123", "Leading zero must be preserved"
    assert row1["classification"] == "create"

    # 4. Commit import transactionally
    commit_payload = {"is_authoritative_snapshot": False, "allow_partial_commit": False}
    commit_resp = await client.post(f"/api/v1/staff/imports/{import_id}/commit", json=commit_payload, headers=headers)
    assert commit_resp.status_code == 200, commit_resp.text
    commit_result = commit_resp.json()
    assert commit_result["new_records_count"] == 2
    assert commit_result["status"] == "committed"

    # 5. Verify records appear in live student registry
    rec_resp = await client.get("/api/v1/staff/records?search=00123", headers=headers)
    assert rec_resp.status_code == 200
    assert any(s["student_number"] == "00123" for s in rec_resp.json()["items"])

    # 6. Verify template was saved and can be retrieved
    tmpl_resp = await client.get("/api/v1/staff/mapping-templates", headers=headers)
    assert tmpl_resp.status_code == 200
    templates = tmpl_resp.json()
    assert any(t["name"] == "Standard UNIMA Roster" for t in templates)


@pytest.mark.anyio
async def test_import_validation_and_duplicate_detection(
    client: httpx.AsyncClient,
    seeded_data: dict[str, object],
):
    """Validates that missing required mappings, duplicate source mappings,
    invalid emails, unknown statuses, and internal duplicates are flagged."""
    institution_a = seeded_data["institution_a"]

    await login_as(client, "registry")
    headers = {"X-Institution-Context": str(institution_a.id)}

    # File with an invalid email and a duplicate student number
    bad_csv = (
        "Reg No,Full Name,Email,Status\n"
        "DUP001,Student One,s1@unima.ac.mw,Active\n"
        "DUP001,Student One Duplicate,s2@unima.ac.mw,Active\n"
        "BAD002,Student Two,not-an-email,MysteriousStatus\n"
    )

    files = {"file": ("bad_roster.csv", io.BytesIO(bad_csv.encode("utf-8")), "text/csv")}
    upload_resp = await client.post("/api/v1/staff/imports", files=files, headers=headers)
    import_id = upload_resp.json()["import_id"]

    # 1. Missing required field mapping should fail
    bad_map = {
        "mappings": {
            "Reg No": "student_number",
            "Full Name": "full_name",
            # Missing institutional_email and enrollment_status
        }
    }
    err_resp = await client.put(f"/api/v1/staff/imports/{import_id}/mapping", json=bad_map, headers=headers)
    assert err_resp.status_code in (400, 422), "Missing required mapping must error"

    # 2. Duplicate destination mapping should fail
    dup_dest_map = {
        "mappings": {
            "Reg No": "student_number",
            "Full Name": "student_number",  # Duplicate destination
            "Email": "institutional_email",
            "Status": "enrollment_status",
        }
    }
    dup_err_resp = await client.put(f"/api/v1/staff/imports/{import_id}/mapping", json=dup_dest_map, headers=headers)
    assert dup_err_resp.status_code in (400, 422)

    # 3. Valid mapping configuration on bad data should yield row errors in preview
    valid_map = {
        "mappings": {
            "Reg No": "student_number",
            "Full Name": "full_name",
            "Email": "institutional_email",
            "Status": "enrollment_status",
        }
    }
    map_resp = await client.put(f"/api/v1/staff/imports/{import_id}/mapping", json=valid_map, headers=headers)
    assert map_resp.status_code == 200
    preview = map_resp.json()

    assert preview["is_ready_to_commit"] is False
    assert preview["summary"]["conflicts_count"] >= 1  # Duplicate within upload
    assert preview["summary"]["invalid_count"] >= 1    # Invalid email & unknown status

    # 4. Attempting to commit without resolving errors must fail
    commit_resp = await client.post(
        f"/api/v1/staff/imports/{import_id}/commit",
        json={"is_authoritative_snapshot": False, "allow_partial_commit": False},
        headers=headers,
    )
    assert commit_resp.status_code in (400, 422)


@pytest.mark.anyio
async def test_audit_log_capture(
    client: httpx.AsyncClient,
    seeded_data: dict[str, object],
):
    institution_a = seeded_data["institution_a"]

    await login_as(client, "registry")
    headers = {"X-Institution-Context": str(institution_a.id)}

    audit_resp = await client.get("/api/v1/staff/audit", headers=headers)
    assert audit_resp.status_code == 200
    data = audit_resp.json()
    assert "items" in data
    assert "total" in data
    if data["items"]:
        item = data["items"][0]
        assert "action" in item
        assert "resource_type" in item
        assert "created_at" in item
