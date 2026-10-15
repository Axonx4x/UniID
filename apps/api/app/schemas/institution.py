"""Institution schemas for tenant configuration."""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class InstitutionBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50, description="Short code identifier (e.g., luanar)")
    name: str = Field(..., min_length=3, max_length=255, description="Full institution name")
    short_name: str = Field(..., min_length=2, max_length=50, description="Abbreviation (e.g., LUANAR)")
    campus: str = Field(default="Main Campus", max_length=100, description="Associated campus")
    contact_email: str = Field(..., max_length=255, description="Official contact email")
    is_active: bool = Field(default=True, description="Whether institution tenant is active")
    brand_primary_color: str = Field(default="#0B192C", pattern=r"^#[0-9a-fA-F]{6}$")
    brand_accent_color: str = Field(default="#1E88E5", pattern=r"^#[0-9a-fA-F]{6}$")


class InstitutionCreate(InstitutionBase):
    pass


class InstitutionRead(InstitutionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
