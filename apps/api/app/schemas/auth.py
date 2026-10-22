"""Authentication request and current-user response schemas."""

import uuid
from pydantic import BaseModel, Field, field_validator

from app.core.security import normalize_email
from app.schemas.institution import InstitutionRead


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=256)

    @field_validator("email")
    @classmethod
    def normalize_login_email(cls, value: str) -> str:
        normalized = normalize_email(value)
        if "@" not in normalized:
            raise ValueError("A valid email address is required")
        return normalized


class CurrentMembership(BaseModel):
    id: uuid.UUID
    role: str
    status: str
    institution: InstitutionRead


class CurrentUser(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    memberships: list[CurrentMembership]


class LoginResponse(BaseModel):
    user: CurrentUser


class LogoutResponse(BaseModel):
    success: bool = True
