# Architecture

## System boundary

The product is a modular monolith: a React/Vite browser application calls one FastAPI API, which owns authorization and persists authoritative state in PostgreSQL. University and payment systems remain behind adapter interfaces and are simulated. The platform is not the source of truth for enrollment and does not treat payment as identity evidence.

```text
Browser (React) -> /api/v1 (FastAPI policies/services) -> SQLAlchemy -> PostgreSQL
                                  |
                                  +-> simulated university/payment adapters
```

The frontend handles presentation, selected institution context, loading/error states, and route usability. It never decides whether access is allowed. The API authenticates the session and scopes every protected query.

## Domain boundaries

- Tenant structure: `Institution`, `Campus`, `Programme`.
- Identity and access: `User`, `Membership`, `AuthSession`.
- Student registry: `Student`, `ProgrammeEnrollment`.
- Credential foundation: `DigitalCredential`, append-only `CredentialEvent`.
- Financial foundation: `FeePolicy`, `Payment`, `RenewalRequest`.
- Integration foundation: `IntegrationConfig`, `SyncRun`.
- Governance: append-only `AuditEvent`.

Externally addressable records use UUIDs. Time values are timezone-aware and generated in UTC. Monetary values use `NUMERIC(14,2)`. Structured event/configuration fields use JSON and must exclude passwords, tokens, API secrets, and unnecessary personal data.

Enrollment is historical rather than a permanent programme field on `Student`. Payment and renewal records remain foundations only; Phase 3 exposes no payment mutation command.

## Tenant isolation

`institution_id` is the partition key. Tenant-bound parents also have composite uniqueness on `(id, institution_id)`, allowing composite foreign keys to prove that child and parent records belong to the same institution. This covers campus/student, student/programme enrollment, student/credential, credential/event, student/payment, student/renewal, and integration/sync relationships.

For an institution request, the authorization dependency:

1. Authenticates the opaque session cookie and active user.
2. Requires `X-Institution-Context` and compares it to the institution UUID in the path.
3. Loads an active membership joined to an active institution.
4. Checks the endpoint's explicit role allow-list.
5. Passes the verified institution UUID to tenant-filtered repository functions.

Client-supplied institution IDs are selectors, never authority. Access is denied by default. A platform administrator can inspect membership configuration but cannot list student records without a separate registry membership. Students have a dedicated own-linked-record read; they cannot use the registry collection endpoint.

## Authentication decision and threat model

Phase 2 uses server-side sessions:

- Passwords are normalized by email and hashed with Argon2id through `argon2-cffi`.
- Login creates a cryptographically random 48-byte URL-safe token.
- The browser gets the token in an HttpOnly, SameSite=Lax cookie. `Secure` is enabled in production.
- PostgreSQL stores only an HMAC-SHA256 token hash, expiry, revocation time, and non-sensitive timestamps.
- Logout marks the session revoked before removing the cookie. `/auth/me` revalidates the session on every request.
- Production rejects the bundled development session secret.
- Exact CORS origins are configured with credentials enabled. Login/logout reject browser `Origin` values outside that set; SameSite=Lax provides an additional CSRF boundary.
- Failed logins receive the same response whether an account is absent, inactive, or has a wrong password.

The current throttle is keyed by client address plus a digest of normalized email and is process-local. It protects the single-process demonstration but is not a multi-instance defense. A shared rate limiter/WAF, proxy-aware client addressing, MFA, password recovery, SSO, security monitoring, key rotation, and session administration remain production work.

## Persistence and migration strategy

One SQLAlchemy session is yielded per request and closed deterministically. Repositories accept an institution UUID for tenant reads. Alembic is the only schema-management mechanism; application startup never calls `create_all()`.

Migration `0002_phase2` is non-destructive for the Phase 1 tenant table: it adds and backfills `slug`, `institution_code`, and `status`, retaining Phase 1 columns as deprecated compatibility storage. Their removal requires a separately reviewed data migration.

