# AstraMind Digital Student ID

A multi-tenant digital student identity foundation for higher-education demonstrations. The repository is in **Phase 3: digital credential lifecycle and issuance**. All bundled people, institutions, fees, and integration records are synthetic.

## Implemented scope

- React 18, TypeScript, Vite, React Router, reusable UI components, and a responsive simulation-mode interface.
- FastAPI under `/api/v1`, PostgreSQL, SQLAlchemy 2, and sequential Alembic migrations.
- Health and database-readiness probes.
- Phase 2 domain tables for institutions, campuses, programmes, users, memberships, students, enrollment history, credentials/events, fees/payments, renewals, integrations/sync runs, and audit events.
- Centralized credential lifecycle service with enrollment-based eligibility, issuance, suspension, reinstatement, revocation, authoritative expiry checks, and idempotent expiry processing.
- Transactional credential, lifecycle-event, and audit-event persistence with UUIDs, opaque public references, and a database constraint preventing concurrent active credentials per student.
- Registry lifecycle UI, student credential page, opaque-reference QR generation/scanning, and public verification with authoritative revocation status.
- Argon2 password hashing and opaque, revocable server-side sessions in HttpOnly cookies.
- Deny-by-default role and institution authorization with an explicit `X-Institution-Context` header.
- Backend-authenticated frontend session state, protected routes, role-aware navigation, institution selection, and logout.
- Student onboarding with institution-domain validation, short-lived single-use email OTP challenges, resend cooldowns, attempt limits, automated simulated-SIS checks, roster/staff-review routing, and a verified-account handoff to the student dashboard.
- Deterministic, idempotent, production-blocked synthetic seed data.
- Automated authentication, authorization, tenant-integrity, seed, health, lint, type, and build checks.

Not implemented: real payments, password recovery, SSO/MFA, or live university integrations.

## Prerequisites

- Python 3.11–3.13
- Node.js 18+
- Docker with Docker Compose
- Git

