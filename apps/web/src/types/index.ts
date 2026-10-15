/**
 * AstraMind Platform Core TypeScript Definitions
 */

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

export interface Institution {
  id: string;
  code: string;
  name: string;
  short_name: string;
  campus: string;
  contact_email: string;
  is_active: boolean;
  brand_primary_color: string;
  brand_accent_color: string;
}
