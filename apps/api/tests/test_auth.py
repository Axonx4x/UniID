from datetime import datetime, timedelta, timezone

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import AuthSession
from conftest import login_as


@pytest.mark.anyio
async def test_login_me_and_logout_invalidates_session(client: httpx.AsyncClient, db_session: Session):
    login = await login_as(client, "student")
    assert login.status_code == 200
    assert login.json()["user"]["email"] == "student@demo.invalid"
    assert settings.SESSION_COOKIE_NAME in login.cookies

    current = await client.get("/api/v1/auth/me")
    assert current.status_code == 200
    assert current.json()["memberships"][0]["role"] == "student"

    logout = await client.post("/api/v1/auth/logout")
    assert logout.status_code == 200
    stored = db_session.scalar(select(AuthSession))
    assert stored is not None and stored.revoked_at is not None
    assert (await client.get("/api/v1/auth/me")).status_code == 401


@pytest.mark.anyio
async def test_invalid_and_inactive_login_use_same_error(client: httpx.AsyncClient):
    invalid = await client.post("/api/v1/auth/login", json={"email": "missing@demo.invalid", "password": "WrongPassword!2026"})
    inactive = await client.post("/api/v1/auth/login", json={"email": "inactive@demo.invalid", "password": "WrongPassword!2026"})
    assert invalid.status_code == inactive.status_code == 401
    assert invalid.json()["error"]["message"] == inactive.json()["error"]["message"] == "Invalid email or password"


@pytest.mark.anyio
async def test_missing_invalid_and_expired_sessions_are_rejected(client: httpx.AsyncClient, db_session: Session):
    assert (await client.get("/api/v1/auth/me")).status_code == 401
    client.cookies.set(settings.SESSION_COOKIE_NAME, "invalid-token", path=settings.API_V1_STR)
    assert (await client.get("/api/v1/auth/me")).status_code == 401
    client.cookies.clear()

    assert (await login_as(client, "student")).status_code == 200
    auth_session = db_session.scalar(select(AuthSession))
    assert auth_session is not None
    auth_session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()
    assert (await client.get("/api/v1/auth/me")).status_code == 401


@pytest.mark.anyio
async def test_disallowed_browser_origin_is_rejected(client: httpx.AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@demo.invalid", "password": "ValidPassword!2026"},
        headers={"Origin": "https://attacker.invalid"},
    )
    assert response.status_code == 403
