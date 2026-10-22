/**
 * Centralized API client for AstraMind Platform
 */

import {
  ApiErrorResponse,
  Campus,
  Credential,
  CredentialEvent,
  CurrentUser,
  Eligibility,
  HealthResponse,
  LoginResponse,
  Page,
  Programme,
  ReadyResponse,
  Student,
  StudentCredentialProfile,
  StudentRegistryDetail,
  VerificationPublicResponse,
  CredentialQrRead,
  OnboardingRegisterPayload,
  OnboardingRegisterResponse,
  OnboardingVerifyPayload,
  OnboardingVerifyResponse,
  OnboardingStatusResponse,
  DevMailboxResponse,
  OnboardingQueueResponse,
  RosterPreviewResponse,
  RosterCommitResponse,
  RosterFreshnessResponse,
  StaffOverviewResponse,
  StaffNotificationResponse,
  StaffReviewQueueResponse,
  StaffReviewCaseDetail,
  StaffStudentRecordListResponse,
  StaffStudentRecordItem,
  StaffStudentRecordDetail,
  StaffImportUploadResponse,
  StaffImportListResponse,
  StaffImportPreviewResponse,
  StaffCommitResponse,
  StaffMappingTemplateRead,
  StaffAuditResponse,
  StaffRequestItem,
  StaffRequestListResponse,
  StudentDashboardResponse,
  StudentProfileRead,
  StudentProfileUpdatePayload,
  StudentPhotoUploadResponse,
  StudentNotificationPage,
  StudentRequestCreatePayload,
  StudentRequestRead,
  StudentRequestPage,
  StudentVerificationSummary,
  StudentCredentialSummary,
  StudentCredentialHistoryResponse,
  StudentActivityItem,
} from "@/types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: unknown[];
  public timestamp?: string;

  constructor(message: string, code: string, status: number, details?: unknown[], timestamp?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.timestamp = timestamp;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      if (data && typeof data === "object" && "error" in data) {
        const errPayload = data as ApiErrorResponse;
        throw new ApiError(
          errPayload.error.message || `Request failed with status ${response.status}`,
          errPayload.error.code || "API_ERROR",
          response.status,
          errPayload.error.details,
          errPayload.timestamp
        );
      }
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        "HTTP_ERROR",
        response.status
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Network error or server unreachable";
    throw new ApiError(message, "NETWORK_ERROR", 0);
  }
}

