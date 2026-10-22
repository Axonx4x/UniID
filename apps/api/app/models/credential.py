"""Credential foundation and append-only lifecycle event models."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Index, JSON, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class DigitalCredential(Base, TimestampMixin):
    __tablename__ = "digital_credentials"
    __table_args__ = (
        UniqueConstraint("id", "institution_id", name="uq_credentials_id_institution"),
        ForeignKeyConstraint(
            ["student_id", "institution_id"],
            ["students.id", "students.institution_id"],
            name="fk_credentials_student_institution",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "status IN ('pending', 'active', 'expired', 'revoked', 'suspended')",
            name="ck_credentials_status",
        ),
        CheckConstraint("expires_at IS NULL OR issued_at IS NULL OR expires_at >= issued_at", name="ck_credentials_dates"),
        CheckConstraint("status = 'revoked' OR revoked_at IS NULL", name="ck_credentials_revoked_at"),
        Index("ix_credentials_institution_student_status", "institution_id", "student_id", "status"),
        Index("ix_credentials_public_reference", "public_reference", unique=True),
        Index(
            "uq_active_credential_per_student",
            "institution_id",
            "student_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
            sqlite_where=text("status = 'active'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    public_reference: Mapped[str] = mapped_column(String(64), nullable=False)
    issued_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    policy_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revocation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class CredentialEvent(Base):
    __tablename__ = "credential_events"
    __table_args__ = (
        ForeignKeyConstraint(
            ["credential_id", "institution_id"],
            ["digital_credentials.id", "digital_credentials.institution_id"],
            name="fk_credential_events_credential_institution",
            ondelete="RESTRICT",
        ),
        Index("ix_credential_events_institution_credential_created", "institution_id", "credential_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False
    )
    credential_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class VerificationEvent(Base):
    __tablename__ = "verification_events"
    __table_args__ = (
        CheckConstraint(
            "outcome IN ('valid', 'suspended', 'revoked', 'expired', 'invalid')",
            name="ck_verification_events_outcome",
        ),
        Index("ix_verification_events_institution_created", "institution_id", "created_at"),
        Index("ix_verification_events_credential_created", "credential_id", "created_at"),
        Index("ix_verification_events_created", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True
    )
    credential_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("digital_credentials.id", ondelete="SET NULL"), nullable=True
    )
    outcome: Mapped[str] = mapped_column(String(20), nullable=False)
    verifier_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    request_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
