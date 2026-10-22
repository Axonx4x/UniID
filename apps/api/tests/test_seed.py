from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Institution, Membership, Student, User
from scripts.seed_demo_tenant import seed_demo_data


def test_seed_is_idempotent(db_session: Session):
    seed_demo_data(db_session)
    first = {
        "institutions": db_session.scalar(select(func.count()).select_from(Institution)),
        "users": db_session.scalar(select(func.count()).select_from(User)),
        "memberships": db_session.scalar(select(func.count()).select_from(Membership)),
        "students": db_session.scalar(select(func.count()).select_from(Student)),
    }
    seed_demo_data(db_session)
    second = {
        "institutions": db_session.scalar(select(func.count()).select_from(Institution)),
        "users": db_session.scalar(select(func.count()).select_from(User)),
        "memberships": db_session.scalar(select(func.count()).select_from(Membership)),
        "students": db_session.scalar(select(func.count()).select_from(Student)),
    }
    assert first == second == {"institutions": 9, "users": 8, "memberships": 10, "students": 7}
    unilia = db_session.scalar(select(Institution).where(Institution.slug == "unilia"))
    assert unilia is not None
    assert unilia.verification_mode == "api_verification"
    assert "student.unilia.ac.mw" in unilia.allowed_email_domains