export const apiClient = {
  getLuanarDemoRosterUrl(validationCases = false): string {
    const suffix = validationCases ? "?validation_cases=true" : "";
    return `${BASE_URL.replace(/\/$/, "")}/staff/demo/luanar-roster.csv${suffix}`;
  },

  /**
   * Fetches the backend application health and liveness state
   */
  async getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>("/health");
  },

  /**
   * Fetches backend readiness including PostgreSQL database connectivity
   */
  async getReadiness(): Promise<ReadyResponse> {
    return request<ReadyResponse>("/ready");
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async logout(): Promise<void> {
    await request<{ success: boolean }>("/auth/logout", { method: "POST" });
  },

  async getCurrentUser(): Promise<CurrentUser> {
    return request<CurrentUser>("/auth/me");
  },

  async getCampuses(institutionId: string): Promise<Campus[]> {
    return request<Campus[]>(`/institutions/${institutionId}/campuses`, {
      headers: { "X-Institution-Context": institutionId },
    });
  },

  async getProgrammes(institutionId: string): Promise<Programme[]> {
    return request<Programme[]>(`/institutions/${institutionId}/programmes`, {
      headers: { "X-Institution-Context": institutionId },
    });
  },

  async getStudents(institutionId: string, search?: string): Promise<Page<Student>> {
    const suffix = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<Page<Student>>(`/institutions/${institutionId}/students${suffix}`, {
      headers: { "X-Institution-Context": institutionId },
    });
  },

  async getStudentDetail(institutionId: string, studentId: string): Promise<StudentRegistryDetail> {
    return request<StudentRegistryDetail>(`/institutions/${institutionId}/students/${studentId}`, { headers: { "X-Institution-Context": institutionId } });
  },

  async getEligibility(institutionId: string, studentId: string): Promise<Eligibility> {
    return request<Eligibility>(`/institutions/${institutionId}/students/${studentId}/credential-eligibility`, { headers: { "X-Institution-Context": institutionId } });
  },

  async issueCredential(institutionId: string, studentId: string): Promise<Credential> {
    return request<Credential>(`/institutions/${institutionId}/students/${studentId}/credentials`, { method: "POST", headers: { "X-Institution-Context": institutionId } });
  },

  async transitionCredential(institutionId: string, credentialId: string, action: "suspend" | "reinstate" | "revoke", reason: string): Promise<Credential> {
    return request<Credential>(`/institutions/${institutionId}/credentials/${credentialId}/${action}`, { method: "POST", body: JSON.stringify({ reason }), headers: { "X-Institution-Context": institutionId } });
  },

  async getCredentialEvents(institutionId: string, credentialId: string): Promise<Page<CredentialEvent>> {
    return request<Page<CredentialEvent>>(`/institutions/${institutionId}/credentials/${credentialId}/events`, { headers: { "X-Institution-Context": institutionId } });
  },

  async getOwnCredential(institutionId: string): Promise<StudentCredentialProfile> {
    return request<StudentCredentialProfile>(`/institutions/${institutionId}/students/me/credential`, { headers: { "X-Institution-Context": institutionId } });
  },

  async verifyCredential(reference: string): Promise<VerificationPublicResponse> {
    return request<VerificationPublicResponse>(`/public/verify/${encodeURIComponent(reference)}`);
  },

  async getCredentialQr(institutionId: string, credentialId: string): Promise<CredentialQrRead> {
    return request<CredentialQrRead>(`/institutions/${institutionId}/credentials/${credentialId}/qr`, {
      headers: { "X-Institution-Context": institutionId },
    });
  },

  // ── Student Onboarding Methods ──────────────────────────────────────────
  async registerStudent(payload: OnboardingRegisterPayload): Promise<OnboardingRegisterResponse> {
    return request<OnboardingRegisterResponse>("/onboarding/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async verifyOnboardingCode(payload: OnboardingVerifyPayload): Promise<OnboardingVerifyResponse> {
    return request<OnboardingVerifyResponse>("/onboarding/verify-code", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async resendOnboardingCode(reference: string): Promise<{ reference: string; email: string; message: string }> {
    return request<{ reference: string; email: string; message: string }>("/onboarding/resend-code", {
      method: "POST",
      body: JSON.stringify({ reference }),
    });
  },

  async getOnboardingStatus(reference: string): Promise<OnboardingStatusResponse> {
    return request<OnboardingStatusResponse>(`/onboarding/status/${encodeURIComponent(reference)}`);
  },

  async submitFollowUp(reference: string, student_response: string): Promise<{ reference: string; message: string }> {
    return request<{ reference: string; message: string }>("/onboarding/follow-up", {
      method: "POST",
      body: JSON.stringify({ reference, student_response }),
    });
  },

  async getDevMailbox(email: string): Promise<DevMailboxResponse> {
    return request<DevMailboxResponse>(`/onboarding/dev-mailbox?email=${encodeURIComponent(email)}`);
  },

  // ── Registry Staff Onboarding Review Queue ──────────────────────────────
  async getOnboardingQueue(institutionId: string): Promise<OnboardingQueueResponse> {
    return request<OnboardingQueueResponse>(`/institutions/${institutionId}/onboarding-queue`, {
      headers: { "X-Institution-Context": institutionId },
    });
  },

  async reviewOnboardingRequest(
    institutionId: string,
    requestId: string,
    decision: "approve" | "reject" | "follow_up",
    notes?: string,
    followUpInstructions?: string
  ): Promise<{ reference: string; status: string; decision: string; message: string }> {
    return request<{ reference: string; status: string; decision: string; message: string }>(
      `/institutions/${institutionId}/onboarding-queue/${requestId}/review`,
      {
        method: "POST",
        body: JSON.stringify({
          decision,
          notes: notes || undefined,
          follow_up_instructions: followUpInstructions || undefined,
        }),
        headers: { "X-Institution-Context": institutionId },
      }
    );
  },

  // ── CSV Roster Management Methods ───────────────────────────────────────
  async previewRoster(
    institutionId: string,
    csvContent: string,
    isAuthoritative: boolean = false
  ): Promise<RosterPreviewResponse> {
    return request<RosterPreviewResponse>(`/institutions/${institutionId}/roster/preview`, {
      method: "POST",
      body: JSON.stringify({
        csv_content: csvContent,
        is_authoritative_snapshot: isAuthoritative,
      }),
      headers: { "X-Institution-Context": institutionId },
    });
  },

  async commitRoster(
    institutionId: string,
    csvContent: string,
    filename: string,
    isAuthoritative: boolean = false
  ): Promise<RosterCommitResponse> {
    return request<RosterCommitResponse>(`/institutions/${institutionId}/roster/commit`, {
      method: "POST",
      body: JSON.stringify({
        csv_content: csvContent,
        filename,
        is_authoritative_snapshot: isAuthoritative,
      }),
      headers: { "X-Institution-Context": institutionId },
    });
  },

  async getRosterFreshness(institutionId: string): Promise<RosterFreshnessResponse> {
    return request<RosterFreshnessResponse>(`/institutions/${institutionId}/roster/freshness`, {
      headers: { "X-Institution-Context": institutionId },
    });
  },

  // ── Institutional Reviewer Console Endpoints ──────────────────────────────

  async getStaffOverview(institutionId?: string): Promise<StaffOverviewResponse> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffOverviewResponse>("/staff/overview", { headers });
  },

  async getStaffNotifications(institutionId?: string): Promise<StaffNotificationResponse> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffNotificationResponse>("/staff/notifications", { headers });
  },

  async getStaffReviews(
    params: { status?: string; search?: string; page?: number; page_size?: number } = {},
    institutionId?: string
  ): Promise<StaffReviewQueueResponse> {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set("status", params.status);
    if (params.search) searchParams.set("search", params.search);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.page_size) searchParams.set("page_size", String(params.page_size));

    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;

    const qs = searchParams.toString();
    return request<StaffReviewQueueResponse>(`/staff/reviews${qs ? `?${qs}` : ""}`, { headers });
  },

  async getStaffReviewCase(reviewId: string, institutionId?: string): Promise<StaffReviewCaseDetail> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffReviewCaseDetail>(`/staff/reviews/${reviewId}`, { headers });
  },

  async submitStaffReviewDecision(
    reviewId: string,
    decision: "approve" | "reject" | "follow_up",
    notes?: string,
    followUpInstructions?: string,
    institutionId?: string
  ): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<Record<string, unknown>>(`/staff/reviews/${reviewId}/decisions`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        notes: notes || undefined,
        follow_up_instructions: followUpInstructions || undefined,
      }),
      headers,
    });
  },

  async getStaffRecords(
    params: { search?: string; campus_id?: string; programme_id?: string; status?: string; page?: number; page_size?: number } = {},
    institutionId?: string
  ): Promise<StaffStudentRecordListResponse> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set("search", params.search);
    if (params.campus_id) searchParams.set("campus_id", params.campus_id);
    if (params.programme_id) searchParams.set("programme_id", params.programme_id);
    if (params.status) searchParams.set("status", params.status);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.page_size) searchParams.set("page_size", String(params.page_size));

    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;

    const qs = searchParams.toString();
    return request<StaffStudentRecordListResponse>(`/staff/records${qs ? `?${qs}` : ""}`, { headers });
  },

  async createStaffRecord(
    payload: {
      student_number: string;
      full_name: string;
      institutional_email: string;
      campus_id: string;
      programme_id: string;
      academic_year: string;
      study_year?: number;
      enrollment_status?: string;
    },
    institutionId?: string
  ): Promise<StaffStudentRecordItem> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffStudentRecordItem>("/staff/records", {
      method: "POST",
      body: JSON.stringify(payload),
      headers,
    });
  },

  async getStaffRecord(recordId: string, institutionId?: string): Promise<StaffStudentRecordDetail> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffStudentRecordDetail>(`/staff/records/${recordId}`, { headers });
  },

  async updateStaffRecord(
    recordId: string,
    payload: {
      full_name?: string;
      campus_id?: string;
      programme_id?: string;
      academic_year?: string;
      study_year?: number;
      enrollment_status?: string;
    },
    institutionId?: string
  ): Promise<StaffStudentRecordItem> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffStudentRecordItem>(`/staff/records/${recordId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers,
    });
  },

  async archiveStaffRecord(recordId: string, institutionId?: string): Promise<{ message: string }> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<{ message: string }>(`/staff/records/${recordId}/archive`, {
      method: "POST",
      headers,
    });
  },

  async restoreStaffRecord(recordId: string, institutionId?: string): Promise<{ message: string }> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<{ message: string }>(`/staff/records/${recordId}/restore`, {
      method: "POST",
      headers,
    });
  },

  async uploadStaffImport(file: File, institutionId?: string): Promise<StaffImportUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;

    const url = `${BASE_URL.replace(/\/$/, "")}/staff/imports`;
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      headers,
      credentials: "include",
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const msg = data?.error?.message || data?.message || "File upload failed";
      throw new ApiError(msg, "UPLOAD_ERROR", response.status);
    }
    return data as StaffImportUploadResponse;
  },

  async getStaffImports(institutionId?: string): Promise<StaffImportListResponse> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffImportListResponse>("/staff/imports", { headers });
  },

  async getStaffImport(importId: string, institutionId?: string): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<Record<string, unknown>>(`/staff/imports/${importId}`, { headers });
  },

  async updateStaffImportMapping(
    importId: string,
    payload: {
      mappings: Record<string, string>;
      save_as_template?: boolean;
      template_name?: string;
      template_description?: string;
    },
    institutionId?: string
  ): Promise<StaffImportPreviewResponse> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffImportPreviewResponse>(`/staff/imports/${importId}/mapping`, {
      method: "PUT",
      body: JSON.stringify(payload),
      headers,
    });
  },

  async validateStaffImport(
    importId: string,
    payload: {
      trim_whitespace?: boolean;
      collapse_whitespace?: boolean;
      normalize_email?: boolean;
      preserve_string_identifiers?: boolean;
      status_dictionary?: Record<string, string>;
      date_format?: string;
    },
    institutionId?: string
  ): Promise<StaffImportPreviewResponse> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffImportPreviewResponse>(`/staff/imports/${importId}/validate`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers,
    });
  },

  async getStaffImportPreview(importId: string, institutionId?: string): Promise<StaffImportPreviewResponse> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffImportPreviewResponse>(`/staff/imports/${importId}/preview`, { headers });
  },

  async commitStaffImport(
    importId: string,
    payload: { is_authoritative_snapshot?: boolean; allow_partial_commit?: boolean } = {},
    institutionId?: string
  ): Promise<StaffCommitResponse> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffCommitResponse>(`/staff/imports/${importId}/commit`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers,
    });
  },

  async getStaffMappingTemplates(institutionId?: string): Promise<StaffMappingTemplateRead[]> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffMappingTemplateRead[]>("/staff/mapping-templates", { headers });
  },

  async createStaffMappingTemplate(
    payload: {
      name: string;
      description?: string;
      source_headers?: string[];
      mappings: Record<string, string>;
      transformations?: Record<string, unknown>;
      status_dictionary?: Record<string, string>;
    },
    institutionId?: string
  ): Promise<StaffMappingTemplateRead> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffMappingTemplateRead>("/staff/mapping-templates", {
      method: "POST",
      body: JSON.stringify(payload),
      headers,
    });
  },

  async getStaffAuditTrail(
    params: { action?: string; resource_type?: string; search?: string; page?: number; page_size?: number } = {},
    institutionId?: string
  ): Promise<StaffAuditResponse> {
    const searchParams = new URLSearchParams();
    if (params.action) searchParams.set("action", params.action);
    if (params.resource_type) searchParams.set("resource_type", params.resource_type);
    if (params.search) searchParams.set("search", params.search);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.page_size) searchParams.set("page_size", String(params.page_size));

    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;

    const qs = searchParams.toString();
    return request<StaffAuditResponse>(`/staff/audit${qs ? `?${qs}` : ""}`, { headers });
  },

  async getStaffRequests(
    params: { status?: string; category?: string; search?: string; page?: number; page_size?: number } = {},
    institutionId?: string
  ): Promise<StaffRequestListResponse> {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set("status", params.status);
    if (params.category) searchParams.set("category", params.category);
    if (params.search) searchParams.set("search", params.search);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.page_size) searchParams.set("page_size", String(params.page_size));

    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;

    const qs = searchParams.toString();
    return request<StaffRequestListResponse>(`/staff/requests${qs ? `?${qs}` : ""}`, { headers });
  },

  async getStaffRequest(requestId: string, institutionId?: string): Promise<StaffRequestItem> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffRequestItem>(`/staff/requests/${requestId}`, { headers });
  },

  async submitStaffRequestDecision(
    requestId: string,
    decision: string,
    resolutionNotes: string,
    institutionId?: string
  ): Promise<StaffRequestItem> {
    const headers: Record<string, string> = {};
    if (institutionId) headers["X-Institution-Context"] = institutionId;
    return request<StaffRequestItem>(`/staff/requests/${requestId}/decision`, {
      method: "POST",
      headers,
      body: JSON.stringify({ decision, resolution_notes: resolutionNotes }),
    });
  },


  // ===========================================================================
  // Student Portal API Methods
  // ===========================================================================

  async getStudentDashboard(): Promise<StudentDashboardResponse> {
    return request<StudentDashboardResponse>("/student/dashboard");
  },

  async getStudentProfile(): Promise<StudentProfileRead> {
    return request<StudentProfileRead>("/student/profile");
  },

  async updateStudentProfile(payload: StudentProfileUpdatePayload): Promise<StudentProfileRead> {
    return request<StudentProfileRead>("/student/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async uploadStudentPhoto(file: File): Promise<StudentPhotoUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("photo", file);

    const url = `${BASE_URL.replace(/\/$/, "")}/student/profile/photo`;
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const msg = data?.error?.message || data?.message || data?.detail || "Photo upload failed";
      throw new ApiError(msg, "PHOTO_UPLOAD_ERROR", response.status);
    }
    return data as StudentPhotoUploadResponse;
  },

  async getStudentVerification(): Promise<StudentVerificationSummary> {
    return request<StudentVerificationSummary>("/student/verification");
  },

  async getStudentCredential(): Promise<StudentCredentialSummary> {
    return request<StudentCredentialSummary>("/student/credential");
  },

  async getStudentCredentialsHistory(): Promise<StudentCredentialHistoryResponse> {
    return request<StudentCredentialHistoryResponse>("/student/credentials");
  },

  async getStudentRequests(status?: string): Promise<StudentRequestPage> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<StudentRequestPage>(`/student/requests${qs}`);
  },

  async createStudentRequest(payload: StudentRequestCreatePayload): Promise<StudentRequestRead> {
    return request<StudentRequestRead>("/student/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getStudentRequestDetail(id: string): Promise<StudentRequestRead> {
    return request<StudentRequestRead>(`/student/requests/${id}`);
  },

  async getStudentNotifications(): Promise<StudentNotificationPage> {
    return request<StudentNotificationPage>("/student/notifications");
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/student/notifications/${id}/read`, {
      method: "PATCH",
    });
  },

  async markAllNotificationsRead(): Promise<{ success: boolean; updated: number }> {
    return request<{ success: boolean; updated: number }>("/student/notifications/mark-all-read", {
      method: "POST",
    });
  },

  async getStudentActivity(): Promise<StudentActivityItem[]> {
    return request<StudentActivityItem[]>("/student/activity");
  },

  async changeStudentPassword(payload: { current_password: string; new_password: string }): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>("/student/security/password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
