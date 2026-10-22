"""Models for student onboarding, email OTP challenges, and CSV roster management."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class EmailOtpChallenge(Base):
    __tablename__ = "email_otp_challenges"
    __table_args__ = (
        Index("ix_email_otp_institution_email", "institution_id", "email", "purpose", "is_used"),
        Index("ix_email_otp_expires", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    purpose: Mapped[str] = mapped_column(String(50), default="student_onboarding", nullable=False)
    attempts_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    resend_available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class StudentOnboardingRequest(Base, TimestampMixin):
    __tablename__ = "student_onboarding_requests"
    __table_args__ = (
        UniqueConstraint("reference", name="uq_onboarding_requests_reference"),
        CheckConstraint(
            "status IN ('contact_verification_required', 'contact_verified', 'verification_pending', "
            "'verification_review_required', 'verified', 'rejected', 'verification_expired')",
            name="ck_onboarding_requests_status",
        ),
        CheckConstraint(
            "verification_mode IN ('api_verification', 'file_and_review')",
            name="ck_onboarding_requests_mode",
        ),
        Index("ix_onboarding_requests_institution_status", "institution_id", "status"),
        Index("ix_onboarding_requests_user_institution", "user_id", "institution_id"),
        Index("ix_onboarding_requests_email", "institution_id", "institutional_email"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    institutional_email: Mapped[str] = mapped_column(String(320), nullable=False)
    student_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    verification_mode: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="contact_verification_required", nullable=False)
    
    # Pathway-specific resolution tracking
    roster_match_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    roster_import_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("roster_imports.id", ondelete="SET NULL"), nullable=True
    )
    api_check_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    discrepancy_details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Authorized Staff Review details
    reviewer_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_decision: Mapped[str | None] = mapped_column(String(30), nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    follow_up_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RosterImport(Base):
    __tablename__ = "roster_imports"
    __table_args__ = (
        Index("ix_roster_imports_institution_created", "institution_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False
    )
    version_tag: Mapped[str] = mapped_column(String(64), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    new_records_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_records_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rejected_rows_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="committed", nullable=False)
    validation_errors: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    is_authoritative_snapshot: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    file_checksum: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mapping_config: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    transformation_config: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    staged_data: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    raw_csv_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    reconciliation_summary: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    uploaded_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    committed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ImportMappingTemplate(Base, TimestampMixin):
    __tablename__ = "import_mapping_templates"
    __table_args__ = (
        UniqueConstraint("institution_id", "name", "version", name="uq_import_templates_inst_name_version"),
        Index("ix_import_templates_institution_active", "institution_id", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_headers: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    mappings: Mapped[dict[str, str]] = mapped_column(JSON, default=dict, nullable=False)
    transformations: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    status_dictionary: Mapped[dict[str, str]] = mapped_column(JSON, default=dict, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )


class ImportedStudentRecord(Base):
    __tablename__ = "imported_student_records"
    __table_args__ = (
        Index("ix_imported_records_email", "institution_id", "institutional_email", "is_current"),
        Index("ix_imported_records_student_no", "institution_id", "student_number", "is_current"),
        Index("ix_imported_records_import", "institution_id", "roster_import_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False
    )
    roster_import_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("roster_imports.id", ondelete="CASCADE"), nullable=False
    )
    student_number: Mapped[str] = mapped_column(String(100), nullable=False)
    institutional_email: Mapped[str] = mapped_column(String(320), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    enrollment_status: Mapped[str] = mapped_column(String(30), default="Active", nullable=False)
    programme_code: Mapped[str] = mapped_column(String(50), nullable=False)
    campus_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False)
    record_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raw_data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
