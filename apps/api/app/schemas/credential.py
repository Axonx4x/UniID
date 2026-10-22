"""Credential lifecycle API schemas. Public responses omit internal audit metadata."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CredentialRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    institution_id: uuid.UUID
    public_reference: str
    status: str
    issued_at: datetime | None
    expires_at: datetime | None
    revoked_at: datetime | None
    revocation_reason: str | None
    policy_reference: str | None
    created_at: datetime
    updated_at: datetime


class CredentialEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    credential_id: uuid.UUID
    event_type: str
    actor_user_id: uuid.UUID | None
    reason: str | None
    created_at: datetime


class EligibilityRead(BaseModel):
    eligible: bool
    reason_code: str | None = None
    reason: str
    qualifying_enrollment_id: uuid.UUID | None = None
    policy_reference: str


class LifecycleReasonRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("reason")
    @classmethod
    def require_nonblank_reason(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("A reason of at least 3 non-space characters is required")
        return value


class CredentialPage(BaseModel):
    items: list[CredentialRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class CredentialEventPage(BaseModel):
    items: list[CredentialEventRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class StudentCredentialProfile(BaseModel):
    institution_name: str
    student_number: str
    display_name: str
    campus_name: str | None
    programme_name: str | None
    credential: CredentialRead | None
    verification_url: str | None = None
    qr_code_data_url: str | None = None


class StudentRegistryDetail(BaseModel):
    id: uuid.UUID
    student_number: str
    campus_name: str | None
    programme_name: str | None
    enrollment_status: str | None
    academic_year: str | None
    credential: CredentialRead | None