Deletion uses `RESTRICT` for identity, credential, and audit references. No API can update or delete credential/audit events. The current synchronous SQLAlchemy layer is acceptable for the demonstration; high-concurrency production work should profile it and either use sync handlers on a validated runtime or adopt SQLAlchemy's async engine.

## Credential lifecycle and eligibility

`CredentialLifecycleService` is the only application interface that changes a credential state. The lifecycle is `active -> suspended -> active`, `active|suspended -> revoked`, and `active -> expired`. Revoked and expired credentials cannot be reinstated. Phase 3 issues directly to `active`; `pending` is retained only as a reserved future approval state.

Issuance locks the student record, evaluates persisted eligibility, checks the replacement policy, allocates a cryptographically random opaque `public_reference`, and writes the credential, `credential.issued` event, and audit record in one transaction. PostgreSQL adds a partial unique index on `(institution_id, student_id)` for `status='active'`, providing a final concurrency guard. A suspended credential must be reinstated or revoked before a new credential can be issued.

The demo policy reference is `enrollment-active-v1`: the institution and programme must be active; the requested student must belong to the institution; and there must be a current active enrollment with a started date and no passed end date. It does not inspect payments. The `CREDENTIAL_VALIDITY_DAYS` environment setting supplies the default expiry period until institution-specific policy configuration is approved.

Validity is always computed as `status == active && utc_now < expires_at`. Therefore an overdue credential cannot become valid because an expiry worker is late. `expire_overdue` locks eligible active rows, marks them expired, and writes a system lifecycle/audit event; repeat runs make no additional changes.

## Phase 4: QR-based verification architecture

QR-based student ID verification enables external verifiers (examiners, library staff,
security officers) to authenticate a student credential against authoritative backend records
without requiring verifiers to possess a student or registry administrative account.

### 1. Cryptographic reference design & entropy
- References are opaque public tokens generated via `secrets.token_urlsafe(24)` (192 bits of cryptographic entropy), formatted as `cr_<token>`.
- The reference is unpredictable, has zero correlation with student IDs, names, or national identifiers, and is indexed with a unique database constraint (`ix_credentials_public_reference`).
- The QR payload encodes ONLY the canonical verification URL (`https://<configured-host>/verify/<public_reference>`). No student PII, status flags, internal UUIDs, or credentials are embedded in the QR matrix.

### 2. Authoritative state resolution & strict precedence
Public verification does not trust any client claims or embedded QR attributes. The verification service queries persisted PostgreSQL state and computes outcome according to strict precedence:
1. `invalid`: Unknown reference, malformed reference, pending credential, or inactive institution.
2. `revoked`: Terminal status; returns `valid: false`.
3. `expired`: Credential stored as expired or UTC clock exceeds `expires_at`; returns `valid: false`.
4. `suspended`: Temporarily blocked by registry administration; returns `valid: false`.
5. `valid`: Persisted active status, UTC unexpired, and issuing institution is active.

### 3. Minimal public disclosure & privacy protection
Public verification disclosures are intentionally minimized to prevent data harvesting:
- Disclosed: status, boolean validity, issuing institution name, student full name (for visual identity matching), programme name, validity dates, and verification timestamp.
- Excluded: student registration numbers, email addresses, dates of birth, internal UUIDs, payment records, and lifecycle event audit logs.
- Invalid requests return a uniform generic message to prevent user enumeration or database discovery.

### 4. Verification events & abuse controls
- Each verification check records a minimal, append-only `VerificationEvent` record.
- Audit records store outcome, timestamps, optional verifier UUID, and minimal sanitized metadata. Raw QR references and full client IP addresses are strictly omitted.
- Logging failures are safely isolated in nested transactions so an audit issue never misreports a verification outcome.
- Public endpoints enforce sliding-window IP rate limiting (`VERIFICATION_RATE_LIMIT_ATTEMPTS`).

## Simulation and production boundary

Seeded institutions and people are fictional, integrations are labelled synthetic, the example fee is inactive/unapproved, and no live payment provider or external university SIS is called. Production requires institutional authorization, privacy/legal review, operational controls, backups, monitoring, secret management, shared distributed throttling (Redis), and penetration testing; none is claimed by this phase.
