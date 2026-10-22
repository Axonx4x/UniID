export interface DatabaseCheckDetail {
  connected: boolean;
  latency_ms: number;
  error?: string | null;
}

export interface HealthResponse {
  status: "healthy" | string;
  timestamp: string;
  environment: string;
  version: string;
  simulation_mode: boolean;
  uniid_demo_mode: boolean;
}

export interface ReadyResponse {
  status: "ready" | "not_ready";
  timestamp: string;
  environment: string;
  version: string;
  database: DatabaseCheckDetail;
}

export interface ApiErrorDetail {
  loc?: string[];
  msg: string;
  type?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
  timestamp: string;
}

export type Role = "student" | "verifier" | "registry_admin" | "platform_admin";

export interface Institution {
  id: string;
  name: string;
  slug: string;
  institution_code: string;
  status: "active" | "inactive";
}

export interface CurrentMembership {
  id: string;
  role: Role;
  status: "active" | "inactive";
  institution: Institution;
}

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  memberships: CurrentMembership[];
}

export interface LoginResponse {
  user: CurrentUser;
}

export interface Campus {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  status: string;
}

export interface Programme {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  status: string;
}

export interface Student {
  id: string;
  institution_id: string;
  campus_id: string;
  student_number: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export type CredentialStatus = "pending" | "active" | "suspended" | "expired" | "revoked";

export interface Credential {
  id: string;
  student_id: string;
  institution_id: string;
  public_reference: string;
  status: CredentialStatus;
  issued_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
  policy_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface CredentialEvent {
  id: string;
  credential_id: string;
  event_type: string;
  actor_user_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface Eligibility {
  eligible: boolean;
  reason_code: string | null;
  reason: string;
  qualifying_enrollment_id: string | null;
  policy_reference: string;
}

export interface StudentRegistryDetail {
  id: string;
  student_number: string;
  campus_name: string | null;
  programme_name: string | null;
  enrollment_status: string | null;
  academic_year: string | null;
  credential: Credential | null;
}

export interface StudentCredentialProfile {
  institution_name: string;
  student_number: string;
  display_name: string;
  campus_name: string | null;
  programme_name: string | null;
  credential: Credential | null;
  verification_url?: string | null;
  qr_code_data_url?: string | null;
}

export type VerificationOutcome = "valid" | "suspended" | "revoked" | "expired" | "invalid";

export interface VerificationPublicResponse {
  status: VerificationOutcome;
  valid: boolean;
  institution_name: string | null;
  student_display_name: string | null;
  programme_name: string | null;
  issued_at: string | null;
  expires_at: string | null;
  verified_at: string;
  message: string;
}

export interface CredentialQrRead {
  public_reference: string;
  verification_url: string;
  qr_code_data_url: string;
}

// ── Student Onboarding & Roster Management Types ─────────────────────────

export interface OnboardingRegisterPayload {
  institution_slug?: string;
  institution_id?: string;
  email: string;
  full_name: string;
  password: string;
  student_number?: string;
}

export interface OnboardingRegisterResponse {
  reference: string;
  status: string;
  email: string;
  institution_slug: string;
  institution_name: string;
  resumed: boolean;
}

export interface OnboardingVerifyPayload {
  reference: string;
  code: string;
}

export interface OnboardingVerifyResponse {
  reference: string;
  status: string;
  pathway_outcome: string;
  message: string;
  roster_match?: string;
}

export interface OnboardingStatusResponse {
  reference: string;
  status: string;
  institution_name: string;
  institution_slug: string;
  full_name: string;
  email: string;
  verification_mode: string;
  submitted_at?: string | null;
  roster_match_status?: string | null;
  follow_up_instructions?: string | null;
  review_notes?: string | null;
}

export interface DevMailboxResponse {
  email: string;
  entry: {
    code: string;
    dispatched_at: string;
    institution_id: string;
    expires_at: string;
  } | null;
}

export interface OnboardingQueueItem {
  id: string;
  reference: string;
  full_name: string;
  institutional_email: string;
  student_number?: string | null;
  verification_mode: string;
  status: string;
  roster_match_status?: string | null;
  api_check_status?: string | null;
  discrepancy_details?: Record<string, unknown>;
  submitted_at?: string | null;
  follow_up_instructions?: string | null;
}

export interface OnboardingQueueResponse {
  items: OnboardingQueueItem[];
  total: number;
}

export interface RosterPreviewResponse {
  headers: string[];
  total_rows: number;
  valid_rows_count: number;
  rejected_rows_count: number;
  new_records_count: number;
  updated_records_count: number;
  records_to_deactivate_count: number;
  is_authoritative_snapshot: boolean;
  rejected_samples: Array<Record<string, unknown>>;
  preview_records: Array<Record<string, unknown>>;
}

export interface RosterCommitResponse {
  id: string;
  version_tag: string;
  filename: string;
  total_rows: number;
  valid_rows: number;
  new_records_count: number;
  updated_records_count: number;
  rejected_rows_count: number;
  is_authoritative_snapshot: boolean;
  status: string;
}

export interface RosterFreshnessResponse {
  institution_id: string;
  is_stale: boolean;
  days_since_import?: number | null;
  freshness_policy_days: number;
  last_imported_at?: string | null;
  active_version?: string | null;
  total_active_records: number;
  status_label: string;
}

// ── Staff Console Types ──────────────────────────────────────────────────────

export interface StaffOverviewResponse {
  institution_id: string;
  institution_name: string;
  institution_code: string;
  verification_mode: string;
  pending_reviews_count: number;
  needs_attention_count: number;
  completed_decisions_30d: number;
  roster_freshness_status: string;
  roster_freshness_days: number;
  roster_last_imported_at: string | null;
  roster_active_version: string | null;
  total_active_students: number;
  total_current_roster_records: number;
  total_archived_students: number;
  total_imports_count: number;
}

export interface StaffNotificationItem {
  id: string;
  category: "verification" | "correction" | "system" | string;
  title: string;
  message: string;
  created_at: string;
  action_url: string;
}

export interface StaffNotificationResponse {
  items: StaffNotificationItem[];
}

export interface StaffReviewQueueItem {
  id: string;
  reference: string;
  student_number: string | null;
  full_name: string;
  institutional_email: string;
  verification_mode: string;
  status: string;
  roster_match_status: string | null;
  api_check_status: string | null;
  discrepancy_details: Record<string, unknown>;
  submitted_at: string;
  reviewed_at: string | null;
  review_decision: string | null;
  reviewer_name: string | null;
}

export interface StaffReviewQueueResponse {
  items: StaffReviewQueueItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  pending_count: number;
  needs_attention_count: number;
  verified_count: number;
  rejected_count: number;
}

export interface StaffReviewCaseEvidence {
  has_match: boolean;
  match_source: string | null;
  student_number: string | null;
  full_name: string | null;
  institutional_email: string | null;
  enrollment_status: string | null;
  programme_code: string | null;
  programme_name: string | null;
  campus_code: string | null;
  campus_name: string | null;
  academic_year: string | null;
  record_updated_at: string | null;
  roster_version: string | null;
  discrepancies: string[];
}

export interface StaffReviewCaseDetail {
  id: string;
  reference: string;
  student_number: string | null;
  full_name: string;
  institutional_email: string;
  verification_mode: string;
  status: string;
  roster_match_status: string | null;
  api_check_status: string | null;
  discrepancy_details: Record<string, unknown>;
  submitted_at: string;
  reviewed_at: string | null;
  review_decision: string | null;
  review_notes: string | null;
  follow_up_instructions: string | null;
  reviewer_name: string | null;
  evidence: StaffReviewCaseEvidence;
  history: Array<{ action: string; timestamp: string; metadata: Record<string, unknown> }>;
}

export interface StaffStudentRecordItem {
  id: string;
  institution_id: string;
  student_number: string;
  full_name: string;
  institutional_email: string;
  campus_id: string | null;
  campus_name: string | null;
  campus_code: string | null;
  programme_id: string | null;
  programme_name: string | null;
  programme_code: string | null;
  academic_year: string | null;
  study_year: number | null;
  enrollment_status: string;
  status: string;
  source: string;
  credential_status: string | null;
  credential_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffStudentRecordListResponse {
  items: StaffStudentRecordItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface StaffStudentRecordDetail {
  student: StaffStudentRecordItem;
  audit_history: Array<{ action: string; timestamp: string; metadata: Record<string, unknown> }>;
  available_campuses: Array<{ id: string; name: string; code: string }>;
  available_programmes: Array<{ id: string; name: string; code: string }>;
}

export interface StaffImportSummary {
  id: string;
  filename: string;
  version_tag: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  new_records_count: number;
  updated_records_count: number;
  rejected_rows_count: number;
  is_authoritative_snapshot: boolean;
  file_checksum: string | null;
  uploaded_by_name: string;
  uploaded_by_email: string;
  created_at: string;
  committed_at: string | null;
}

export interface StaffImportListResponse {
  imports: StaffImportSummary[];
  total: number;
  freshness_status: string;
  freshness_days: number;
  last_imported_at: string | null;
}

export interface CanonicalFieldMeta {
  key: string;
  label: string;
  required: boolean;
  type: string;
  description: string;
}

export interface StaffImportUploadResponse {
  import_id: string;
  filename: string;
  file_checksum: string;
  total_rows: number;
  source_headers: string[];
  sample_rows: Array<Record<string, string>>;
  suggested_mappings: Record<string, string>;
  canonical_fields: CanonicalFieldMeta[];
  compatible_templates: Array<{
    id: string;
    name: string;
    version: number;
    match_percentage: number;
    mappings: Record<string, string>;
    transformations: Record<string, unknown>;
    status_dictionary: Record<string, string>;
  }>;
}

export interface StaffPreviewRow {
  row_number: number;
  student_number: string;
  full_name: string | null;
  institutional_email: string;
  classification: "create" | "update" | "unchanged" | "conflict" | "invalid" | "skip";
  validation_status: "valid" | "warning" | "error";
  errors: string[];
  incoming_values: Record<string, unknown>;
  existing_values: Record<string, unknown> | null;
  diff: Record<string, { from: unknown; to: unknown }> | null;
}

export interface StaffReconciliationSummary {
  total_rows: number;
  creates_count: number;
  updates_count: number;
  unchanged_count: number;
  conflicts_count: number;
  invalid_count: number;
  skipped_count: number;
}

export interface StaffImportPreviewResponse {
  import_id: string;
  status: string;
  filename: string;
  version_tag: string;
  summary: StaffReconciliationSummary;
  rows: StaffPreviewRow[];
  is_ready_to_commit: boolean;
  can_partial_commit: boolean;
}

export interface StaffCommitResponse {
  import_id: string;
  status: string;
  version_tag: string;
  total_rows: number;
  new_records_count: number;
  updated_records_count: number;
  rejected_rows_count: number;
  committed_at: string;
  message: string;
}

export interface StaffMappingTemplateRead {
  id: string;
  institution_id: string;
  name: string;
  description: string | null;
  source_headers: string[];
  mappings: Record<string, string>;
  transformations: Record<string, unknown>;
  status_dictionary: Record<string, string>;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffAuditEventItem {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface StaffAuditResponse {
  items: StaffAuditEventItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface StaffRequestItem {
  id: string;
  reference: string;
  student_id: string | null;
  student_number: string | null;
  student_name: string;
  student_email: string;
  programme_name: string | null;
  category: string;
  subject: string;
  description: string;
  field_name: string | null;
  current_value: string | null;
  requested_value: string | null;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffRequestListResponse {
  items: StaffRequestItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  pending_count: number;
  in_review_count: number;
  resolved_count: number;
  declined_count: number;
}


// =============================================================================
// Student Dashboard & Portal Types
// =============================================================================

export interface StudentAccountSummary {
  id: string;
  email: string;
  full_name: string;
  display_name: string;
  status: string;
  email_verified: boolean;
}

export interface StudentInstitutionSummary {
  id: string;
  name: string;
  slug: string;
  institution_code: string;
  logo_url: string | null;
}

export interface StudentRecordSummary {
  id: string | null;
  student_number: string | null;
  campus_name: string | null;
  campus_code: string | null;
  programme_name: string | null;
  programme_code: string | null;
  academic_year: string | null;
  study_year: number | null;
  enrollment_status: string | null;
  photo_url: string | null;
  phone_number: string | null;
}

export interface StudentVerificationSummary {
  status: string;
  verification_mode: string;
  reference: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_decision: string | null;
  follow_up_instructions: string | null;
  discrepancy_count: number;
  has_active_membership: boolean;
}

export interface StudentCredentialSummary {
  id: string | null;
  status: string | null;
  public_reference: string | null;
  issued_at: string | null;
  expires_at: string | null;
  verification_url: string | null;
  qr_code_data_url: string | null;
  has_photo: boolean;
  is_valid: boolean;
}

export interface StudentEligibilitySummary {
  eligible: boolean;
  reason_code: string | null;
  reason: string;
  photo_required: boolean;
}

export interface StudentActivityItem {
  id: string;
  action: string;
  title: string;
  description: string;
  timestamp: string;
  category: "verification" | "credential" | "security" | "profile" | string;
}

export interface StudentDashboardResponse {
  account: StudentAccountSummary;
  institution: StudentInstitutionSummary;
  student: StudentRecordSummary;
  verification: StudentVerificationSummary;
  credential: StudentCredentialSummary;
  eligibility: StudentEligibilitySummary;
  unread_notifications_count: number;
  pending_requests_count: number;
  recent_activity: StudentActivityItem[];
}

export interface StudentProfileRead {
  account: StudentAccountSummary;
  student: StudentRecordSummary;
  institution: StudentInstitutionSummary;
}

export interface StudentProfileUpdatePayload {
  full_name?: string;
  phone_number?: string;
}

export interface StudentPhotoUploadResponse {
  success: boolean;
  photo_url: string;
  message: string;
}

export interface StudentNotificationRead {
  id: string;
  title: string;
  message: string;
  category: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface StudentNotificationPage {
  items: StudentNotificationRead[];
  total: number;
  unread_count: number;
}

export interface StudentRequestCreatePayload {
  category: string;
  subject: string;
  description: string;
  field_name?: string;
  current_value?: string;
  requested_value?: string;
}

export interface StudentRequestRead {
  id: string;
  reference: string;
  category: string;
  subject: string;
  description: string;
  field_name: string | null;
  current_value: string | null;
  requested_value: string | null;
  status: "pending" | "in_review" | "resolved" | "rejected" | string;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentRequestPage {
  items: StudentRequestRead[];
  total: number;
}

export interface StudentCredentialEventRead {
  id: string;
  event_type: string;
  reason: string | null;
  created_at: string;
}

export interface StudentCredentialItem {
  id: string;
  status: string;
  public_reference: string;
  policy_reference: string | null;
  issued_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
  is_current: boolean;
  events: StudentCredentialEventRead[];
}

export interface StudentCredentialHistoryResponse {
  current_credential: StudentCredentialSummary | null;
  credentials: StudentCredentialItem[];
}
