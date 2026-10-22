"""Central authentication and institution authorization dependencies."""

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Annotated, Callable

from fastapi import Cookie, Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AuthenticationException, AuthorizationException, TenantContextMissingException
from app.core.security import hash_session_token
from app.db.session import get_db
from app.models.auth import AuthSession
from app.models.identity import Membership, User
from app.models.institution import Institution


@dataclass(frozen=True)
class AuthenticatedUser:
    user: User
    session: AuthSession


@dataclass(frozen=True)
class TenantAccess:
    user: User
    membership: Membership
    institution: Institution


async def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    session_token: Annotated[str | None, Cookie(alias=settings.SESSION_COOKIE_NAME)] = None,
) -> AuthenticatedUser:
    if not session_token:
        raise AuthenticationException()

    statement = (
        select(AuthSession, User)
        .join(User, User.id == AuthSession.user_id)
        .where(
            AuthSession.token_hash == hash_session_token(session_token),
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > datetime.now(timezone.utc),
            User.status == "active",
        )
    )
    row = db.execute(statement).one_or_none()
    if row is None:
        raise AuthenticationException("Session is invalid or has expired")
    auth_session, user = row
    return AuthenticatedUser(user=user, session=auth_session)


async def get_optional_current_user(
    db: Annotated[Session, Depends(get_db)],
    session_token: Annotated[str | None, Cookie(alias=settings.SESSION_COOKIE_NAME)] = None,
) -> AuthenticatedUser | None:
    if not session_token:
        return None
    statement = (
        select(AuthSession, User)
        .join(User, User.id == AuthSession.user_id)
        .where(
            AuthSession.token_hash == hash_session_token(session_token),
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > datetime.now(timezone.utc),
            User.status == "active",
        )
    )
    row = db.execute(statement).one_or_none()
    if row is None:
        return None
    auth_session, user = row
    return AuthenticatedUser(user=user, session=auth_session)


def require_tenant_access(*allowed_roles: str) -> Callable[..., TenantAccess]:
    async def dependency(
        institution_id: uuid.UUID,
        auth: Annotated[AuthenticatedUser, Depends(get_current_user)],
        db: Annotated[Session, Depends(get_db)],
        selected_institution: Annotated[uuid.UUID | None, Header(alias="X-Institution-Context")] = None,
    ) -> TenantAccess:
        if selected_institution is None:
            raise TenantContextMissingException("X-Institution-Context is required")
        if selected_institution != institution_id:
            raise AuthorizationException("Selected institution context does not match the requested resource")

        statement = (
            select(Membership, Institution)
            .join(Institution, Institution.id == Membership.institution_id)
            .where(
                Membership.user_id == auth.user.id,
                Membership.institution_id == institution_id,
                Membership.status == "active",
                Institution.status == "active",
            )
        )
        row = db.execute(statement).one_or_none()
        if row is None:
            raise AuthorizationException()
        membership, institution = row
        if allowed_roles and membership.role not in allowed_roles:
            raise AuthorizationException()
        return TenantAccess(user=auth.user, membership=membership, institution=institution)

    return dependency
