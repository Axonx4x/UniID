"""Pydantic schemas for the Institutional Reviewer Console and Import System."""

import uuid
from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


# ── Operational Overview ───────────────────────────────────────────────────────

class StaffOverviewResponse(BaseModel):
    institution_id: uuid.UUID
    institution_name: str
    institution_code: str
    verification_mode: str
    pending_reviews_count: int
    needs_attention_count: int
    completed_decisions_30d: int
    roster_freshness_status: str  # "fresh", "warning", "stale", "missing"
    roster_freshness_days: int
    roster_last_imported_at: datetime | None
    roster_active_version: str | None
    total_active_students: int
    total_current_roster_records: int
    total_archived_students: int
    total_imports_count: int


class StaffNotificationItem(BaseModel):
    id: str
    category: str
    title: str
    message: str
    created_at: datetime
    action_url: str


class StaffNotificationResponse(BaseModel):
    items: list[StaffNotificationItem]


# ── Review Queue & Case Detail ─────────────────────────────────────────────────

class StaffReviewQueueItem(BaseModel):
    id: uuid.UUID
    reference: str
    student_number: str | None
    full_name: str
    institutional_email: str
    verification_mode: str
    status: str
    roster_match_status: str | None
    api_check_status: str | None
    discrepancy_details: dict[str, Any]
    submitted_at: datetime
    reviewed_at: datetime | None
    review_decision: str | None
    reviewer_name: str | None


