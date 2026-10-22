"""Pydantic request/response schemas for the onboarding module."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ── Registration ────────────────────────────────────────────────────────

class RegisterStudentRequest(BaseModel):
    institution_slug: str | None = Field(default=None, max_length=50)
    institution_id: str | None = Field(default=None)
    email: str | None = Field(default=None, max_length=320)
    institutional_email: str | None = Field(default=None, max_length=320)
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=256)
    student_number: str | None = Field(default=None, max_length=100)

    @field_validator("email", mode="before")
    @classmethod
    def resolve_email(cls, v: str | None, info) -> str:
        # Will be validated in model_validator if needed
        return v or ""

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        return v.strip()


class RegisterStudentResponse(BaseModel):
    reference: str
    status: str
    email: str
    institution_slug: str
    institution_name: str
    resumed: bool = False


# ── Email OTP Verification ──────────────────────────────────────────────

class VerifyCodeRequest(BaseModel):
    reference: str = Field(min_length=1, max_length=50)
    code: str = Field(min_length=6, max_length=6)

    @field_validator("code")
    @classmethod
    def validate_code_format(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("Verification code must be exactly 6 digits")
        return v


class VerifyCodeResponse(BaseModel):
    reference: str
    status: str
    pathway_outcome: str | None = None
    roster_match: str | None = None
    message: str


# ── Resend OTP ──────────────────────────────────────────────────────────

class ResendCodeRequest(BaseModel):
    reference: str = Field(min_length=1, max_length=50)


class ResendCodeResponse(BaseModel):
    reference: str
    email: str
    message: str


# ── Status ──────────────────────────────────────────────────────────────

class OnboardingStatusResponse(BaseModel):
    reference: str
    status: str
    institution_name: str
    institution_slug: str
    full_name: str
    email: str
    verification_mode: str
    submitted_at: str | None = None
    follow_up_instructions: str | None = None
    roster_match_status: str | None = None
    review_notes: str | None = None


# ── Follow-up ───────────────────────────────────────────────────────────

class FollowUpRequest(BaseModel):
    reference: str = Field(min_length=1, max_length=50)
    message: str = Field(min_length=1, max_length=2000)


class FollowUpResponse(BaseModel):
    reference: str
    message: str


# ── Dev Mailbox ─────────────────────────────────────────────────────────

class DevMailboxEntry(BaseModel):
    code: str
    dispatched_at: str
    institution_id: str
    expires_at: str


class DevMailboxResponse(BaseModel):
    email: str
    entry: DevMailboxEntry | None = None


# ── Staff Review ────────────────────────────────────────────────────────

class OnboardingQueueItem(BaseModel):
    id: str
    reference: str
    full_name: str
    institutional_email: str
    student_number: str | None = None
    verification_mode: str
    status: str
    roster_match_status: str | None = None
    api_check_status: str | None = None
    discrepancy_details: dict[str, Any] = {}
    submitted_at: str | None = None
    follow_up_instructions: str | None = None


class OnboardingQueueResponse(BaseModel):
    items: list[OnboardingQueueItem]
    total: int


class ReviewDecisionRequest(BaseModel):
    decision: str = Field(description="One of: approve, reject, follow_up")
    notes: str | None = Field(default=None, max_length=2000)
    follow_up_instructions: str | None = Field(default=None, max_length=2000)

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, v: str) -> str:
        if v not in ("approve", "reject", "follow_up"):
            raise ValueError("Decision must be one of: approve, reject, follow_up")
        return v


class ReviewDecisionResponse(BaseModel):
    reference: str
    status: str
    decision: str
    message: str


# ── Roster Schemas ──────────────────────────────────────────────────────

class RosterPreviewRequest(BaseModel):
    csv_content: str = Field(description="Raw CSV file text content")
    is_authoritative_snapshot: bool = False


class RosterPreviewResponse(BaseModel):
    headers: list[str]
    total_rows: int
    valid_rows_count: int
    rejected_rows_count: int
    new_records_count: int
    updated_records_count: int
    records_to_deactivate_count: int = 0
    is_authoritative_snapshot: bool
    rejected_samples: list[dict[str, Any]] = []
    preview_records: list[dict[str, Any]] = []


class RosterCommitRequest(BaseModel):
    csv_content: str = Field(description="Raw CSV file text content")
    filename: str = Field(default="roster.csv", description="Original filename of the imported CSV")
    is_authoritative_snapshot: bool = False


class RosterCommitResponse(BaseModel):
    id: str
    version_tag: str
    filename: str
    total_rows: int
    valid_rows: int
    new_records_count: int
    updated_records_count: int
    rejected_rows_count: int
    is_authoritative_snapshot: bool
    status: str


class RosterFreshnessResponse(BaseModel):
    institution_id: str
    is_stale: bool
    days_since_import: int | None = None
    freshness_policy_days: int
    last_imported_at: str | None = None
    active_version: str | None = None
    total_active_records: int = 0
    status_label: str


class RosterImportSummary(BaseModel):
    id: str
    version_tag: str
    filename: str
    total_rows: int
    valid_rows: int
    new_records_count: int
    updated_records_count: int
    rejected_rows_count: int
    is_authoritative_snapshot: bool
    status: str
    committed_at: str


class RosterImportListResponse(BaseModel):
    imports: list[RosterImportSummary]
    total: int
