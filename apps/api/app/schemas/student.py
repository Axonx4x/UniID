"""Pydantic schemas for the UniID Student Dashboard and Self-Service Portal."""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class StudentAccountSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    display_name: str
    status: str
    email_verified: bool


class StudentInstitutionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    institution_code: str
    logo_url: str | None = None


class StudentRecordSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID | None = None
    student_number: str | None = None
    campus_name: str | None = None
    campus_code: str | None = None
    programme_name: str | None = None
    programme_code: str | None = None
    academic_year: str | None = None
    study_year: int | None = None
    enrollment_status: str | None = None  # 'active', 'on_leave', etc.
    photo_url: str | None = None
    phone_number: str | None = None


class StudentVerificationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: str  # 'contact_verification_required', 'verification_pending', 'verification_review_required', 'verified', 'rejected'
    verification_mode: str  # 'api_verification', 'file_and_review'
    reference: str
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    review_decision: str | None = None
    follow_up_instructions: str | None = None
    discrepancy_count: int = 0
    has_active_membership: bool = False


class StudentCredentialSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID | None = None
    status: str | None = None  # 'active', 'pending', 'expired', 'suspended', 'revoked'
    public_reference: str | None = None
    issued_at: datetime | None = None
    expires_at: datetime | None = None
    verification_url: str | None = None
    qr_code_data_url: str | None = None
    has_photo: bool = False
    is_valid: bool = False


class StudentEligibilitySummary(BaseModel):
    eligible: bool
    reason_code: str | None = None
    reason: str
    photo_required: bool = False


class StudentActivityItem(BaseModel):
    id: uuid.UUID
    action: str
    title: str
    description: str
    timestamp: datetime
    category: str  # 'verification', 'credential', 'security', 'profile'


class StudentDashboardResponse(BaseModel):
    account: StudentAccountSummary
    institution: StudentInstitutionSummary
    student: StudentRecordSummary
    verification: StudentVerificationSummary
    credential: StudentCredentialSummary
    eligibility: StudentEligibilitySummary
    unread_notifications_count: int
    pending_requests_count: int
    recent_activity: list[StudentActivityItem]


class StudentProfileRead(BaseModel):
    account: StudentAccountSummary
    student: StudentRecordSummary
    institution: StudentInstitutionSummary


class StudentProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone_number: str | None = Field(default=None, max_length=50)


class StudentPhotoUploadResponse(BaseModel):
    success: bool
    photo_url: str
    message: str


class StudentNotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    message: str
    category: str
    is_read: bool
    action_url: str | None = None
    created_at: datetime


class StudentNotificationPage(BaseModel):
    items: list[StudentNotificationRead]
    total: int
    unread_count: int


class StudentRequestCreate(BaseModel):
    category: str = Field(min_length=2, max_length=50)  # 'correction', 'support', 'credential'
    subject: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=5, max_length=2000)
    field_name: str | None = Field(default=None, max_length=100)
    current_value: str | None = Field(default=None, max_length=255)
    requested_value: str | None = Field(default=None, max_length=255)


class StudentRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reference: str
    category: str
    subject: str
    description: str
    field_name: str | None = None
    current_value: str | None = None
    requested_value: str | None = None
    status: str
    resolution_notes: str | None = None
    created_at: datetime
    updated_at: datetime


class StudentRequestPage(BaseModel):
    items: list[StudentRequestRead]
    total: int


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=6, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class StudentCredentialEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_type: str
    reason: str | None = None
    created_at: datetime


class StudentCredentialItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    public_reference: str
    policy_reference: str | None = None
    issued_at: datetime | None = None
    expires_at: datetime | None = None
    revoked_at: datetime | None = None
    revocation_reason: str | None = None
    is_current: bool = False
    events: list[StudentCredentialEventRead] = Field(default_factory=list)


class StudentCredentialHistoryResponse(BaseModel):
    current_credential: StudentCredentialSummary | None = None
    credentials: list[StudentCredentialItem] = Field(default_factory=list)

