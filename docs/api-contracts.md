# AstraMind Digital Student ID: API Contracts & Engineering Specifications

## 1. Naming and Versioning Conventions

### Versioning
- All public REST endpoints are prefixed with `/api/v1`.
- Breaking changes require a new version path prefix (e.g. `/api/v2`).

### Resource Naming
- URIs use lowercase, kebab-case for resource collections (e.g., `/api/v1/institutions`, `/api/v1/credentials`).
- Singular names are avoided in collection endpoints.
- RPC-style actions are represented as sub-resource verbs when not natural CRUD operations (e.g., `POST /api/v1/credentials/{id}/revoke`).

---

## 2. Request and Response Conventions

### Request Headers
- `Content-Type: application/json` for mutation requests (`POST`, `PUT`, `PATCH`).
- `Accept: application/json` for all API calls.
- `X-Institution-Context: <institution_code>` for tenant-scoped operations.

### Response Structure
All responses are formatted as JSON. Successful resource reads return the resource model directly or wrapped in standard envelopes.

### Timestamps
- All date-time values are serialized as ISO 8601 strings in explicit UTC format with the `Z` suffix:
  `"2026-10-15T01:30:00Z"`

---

## 3. Standardized Error Format

All error responses (4xx and 5xx) must adhere to the following schema contract:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable explanation of what went wrong.",
    "details": [
      {
        "loc": ["body", "contact_email"],
        "msg": "value is not a valid email address",
        "type": "value_error"
      }
    ]
  },
  "timestamp": "2026-10-15T01:30:00Z"
}
```

### Standard Error Codes:
| Error Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | 422 | Pydantic payload validation failure. |
| `RESOURCE_NOT_FOUND` | 404 | Target entity does not exist. |
| `RESOURCE_CONFLICT` | 409 | Unique constraint violation (e.g., duplicate code). |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token. |
| `FORBIDDEN` | 403 | Authenticated user lacks permission for action or tenant. |
| `TENANT_CONTEXT_MISSING`| 400 | Required institution identifier missing. |
| `DATABASE_UNAVAILABLE` | 503 | Database connection or pool exhaustion. |
| `INTERNAL_SERVER_ERROR`| 500 | Unhandled server exception. |

---

## 4. Health and Readiness Contracts

### Application Liveness Probe
- **Endpoint**: `GET /api/v1/health`
- **Purpose**: Verifies that the FastAPI process is running and receiving HTTP requests.
- **Status Code**: `200 OK`
- **Response Contract**:
```json
{
  "status": "healthy",
  "timestamp": "2026-10-15T01:30:00Z",
  "environment": "development",
  "version": "0.1.0",
  "simulation_mode": true
}
```

### Application Readiness Probe
- **Endpoint**: `GET /api/v1/ready`
- **Purpose**: Verifies that required dependent subsystems (specifically the PostgreSQL database) are connected and accepting queries.
- **Status Codes**:
  - `200 OK` when all critical subsystems respond.
  - `503 Service Unavailable` when any critical subsystem is offline.
- **Response Contract (Healthy)**:
```json
{
  "status": "ready",
  "timestamp": "2026-10-15T01:30:00Z",
  "environment": "development",
  "version": "0.1.0",
  "database": {
    "connected": true,
    "latency_ms": 2.45,
    "error": null
  }
}
```
- **Response Contract (Degraded / Database Offline)**:
```json
{
  "status": "not_ready",
  "timestamp": "2026-10-15T01:30:00Z",
  "environment": "development",
  "version": "0.1.0",
  "database": {
    "connected": false,
    "latency_ms": 15.2,
    "error": "Database connection failed"
  }
}
```

---

## 5. Pagination and Filtering Conventions

For future collection endpoints returning lists:
- `page`: 1-indexed page number (default: 1)
- `page_size`: number of records per page (default: 20, max: 100)
- **Response Envelope**:
```json
{
  "items": [],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

---

## 6. Authentication and Authorization Expectations (Phase 2+)

1. **JWT Bearer Authentication**: Requests carry `Authorization: Bearer <token>`.
2. **Claims Structure**: Tokens encode `sub` (User UUID), `role` (student, verifier, registry_admin, platform_admin), and `tenant_id` (Institution UUID).
3. **Multi-Tenant Authorization**: A user cannot perform actions on resources belonging to a different `tenant_id`.
