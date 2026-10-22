"""Current-user projection shared by login and session endpoints."""

from sqlalchemy.orm import Session

from app.models.identity import User
from app.repositories.institutions import list_user_institutions
from app.schemas.auth import CurrentMembership, CurrentUser
from app.schemas.institution import InstitutionRead


def build_current_user(db: Session, user: User) -> CurrentUser:
    memberships = [
        CurrentMembership(
            id=membership.id,
            role=membership.role,
            status=membership.status,
            institution=InstitutionRead.model_validate(institution),
        )
        for institution, membership in list_user_institutions(db, user.id)
    ]
    return CurrentUser(id=user.id, email=user.email, full_name=user.full_name, memberships=memberships)
