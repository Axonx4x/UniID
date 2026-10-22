import uuid

import httpx
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Campus, DigitalCredential, Institution, Membership, ProgrammeEnrollment, Student


def expect_integrity_error(db: Session, instance: object) -> None:
    db.add(instance)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_student_numbers_repeat_between_tenants_but_not_within_one(db_session: Session, seeded_data: dict[str, object]):
    assert db_session.query(Student).filter(Student.student_number == "SAME-001").count() == 2
    institution = seeded_data["institution_a"]
    campus = seeded_data["campus_a"]
    assert isinstance(institution, Institution) and isinstance(campus, Campus)
    expect_integrity_error(db_session, Student(institution_id=institution.id, campus_id=campus.id, student_number="SAME-001"))


def test_campus_and_enrollment_institution_consistency(db_session: Session, seeded_data: dict[str, object]):
    institution_a = seeded_data["institution_a"]
    campus_b = seeded_data["campus_b"]
    assert isinstance(institution_a, Institution) and isinstance(campus_b, Campus)
    expect_integrity_error(db_session, Student(institution_id=institution_a.id, campus_id=campus_b.id, student_number="BAD-CAMPUS"))

    expect_integrity_error(
        db_session,
        ProgrammeEnrollment(
            institution_id=institution_a.id,
            student_id=seeded_data["student"].id,
            programme_id=seeded_data["programme_b"].id,
            academic_year="2026", status="active",
        ),
    )


def test_credential_and_membership_institution_consistency(db_session: Session, seeded_data: dict[str, object]):
    institution_b = seeded_data["institution_b"]
    assert isinstance(institution_b, Institution)
    expect_integrity_error(db_session, DigitalCredential(institution_id=institution_b.id, student_id=seeded_data["student"].id, status="pending"))
    expect_integrity_error(
        db_session,
        Membership(user_id=seeded_data["users"]["student"].id, institution_id=seeded_data["institution_a"].id, role="student", status="active"),
    )


@pytest.mark.anyio
async def test_append_only_history_has_no_mutation_endpoints(client: httpx.AsyncClient):
    random_id = uuid.uuid4()
    for method, path in (
        ("delete", f"/api/v1/credential-events/{random_id}"),
        ("patch", f"/api/v1/credential-events/{random_id}"),
        ("delete", f"/api/v1/audit-events/{random_id}"),
        ("patch", f"/api/v1/audit-events/{random_id}"),
    ):
        response = await client.request(method, path, json={})
        assert response.status_code == 404
