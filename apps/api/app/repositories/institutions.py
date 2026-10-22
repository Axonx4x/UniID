"""Tenant-safe institution repository queries."""

import uuid
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.identity import Campus, Membership, Programme, Student
from app.models.institution import Institution


def list_user_institutions(db: Session, user_id: uuid.UUID) -> list[tuple[Institution, Membership]]:
    statement = (
        select(Institution, Membership)
        .join(Membership, Membership.institution_id == Institution.id)
        .where(Membership.user_id == user_id, Membership.status == "active", Institution.status == "active")
        .order_by(Institution.name)
    )
    return list(db.execute(statement).all())


def list_memberships(db: Session, institution_id: uuid.UUID) -> list[Membership]:
    return list(db.scalars(select(Membership).where(Membership.institution_id == institution_id).order_by(Membership.created_at)))


def list_campuses(db: Session, institution_id: uuid.UUID) -> list[Campus]:
    return list(db.scalars(select(Campus).where(Campus.institution_id == institution_id).order_by(Campus.name)))


def list_programmes(db: Session, institution_id: uuid.UUID) -> list[Programme]:
    return list(db.scalars(select(Programme).where(Programme.institution_id == institution_id).order_by(Programme.name)))


def list_students(db: Session, institution_id: uuid.UUID, page: int, page_size: int, search: str | None = None) -> tuple[list[Student], int]:
    filters = [Student.institution_id == institution_id]
    if search:
        filters.append(Student.student_number.ilike(f"%{search.strip()}%"))
    total = db.scalar(select(func.count()).select_from(Student).where(*filters)) or 0
    statement = (
        select(Student)
        .where(*filters)
        .order_by(Student.student_number)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(db.scalars(statement)), total


def get_linked_student(db: Session, institution_id: uuid.UUID, user_id: uuid.UUID) -> Student | None:
    return db.scalar(select(Student).where(Student.institution_id == institution_id, Student.user_id == user_id))
