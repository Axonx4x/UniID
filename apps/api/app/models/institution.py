"""Institution model representing universities as isolated tenants."""

import uuid
from sqlalchemy import String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class Institution(Base, TimestampMixin):
    __tablename__ = "institutions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        comment="Unique identifier slug (e.g., luanar, kuhes, must, mzuni)",
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Official full university name",
    )
    short_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Abbreviated university name (e.g. LUANAR)",
    )
    campus: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Main Campus",
        comment="Specific campus (e.g., City Campus)",
    )
    contact_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Institutional registrar or administrative contact email",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Whether the institution tenant is active",
    )
    brand_primary_color: Mapped[str] = mapped_column(
        String(7),
        default="#0B192C",
        nullable=False,
        comment="Primary brand HEX color for card rendering and portals",
    )
    brand_accent_color: Mapped[str] = mapped_column(
        String(7),
        default="#1E88E5",
        nullable=False,
        comment="Accent brand HEX color for verification badges",
    )

    def __repr__(self) -> str:
        return f"<Institution code='{self.code}' name='{self.short_name}'>"
