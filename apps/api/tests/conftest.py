"""Isolated SQLite fixtures for API and domain tests."""

import uuid
import httpx
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 - register all mappings
from app.core.security import hash_password, login_rate_limiter, verification_rate_limiter
from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Campus, Institution, Membership, Programme, ProgrammeEnrollment, Student, User
from app.services.otp import DEV_SIMULATED_MAILBOX

engine = create_engine(
    "sqlite+pysqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def development_otp_mailbox(monkeypatch):
    """Keep test OTPs in an explicit test-only mailbox, never SMTP."""
    monkeypatch.setattr(settings, "OTP_DELIVERY_MODE", "development")
    monkeypatch.setattr(settings, "OTP_DEV_MAILBOX_ENABLED", True)
    DEV_SIMULATED_MAILBOX.clear()
    yield
    DEV_SIMULATED_MAILBOX.clear()


@pytest.fixture
def db_session() -> Session:
    Base.metadata.create_all(engine)
    session = Session(engine, expire_on_commit=False)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        login_rate_limiter._attempts.clear()
        verification_rate_limiter._attempts.clear()


@pytest.fixture
def seeded_data(db_session: Session) -> dict[str, object]:
    institution_a = Institution(
        id=uuid.uuid4(),
        name="Alpha Fictional Institute",
        slug="alpha-demo",
        institution_code="AFI-DEMO",
        status="active",
        verification_mode="api_verification",
        allowed_email_domains=["alpha.ac.mw", "student.alpha.invalid", "demo.invalid"],
    )
    institution_b = Institution(
        id=uuid.uuid4(),
        name="Beta Fictional College",
        slug="beta-demo",
        institution_code="BFC-DEMO",
        status="active",
        verification_mode="file_and_review",
        allowed_email_domains=["beta.ac.mw", "student.beta.invalid", "demo.invalid"],
    )
    db_session.add_all([institution_a, institution_b])
    db_session.flush()
    campus_a = Campus(id=uuid.uuid4(), institution_id=institution_a.id, name="Alpha Campus", code="MAIN", status="active")
    campus_b = Campus(id=uuid.uuid4(), institution_id=institution_b.id, name="Beta Campus", code="MAIN", status="active")
    programme_a = Programme(id=uuid.uuid4(), institution_id=institution_a.id, name="Alpha Programme", code="AP", status="active")
    programme_b = Programme(id=uuid.uuid4(), institution_id=institution_b.id, name="Beta Programme", code="BP", status="active")
    db_session.add_all([campus_a, campus_b, programme_a, programme_b])
    db_session.flush()

    password_hash = hash_password("ValidPassword!2026")
    users = {
        role: User(id=uuid.uuid4(), email=f"{role}@demo.invalid", password_hash=password_hash, full_name=f"{role.title()} Example", status="active")
        for role in ("student", "verifier", "registry", "platform", "inactive")
    }
    db_session.add_all(users.values())
    db_session.flush()
    roles = {"student": "student", "verifier": "verifier", "registry": "registry_admin", "platform": "platform_admin"}
    memberships = {}
    for key, role in roles.items():
        membership = Membership(id=uuid.uuid4(), user_id=users[key].id, institution_id=institution_a.id, role=role, status="active")
        db_session.add(membership)
        memberships[key] = membership
    inactive_membership = Membership(id=uuid.uuid4(), user_id=users["inactive"].id, institution_id=institution_a.id, role="registry_admin", status="inactive")
    db_session.add(inactive_membership)
    student = Student(
        id=uuid.uuid4(),
        institution_id=institution_a.id,
        campus_id=campus_a.id,
        student_number="SAME-001",
        user_id=users["student"].id,
        photo_url="/assets/images/student_id_photo.jpg",
        phone_number="+265 991 234 567",
    )
    other_student = Student(id=uuid.uuid4(), institution_id=institution_b.id, campus_id=campus_b.id, student_number="SAME-001", user_id=None)
    db_session.add_all([student, other_student])
    db_session.flush()
    db_session.add_all([
        ProgrammeEnrollment(
            id=uuid.uuid4(), institution_id=institution_a.id, student_id=student.id,
            programme_id=programme_a.id, academic_year="2026", study_year=1, status="active",
        ),
        ProgrammeEnrollment(
            id=uuid.uuid4(), institution_id=institution_b.id, student_id=other_student.id,
            programme_id=programme_b.id, academic_year="2026", study_year=1, status="active",
        ),
    ])
    db_session.commit()
    return {
        "institution_a": institution_a, "institution_b": institution_b,
        "campus_a": campus_a, "campus_b": campus_b,
        "programme_a": programme_a, "programme_b": programme_b,
        "users": users, "memberships": memberships,
        "student": student, "other_student": other_student,
    }


@pytest.fixture
async def client(db_session: Session, seeded_data: dict[str, object]):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as test_client:
        yield test_client
    app.dependency_overrides.clear()


async def login_as(client: httpx.AsyncClient, role: str) -> httpx.Response:
    return await client.post("/api/v1/auth/login", json={"email": f"{role}@demo.invalid", "password": "ValidPassword!2026"})
