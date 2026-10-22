"""Backend-owned login, logout, and current-user endpoints."""

import hashlib
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.core.errors import AuthenticationException, AuthorizationException, RateLimitException
from app.core.security import login_rate_limiter
from app.db.session import get_db
from app.schemas.auth import LoginRequest, LoginResponse, LogoutResponse, CurrentUser
from app.services.auth import AuthService
from app.services.users import build_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])


def _verify_browser_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin and origin not in settings.BACKEND_CORS_ORIGINS:
        raise AuthorizationException("Request origin is not allowed")


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, request: Request, response: Response, db: Annotated[Session, Depends(get_db)]) -> LoginResponse:
    _verify_browser_origin(request)
    client_ip = request.client.host if request.client else "unknown"
    identity_digest = hashlib.sha256(payload.email.encode()).hexdigest()[:16]
    throttle_key = f"{client_ip}:{identity_digest}"
    if login_rate_limiter.is_limited(throttle_key):
        raise RateLimitException()

    user = AuthService.authenticate(db, payload.email, payload.password)
    if user is None:
        login_rate_limiter.record_failure(throttle_key)
        raise AuthenticationException("Invalid email or password")

    login_rate_limiter.reset(throttle_key)
    token, _ = AuthService.create_session(db, user)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.SESSION_TTL_MINUTES * 60,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path=settings.API_V1_STR,
    )
    return LoginResponse(user=build_current_user(db, user))


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    request: Request,
    response: Response,
    auth: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> LogoutResponse:
    _verify_browser_origin(request)
    AuthService.revoke_session(db, auth.session)
    response.delete_cookie(settings.SESSION_COOKIE_NAME, path=settings.API_V1_STR)
    return LogoutResponse()


@router.get("/me", response_model=CurrentUser)
async def me(
    auth: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> CurrentUser:
    return build_current_user(db, auth.user)
