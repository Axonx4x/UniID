"""Coverage for the opt-in, roster-backed LUANAR presenter path."""

import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.identity import Student, User
from app.models.institution import Institution
from app.models.onboarding import ImportedStudentRecord
from app.services.luanar_demo import DEMO_EMAIL_DOMAIN, roster_csv, roster_rows
from app.services.otp import DEV_SIMULATED_MAILBOX
from scripts.seed_demo_tenant import seed_demo_data


def test_luanar_fixture_is_deterministic_and_has_validation_scenario():
    rows = roster_rows()
    assert len(rows) == 200
    assert rows[0].student_number == "LUA-DEMO-2026-0001"
    assert rows[0].full_name == "Tione Kamanga"
    assert rows[0].institutional_email == f"student0001@{DEMO_EMAIL_DOMAIN}"
    assert roster_csv().count("LUA-DEMO-2026-") == 200
    assert roster_csv(include_validation_cases=True).count("LUA-DEMO-2026-") == 201


@pytest.mark.anyio
async def test_luanar_demo_onboarding_uses_current_roster_and_waits_for_photo(
    client: httpx.AsyncClient, db_session: Session, monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(settings, "UNIID_DEMO_MODE", True)
    seed_demo_data(db_session)
    luanar = db_session.scalar(select(Institution).where(Institution.slug == "luanar"))
    assert luanar is not None
    assert db_session.scalar(
        select(func.count()).select_from(ImportedStudentRecord).where(ImportedStudentRecord.institution_id == luanar.id)
    ) == 200

    email = f"student0001@{DEMO_EMAIL_DOMAIN}"
    registration = await client.post("/api/v1/onboarding/register", json={
        "institution_slug": "luanar",
        "institutional_email": email,
        "full_name": "Tione Kamanga",
        "password": "ValidPassword!2026",
        "student_number": "LUA-DEMO-2026-0001",
    })
    assert registration.status_code == 201
    code = DEV_SIMULATED_MAILBOX[email]["code"]
    verified = await client.post("/api/v1/onboarding/verify-code", json={
        "reference": registration.json()["reference"], "code": code,
    })
    assert verified.status_code == 200
    assert verified.json()["status"] == "verified"

    user = db_session.scalar(select(User).where(User.email == email))
    student = db_session.scalar(select(Student).where(Student.user_id == user.id, Student.institution_id == luanar.id))
    assert student is not None and student.photo_url is None


@pytest.mark.anyio
async def test_luanar_roster_download_is_staff_scoped_and_server_mode_controlled(
    client: httpx.AsyncClient, db_session: Session, monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(settings, "UNIID_DEMO_MODE", True)
    seed_demo_data(db_session)
    luanar = db_session.scalar(select(Institution).where(Institution.slug == "luanar"))
    login = await client.post("/api/v1/auth/login", json={
        "email": "luanar.registry@demo.invalid", "password": "LuanarRegistry!2026",
    })
    assert login.status_code == 200
    download = await client.get(
        "/api/v1/staff/demo/luanar-roster.csv",
        headers={"X-Institution-Context": str(luanar.id)},
    )
    assert download.status_code == 200
    assert download.headers["content-type"].startswith("text/csv")
    assert download.text.count("LUA-DEMO-2026-") == 200


@pytest.mark.anyio
async def test_reviewer_can_search_imported_luanar_evidence_before_student_registration(
    client: httpx.AsyncClient, db_session: Session, monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(settings, "UNIID_DEMO_MODE", True)
    seed_demo_data(db_session)
    luanar = db_session.scalar(select(Institution).where(Institution.slug == "luanar"))
    login = await client.post("/api/v1/auth/login", json={
        "email": "luanar.registry@demo.invalid", "password": "LuanarRegistry!2026",
    })
    assert login.status_code == 200
    headers = {"X-Institution-Context": str(luanar.id)}
    records = await client.get("/api/v1/staff/records?search=LUA-DEMO-2026-0002", headers=headers)
    assert records.status_code == 200
    item = records.json()["items"][0]
    assert item["student_number"] == "LUA-DEMO-2026-0002"
    assert item["source"] == "imported_roster"
    detail = await client.get(f"/api/v1/staff/records/{item['id']}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["student"]["source"] == "imported_roster"
    notifications = await client.get("/api/v1/staff/notifications", headers=headers)
    assert notifications.status_code == 200
    assert any(note["category"] == "system" for note in notifications.json()["items"])
