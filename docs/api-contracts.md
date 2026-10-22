# API contracts

## Conventions

- Base path: `/api/v1`.
- JSON request/response bodies; ISO 8601 timezone-aware timestamps.
- Tenant paths use institution UUIDs.
- Protected tenant requests require `X-Institution-Context: <institution UUID>` matching the path.
- Collection pagination is 1-indexed with `page` (default 1) and `page_size` (default 20, maximum 100).

Errors use one envelope:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not authorized to perform this action",
    "details": []
  },
  "timestamp": "2026-10-15T04:00:00+00:00"
}
```

Important codes are `VALIDATION_ERROR` (422), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `TENANT_CONTEXT_MISSING` (400), `RESOURCE_NOT_FOUND` (404), `RESOURCE_CONFLICT` (409), `CREDENTIAL_INELIGIBLE` (409), `CREDENTIAL_TRANSITION_INVALID` (409), `RATE_LIMITED` (429), and `DATABASE_UNAVAILABLE` (503).

## Authentication

Authentication uses an HttpOnly cookie. Browser fetch calls must set `credentials: "include"`. The response never exposes the opaque token in JSON.

### `POST /auth/login`

Public. Normalizes the email and verifies the Argon2 hash. Unknown, inactive, and incorrect-password accounts all return the same 401 response.

```json
{ "email": "student@demo.invalid", "password": "development password" }
```

```json
{
  "user": {
    "id": "uuid",
    "email": "student@demo.invalid",
    "full_name": "Synthetic Person",
    "memberships": [
      {
        "id": "uuid",
        "role": "student",
        "status": "active",
        "institution": {
          "id": "uuid",
          "name": "Fictional Institution",
          "slug": "fictional-demo",
          "institution_code": "FI-DEMO",
          "status": "active"
        }
      }
    ]
  }
}
```

### `POST /auth/logout`

Authenticated. Revokes the database session and expires the cookie. Returns `{ "success": true }`.

### `GET /auth/me`

Authenticated. Returns the current active user and active memberships in active institutions. A missing, invalid, revoked, expired, or inactive-user session returns 401.

## Institution reads

| Endpoint | Roles | Notes |
| --- | --- | --- |
| `GET /institutions` | Any authenticated user | Only institutions discoverable through active memberships. |
| `GET /institutions/{id}/memberships` | `registry_admin`, `platform_admin` | Selected institution only. |
| `GET /institutions/{id}/students` | `registry_admin` | Tenant-filtered paginated records. |
| `GET /institutions/{id}/students/me` | `student` | Only the caller's linked record in the selected institution. |
| `GET /institutions/{id}/programmes` | All four roles | Selected active membership required. |
| `GET /institutions/{id}/campuses` | All four roles | Selected active membership required. |

Example paginated response:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 20,
  "total_pages": 0
}
```

Changing the path or header to another institution does not grant access. Platform administration does not imply registry permission. Verifiers currently receive academic-structure data only; the future minimum credential-verification disclosure endpoint is intentionally outside Phase 3.

## Credential lifecycle

All routes below are scoped by both the path institution and matching
`X-Institution-Context` header.

| Endpoint | Roles | Notes |
| --- | --- | --- |
| `GET /institutions/{id}/students/{student_id}` | `registry_admin` | Detail including current credential, enrollment, programme, and campus. |
| `GET /institutions/{id}/students/{student_id}/credential-eligibility` | `registry_admin` | Returns the `enrollment-active-v1` result and reason. |
| `GET /institutions/{id}/students/{student_id}/credentials` | `registry_admin` | Paginated private credential history. |
| `POST /institutions/{id}/students/{student_id}/credentials` | `registry_admin` | Issues one active credential only when eligible and no active/suspended replacement blocker exists. |
| `GET /institutions/{id}/credentials/{credential_id}` | `registry_admin` | Private registry record. |
| `POST /institutions/{id}/credentials/{credential_id}/suspend` | `registry_admin` | Requires a reason of at least three characters. |
| `POST /institutions/{id}/credentials/{credential_id}/reinstate` | `registry_admin` | Requires active eligibility and a non-expired suspended credential. |
| `POST /institutions/{id}/credentials/{credential_id}/revoke` | `registry_admin` | Terminal transition and required reason. |
| `GET /institutions/{id}/credentials/{credential_id}/events` | `registry_admin` | Paginated lifecycle history including actor UUID/system and reason. |
| `POST /institutions/{id}/credentials/expire-overdue` | `registry_admin` | Idempotently materializes expiry for that institution. |
| `GET /institutions/{id}/students/me/credential` | `student` | The caller's own linked profile and current credential only. |

Credential write responses omit audit metadata and other private implementation
fields. A credential is valid only when stored as `active` and its UTC expiry
time is still in the future; the expiry processor is not a validity authority.

## Public verification (Phase 4)

Public verification allows external verifiers and university staff to verify a
student ID card by resolving the opaque reference embedded in its QR payload.

### `GET /public/verify/{opaque_reference}`

Public. Does not require login credentials or tenant context headers.
Enforces strict sliding-window rate limiting by client IP and disables HTTP caching
via `Cache-Control: no-store, no-cache, must-revalidate, private` and `Pragma: no-cache`.

Minimal disclosure schema:

```json
{
  "status": "valid",
  "valid": true,
  "institution_name": "Fictional Institution",
  "student_display_name": "Student Full Name",
  "programme_name": "Academic Programme",
  "issued_at": "2026-10-15T00:00:00+00:00",
  "expires_at": "2027-10-15T00:00:00+00:00",
  "verified_at": "2026-10-15T12:00:00+00:00",
  "message": "Credential is valid and currently active."
}
```

Precedence policy:
1. `invalid`: Unknown or malformed reference, pending credential, or inactive institution. Discloses NO details (`null`).
2. `revoked`: Terminal status; returns `valid: false`. Revocation reason is strictly private.
3. `expired`: UTC clock exceeds `expires_at` or status is expired; returns `valid: false`.
4. `suspended`: Suspended by registry administration; returns `valid: false`. Suspension reason is strictly private.
5. `valid`: Persisted active status, UTC unexpired, and active institution.

Audit logging:
Every completed verification writes a minimal audit record to `verification_events`.
Raw QR references, full IP addresses, and personal details are strictly excluded from audit logs.

### `GET /institutions/{id}/credentials/{credential_id}/qr`

Registry administration only (`registry_admin`). Returns the canonical verification URL
and standalone SVG data URI for administrative card printing or QR inspection.

## Monitoring

- `GET /health`: process liveness, version, environment, and simulation flag.
- `GET /ready`: database connectivity and latency; returns 503 when PostgreSQL is unavailable.

Credential lifecycle changes are append-only event and audit writes; there are
no update/delete routes for credentials, credential events, payments,
integrations, audit events, or verification events.
