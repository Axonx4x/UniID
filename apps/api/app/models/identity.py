"""Tenant-scoped identity, academic structure, and enrollment models."""

import uuid
from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, ForeignKeyConstraint, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class Campus(Base, TimestampMixin):
    __tablename__ = "campuses"
    __table_args__ = (
        UniqueConstraint("institution_id", "code", name="uq_campuses_institution_code"),
        UniqueConstraint("id", "institution_id", name="uq_campuses_id_institution"),
        CheckConstraint("status IN ('active', 'inactive')", name="ck_campuses_status"),
        Index("ix_campuses_institution_status", "institution_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)


class Programme(Base, TimestampMixin):
    __tablename__ = "programmes"
    __table_args__ = (
        UniqueConstraint("institution_id", "code", name="uq_programmes_institution_code"),
        UniqueConstraint("id", "institution_id", name="uq_programmes_id_institution"),
        CheckConstraint("status IN ('active', 'inactive')", name="ck_programmes_status"),
        Index("ix_programmes_institution_status", "institution_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)


class User(Base, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'inactive')", name="ck_users_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)


class Membership(Base, TimestampMixin):
    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "institution_id", name="uq_memberships_user_institution"),
        CheckConstraint(
            "role IN ('student', 'verifier', 'registry_admin', 'platform_admin')",
            name="ck_memberships_role",
        ),
        CheckConstraint("status IN ('active', 'inactive')", name="ck_memberships_status"),
        Index("ix_memberships_institution_role_status", "institution_id", "role", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)


class Student(Base, TimestampMixin):
    __tablename__ = "students"
    __table_args__ = (
        UniqueConstraint("institution_id", "student_number", name="uq_students_institution_number"),
        UniqueConstraint("institution_id", "user_id", name="uq_students_institution_user"),
        UniqueConstraint("id", "institution_id", name="uq_students_id_institution"),
        ForeignKeyConstraint(
            ["campus_id", "institution_id"],
            ["campuses.id", "campuses.institution_id"],
            name="fk_students_campus_institution",
            ondelete="RESTRICT",
        ),
        CheckConstraint("status IN ('active', 'archived')", name="ck_students_status"),
        Index("ix_students_institution_number", "institution_id", "student_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False
    )
    campus_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    student_number: Mapped[str] = mapped_column(String(100), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(50), nullable=True)


class ProgrammeEnrollment(Base, TimestampMixin):
    __tablename__ = "programme_enrollments"
    __table_args__ = (
        ForeignKeyConstraint(
            ["student_id", "institution_id"],
            ["students.id", "students.institution_id"],
            name="fk_enrollments_student_institution",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["programme_id", "institution_id"],
            ["programmes.id", "programmes.institution_id"],
            name="fk_enrollments_programme_institution",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "status IN ('pending', 'active', 'completed', 'suspended', 'withdrawn')",
            name="ck_enrollments_status",
        ),
        CheckConstraint("study_year IS NULL OR study_year > 0", name="ck_enrollments_study_year"),
        CheckConstraint("end_date IS NULL OR start_date IS NULL OR end_date >= start_date", name="ck_enrollments_dates"),
        Index("ix_enrollments_institution_student_status", "institution_id", "student_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    programme_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False)
    study_year: Mapped[int | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
