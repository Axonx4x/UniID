"""Authentication service with Argon2 passwords and revocable opaque sessions."""

from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_session_token, new_session_token, verify_password
from app.models.auth import AuthSession
from app.models.identity import User


class AuthService:
    @staticmethod
    def authenticate(db: Session, email: str, password: str) -> User | None:
        user = db.scalar(select(User).where(User.email == email, User.status == "active"))
        if user is None or not verify_password(user.password_hash, password):
            return None
        return user

    @staticmethod
    def create_session(db: Session, user: User) -> tuple[str, AuthSession]:
        token = new_session_token()
        session = AuthSession(
            user_id=user.id,
            token_hash=hash_session_token(token),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.SESSION_TTL_MINUTES),
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return token, session

    @staticmethod
    def revoke_session(db: Session, session: AuthSession) -> None:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()
