"""Institution model representing universities as isolated tenants."""

import uuid
from datetime import datetime
from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, JSON, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class Institution(Base, TimestampMixin):
    __tablename__ = "institutions"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'inactive')", name="ck_institutions_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    # Phase 1 compatibility fields are retained to make the migration non-destructive.
    # They are not part of the Phase 2 public contract and may be removed in a separately
    # reviewed data migration after deployments have moved to slug/institution_code.
    code: Mapped[str | None] = mapped_column(
        String(50), unique=True, nullable=True, index=True,
        comment="Unique identifier slug (e.g., luanar)",
    )
    slug: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Official full university name",
    )
    institution_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)
    short_name: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="Abbreviated university name")
    campus: Mapped[str] = mapped_column(String(100), default="Main Campus", nullable=False, comment="Campus name")
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="Administrative contact email")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    brand_primary_color: Mapped[str] = mapped_column(String(7), default="#0B192C", nullable=False)
    brand_accent_color: Mapped[str] = mapped_column(String(7), default="#1E88E5", nullable=False)

    # Student Onboarding & Verification Configuration
    verification_mode: Mapped[str] = mapped_column(
        String(30),
        default="api_verification",
        nullable=False,
        comment="Official pathway: 'api_verification' or 'file_and_review'",
    )
    allowed_email_domains: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
        comment="List of institutional email domains allowed for student self-registration",
    )
    roster_freshness_days: Mapped[int] = mapped_column(
        Integer,
        default=30,
        nullable=False,
        comment="Threshold in days after which an imported roster is considered stale",
    )
    roster_last_imported_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp of the most recent committed authoritative roster import",
    )
    roster_active_version: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        comment="Version tag of the currently active roster snapshot",
    )

    def __repr__(self) -> str:
        return f"<Institution slug='{self.slug}' code='{self.institution_code}'>"
