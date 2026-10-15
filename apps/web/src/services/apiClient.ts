/**
 * Centralized API client for AstraMind Platform
 */

import { HealthResponse, ReadyResponse, ApiErrorResponse } from "@/types";

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
};