class StaffReviewQueueResponse(BaseModel):
    items: list[StaffReviewQueueItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    pending_count: int
    needs_attention_count: int
    verified_count: int
    rejected_count: int


class StaffReviewCaseEvidence(BaseModel):
    has_match: bool
    match_source: str | None  # "sis_api", "roster_import", "student_registry"
    student_number: str | None
    full_name: str | None
    institutional_email: str | None
    enrollment_status: str | None
    programme_code: str | None
    programme_name: str | None
    campus_code: str | None
    campus_name: str | None
    academic_year: str | None
    record_updated_at: datetime | None
    roster_version: str | None
    discrepancies: list[str]


class StaffReviewCaseDetail(BaseModel):
    id: uuid.UUID
    reference: str
    student_number: str | None
    full_name: str
    institutional_email: str
    verification_mode: str
    status: str
    roster_match_status: str | None
    api_check_status: str | None
    discrepancy_details: dict[str, Any]
    submitted_at: datetime
    reviewed_at: datetime | None
    review_decision: str | None
    review_notes: str | None
    follow_up_instructions: str | None
    reviewer_name: str | None
    evidence: StaffReviewCaseEvidence
    history: list[dict[str, Any]]


class StaffReviewDecisionRequest(BaseModel):
    decision: str = Field(..., pattern="^(approve|reject|follow_up)$")
    notes: str | None = None
    follow_up_instructions: str | None = None


# ── Student Registry CRUD ──────────────────────────────────────────────────────

class StaffStudentRecordItem(BaseModel):
    id: uuid.UUID
    institution_id: uuid.UUID
    student_number: str
    full_name: str
    institutional_email: str
    campus_id: uuid.UUID | None
    campus_name: str | None
    campus_code: str | None
    programme_id: uuid.UUID | None
    programme_name: str | None
    programme_code: str | None
    academic_year: str | None
    study_year: int | None
    enrollment_status: str
    status: str  # "active" or "archived"
    source: str  # "manual", "imported_roster", "api_sync"
    credential_status: str | None  # "active", "suspended", "revoked", "none"
    credential_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class StaffStudentRecordListResponse(BaseModel):
    items: list[StaffStudentRecordItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class StaffStudentRecordDetail(BaseModel):
    student: StaffStudentRecordItem
    audit_history: list[dict[str, Any]]
    available_campuses: list[dict[str, str]]
    available_programmes: list[dict[str, str]]


class StaffCreateStudentRecordRequest(BaseModel):
    student_number: str = Field(..., min_length=2, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=255)
    institutional_email: str = Field(..., min_length=5, max_length=320)
    campus_id: uuid.UUID
    programme_id: uuid.UUID
    academic_year: str = Field(..., min_length=4, max_length=20)
    study_year: int | None = Field(None, ge=1, le=10)
    enrollment_status: str = Field("active", pattern="^(active|pending|completed|suspended|withdrawn)$")


class StaffUpdateStudentRecordRequest(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=255)
    campus_id: uuid.UUID | None = None
    programme_id: uuid.UUID | None = None
    academic_year: str | None = Field(None, min_length=4, max_length=20)
    study_year: int | None = Field(None, ge=1, le=10)
    enrollment_status: str | None = Field(None, pattern="^(active|pending|completed|suspended|withdrawn)$")


# ── File Import Wizard ─────────────────────────────────────────────────────────

class StaffImportSummary(BaseModel):
    id: uuid.UUID
    filename: str
    version_tag: str
    status: str  # "uploaded", "mapped", "validated", "ready_to_commit", "committed", "failed", "cancelled"
    total_rows: int
    valid_rows: int
    new_records_count: int
    updated_records_count: int
    rejected_rows_count: int
    is_authoritative_snapshot: bool
    file_checksum: str | None
    uploaded_by_name: str
    uploaded_by_email: str
    created_at: datetime
    committed_at: datetime | None


class StaffImportListResponse(BaseModel):
    imports: list[StaffImportSummary]
    total: int
    freshness_status: str
    freshness_days: int
    last_imported_at: datetime | None


class StaffImportUploadResponse(BaseModel):
    import_id: uuid.UUID
    filename: str
    file_checksum: str
    total_rows: int
    source_headers: list[str]
    sample_rows: list[dict[str, str]]
    suggested_mappings: dict[str, str]
    canonical_fields: list[dict[str, Any]]
    compatible_templates: list[dict[str, Any]]


class StaffMappingRequest(BaseModel):
    mappings: dict[str, str]  # source_header -> canonical_field
    save_as_template: bool = False
    template_name: str | None = None
    template_description: str | None = None


class StaffTransformationConfig(BaseModel):
    trim_whitespace: bool = True
    collapse_whitespace: bool = True
    normalize_email: bool = True
    preserve_string_identifiers: bool = True
    status_dictionary: dict[str, str] = Field(default_factory=dict)
    date_format: str = "auto"


class StaffPreviewRow(BaseModel):
    row_number: int
    student_number: str
    full_name: str | None
    institutional_email: str
    classification: str  # "create", "update", "unchanged", "conflict", "invalid", "skip"
    validation_status: str  # "valid", "warning", "error"
    errors: list[str]
    incoming_values: dict[str, Any]
    existing_values: dict[str, Any] | None = None
    diff: dict[str, dict[str, Any]] | None = None


class StaffReconciliationSummary(BaseModel):
    total_rows: int
    creates_count: int
    updates_count: int
    unchanged_count: int
    conflicts_count: int
    invalid_count: int
    skipped_count: int


class StaffImportPreviewResponse(BaseModel):
    import_id: uuid.UUID
    status: str
    filename: str
    version_tag: str
    summary: StaffReconciliationSummary
    rows: list[StaffPreviewRow]
    is_ready_to_commit: bool
    can_partial_commit: bool


class StaffCommitRequest(BaseModel):
    is_authoritative_snapshot: bool = False
    allow_partial_commit: bool = False


class StaffCommitResponse(BaseModel):
    import_id: uuid.UUID
    status: str
    version_tag: str
    total_rows: int
    new_records_count: int
    updated_records_count: int
    rejected_rows_count: int
    committed_at: datetime
    message: str


# ── Mapping Templates ──────────────────────────────────────────────────────────

class StaffMappingTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    institution_id: uuid.UUID
    name: str
    description: str | None
    source_headers: list[str]
    mappings: dict[str, str]
    transformations: dict[str, Any]
    status_dictionary: dict[str, str]
    version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class StaffMappingTemplateCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    source_headers: list[str] = Field(default_factory=list)
    mappings: dict[str, str]
    transformations: dict[str, Any] = Field(default_factory=dict)
    status_dictionary: dict[str, str] = Field(default_factory=dict)


# ── Audit Log ──────────────────────────────────────────────────────────────────

class StaffAuditEventItem(BaseModel):
    id: uuid.UUID
    action: str
    resource_type: str
    resource_id: uuid.UUID | None
    actor_id: uuid.UUID | None
    actor_name: str | None
    actor_email: str | None
    metadata: dict[str, Any]
    created_at: datetime


class StaffAuditResponse(BaseModel):
    items: list[StaffAuditEventItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Student Requests Queue ─────────────────────────────────────────────────────

class StaffRequestItem(BaseModel):
    id: uuid.UUID
    reference: str
    student_id: uuid.UUID | None = None
    student_number: str | None = None
    student_name: str
    student_email: str
    programme_name: str | None = None
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


class StaffRequestListResponse(BaseModel):
    items: list[StaffRequestItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    pending_count: int
    in_review_count: int
    resolved_count: int
    declined_count: int


class StaffRequestDecisionRequest(BaseModel):
    decision: str = Field(..., pattern="^(in_review|resolved|declined)$")
    resolution_notes: str = Field(..., min_length=2)