## Local setup

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
make install
make db-up
make db-migrate
make db-seed
```

Start the services in separate terminals:

```bash
make dev-api
make dev-web
```

- Web: <http://localhost:5173>
- API docs: <http://localhost:8000/api/v1/docs>
- Health: <http://localhost:8000/api/v1/health>
- Readiness: <http://localhost:8000/api/v1/ready>

PostgreSQL uses host port `5433` by default. `make db-seed` can be run repeatedly without duplicating records and refuses to run when `ENVIRONMENT=production`.

## LUANAR presenter environment

The optional LUANAR walkthrough uses only synthetic data and is disabled by default. Set `UNIID_DEMO_MODE=true` in `.env`, then run the normal migration/seed sequence followed by `make demo-seed`. Restart the API after changing the setting. The API health response is the authoritative source for this setting; when it is active, every web route displays `DEMO ENVIRONMENT · Simulated institutional data`.

The seed creates a stable 200-record roster with the reserved domain `students.luanar.test`. The reviewer can download the same import-ready CSV from **Staff → Imports**, or use the validation scenario endpoint with `?validation_cases=true`; that variant adds a duplicate, a missing required name, and an invalid email for the preview screen without changing persisted data.

Use these synthetic accounts after seeding:

| Role | Email | Password |
| --- | --- | --- |
| LUANAR reviewer | `luanar.registry@demo.invalid` | `LuanarRegistry!2026` |
| LUANAR seeded student | `luanar.student@demo.invalid` | `LuanarStudent!2026` |

For a fresh onboarding demonstration, register `student0001@students.luanar.test` as **Tione Kamanga** with registration number `LUA-DEMO-2026-0001`. The simulated mailbox autofill remains intentionally development-only. The roster adapter requires an exact number, email, and name match; unknown, mismatched, duplicate, and ineligible cases are routed to the existing reviewer queue. In this mode a credential is issued only after the student uploads a JPEG, PNG, or WebP image (maximum 5 MB).

See [LUANAR demo runbook](docs/luanar-demo.md) for the presenter sequence and implementation map.

## Synthetic development accounts

These accounts exist only after `make db-seed` and must never be enabled as production credentials.

| Role | Email | Password |
| --- | --- | --- |
| Student | `student@demo.invalid` | `DemoStudent!2026` |
| Verifier | `verifier@demo.invalid` | `DemoVerifier!2026` |
| Registry administrator | `registry@demo.invalid` | `DemoRegistry!2026` |
| Platform administrator | `platform@demo.invalid` | `DemoPlatform!2026` |
| Multi-institution roles | `multi.role@demo.invalid` | `DemoMultiRole!2026` |

Northstar Institute of Applied Learning and Lakeside Technical College are fictional demonstration tenants. University of Livingstonia (UNILIA) is also present as a directory/onboarding demonstration tenant, using its public logo only for visual identification; this does not imply endorsement, affiliation, live data access, or an institutional integration. Northstar includes: an active student credential, an eligible student with no credential (issuance demo), an ineligible enrollment, a suspended credential, and a revoked credential. The illustrative fee is inactive and explicitly labelled as unapproved.

## Onboarding walkthrough

After starting both services, open `/onboarding`. The default UNILIA test path uses `cen-01-41-23@unilia.ac.mw` and registration number `cen-01-41-23`; use any name and a password of at least eight characters. The local simulated mailbox displays the six-digit OTP and can autofill it. Successful automated verification creates the student membership and credential, then the **Continue to Dashboard** action signs the student in. The corresponding synthetic registry account is `unilia.registry@demo.invalid` with password `DemoUniliaRegistry!2026`.

OTP challenges are stored only as keyed hashes, expire after ten minutes, are single use, enforce a resend cooldown and lock after failed attempts. Local development uses an explicitly simulated mailbox and displays its code only when `OTP_DELIVERY_MODE=development` and `OTP_DEV_MAILBOX_ENABLED=true`. SMTP delivery remains available by setting `OTP_DELIVERY_MODE=smtp` and providing the SMTP values in `.env`.

## Verification commands

```bash
make test-api
make lint-web
make typecheck-web
make build-web
make test
```

To verify the database directly:

```bash
make db-migrate
make db-seed
curl http://localhost:8000/api/v1/ready
```

## Environment variables

| Variable | Purpose | Development default |
| --- | --- | --- |
| `ENVIRONMENT` | `development`, `testing`, `staging`, or `production` | `development` |
| `SIMULATION_MODE` | Labels simulated behavior | `true` |
| `UNIID_DEMO_MODE` | Opt-in, server-controlled LUANAR synthetic presenter environment; rejected in production | `false` |
| `DATABASE_URL` | SQLAlchemy PostgreSQL URL | local port 5433 URL |
| `BACKEND_CORS_ORIGINS` | Exact browser origins allowed with credentials | local Vite/API origins |
| `SESSION_SECRET` | HMAC key for stored session-token hashes; minimum 32 characters | development-only value |
| `SESSION_COOKIE_NAME` | HttpOnly cookie name | `astramind_session` |
| `SESSION_TTL_MINUTES` | Absolute session duration | `480` |
| `LOGIN_RATE_LIMIT_ATTEMPTS` | Failed attempts allowed per process/window | `5` |
| `LOGIN_RATE_LIMIT_WINDOW_SECONDS` | Throttle window | `300` |
| `CREDENTIAL_VALIDITY_DAYS` | Demo default validity period for newly issued credentials | `365` |
| `VITE_API_BASE_URL` | Browser API base URL | `http://localhost:8000/api/v1` |

Production startup rejects the bundled development `SESSION_SECRET`. See [.env.example](.env.example) for the complete database and application configuration.

## Security and tenancy notes

- The browser receives only an opaque token; only its keyed hash is stored in `auth_sessions`.
- Cookies are HttpOnly and SameSite=Lax, and become Secure in production. Unsafe auth requests reject untrusted browser origins.
- Every institution route compares the path UUID with `X-Institution-Context`, then verifies an active user, unexpired session, active institution, active membership, and permitted role.
- Platform administrators do not inherit registry access to student records.
- Composite foreign keys enforce campus, programme, enrollment, credential, payment, renewal, and integration tenant consistency.
- Credential eligibility requires the same active institution, student, active programme, and active current enrollment; payments are never consulted.
- Registry lifecycle actions update status and append credential/audit history in the same database transaction. Revocation is terminal; an expired credential is invalid based on UTC time even before a worker materializes its stored status.
- Replacement policy: a student may not receive another active credential, and a suspended credential must be reinstated or revoked before a replacement can be issued.
- Phase 1 institution columns are retained as deprecated compatibility storage by the non-destructive Phase 2 migration.

Known limitations: the eligibility policy is a documented demo default (`active` current enrollment in an active programme), not an institution-approved rule engine; login throttling is process-local; there is no session-management UI, MFA, recovery, SSO, or automated scheduled worker; synchronous SQLAlchemy access is suitable for the demonstration but should be profiled or moved to an async data layer before high-concurrency deployment. This repository does not claim production certification, statutory compliance, or institutional adoption.

## Documentation

- [Architecture](docs/architecture.md)
- [Product requirements](docs/product-requirements.md)
- [API contracts](docs/api-contracts.md)
- [Demonstration script](docs/demo-script.md)
- [LUANAR demo runbook](docs/luanar-demo.md)
