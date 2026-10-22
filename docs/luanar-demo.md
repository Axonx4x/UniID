# LUANAR synthetic demo runbook

## Safety boundary

This environment contains generated people, enrolments, emails, programmes,
campuses, and credentials only. It does not connect to LUANAR or any live SIS,
and its `students.luanar.test` email domain is reserved for testing. The mode is
off by default, controlled only by `UNIID_DEMO_MODE`, exposed by `/health`, and
rejected when `ENVIRONMENT=production`.

## Start a repeatable presenter environment

1. Copy `.env.example` to `.env`, set `UNIID_DEMO_MODE=true`, then start the database.
2. Run `make db-migrate` and `make demo-seed`.
3. Start `make dev-api` and `make dev-web` in separate terminals.
4. Check `http://localhost:8000/api/v1/health`: `uniid_demo_mode` must be `true`.

The seed is idempotent and uses deterministic IDs. It does not reset a database.
For a completely fresh local volume, the operator must explicitly choose the
destructive Docker-volume reset themselves before migrating and seeding again.

## Presenter sequence

1. Sign in as `luanar.registry@demo.invalid` / `LuanarRegistry!2026`. The reviewer dashboard, activity feed, and counters are populated from tenant-scoped PostgreSQL records; they do not use frontend sample rows.
2. Download **LUANAR Demo CSV**, upload it through the existing import wizard,
   confirm the suggested mapping, inspect the preview and commit it. Every step
   persists its import/reconciliation and audit information.
   The **Student Records** tab immediately displays imported roster evidence,
   including students who do not yet have an application or account. The **Add
   Student Record** wizard is the separate, audited path for authorized manual
   entries; it does not create a credential or bypass onboarding.
3. Sign out and open **Onboarding**. Register `student0001@students.luanar.test`,
   `Tione Kamanga`, and `LUA-DEMO-2026-0001`; use any compliant demo password.
4. Use the clearly labelled simulated-mailbox autofill to verify the OTP. Exact
   roster matches complete automated verification; mismatches and non-active
   fixtures deliberately appear in the reviewer queue instead.
5. Sign in as the new student, upload a small JPEG, PNG, or WebP portrait from
   the student portal. Backend checks the magic bytes and a 5 MB limit, stores
   the file privately, records the audit event, and issues the first credential.
6. Open the digital ID/QR presentation page or public verification screen and
   scan/paste the QR URL. The response is based on the persisted opaque
   credential reference, not a client-side card flag.
7. As the reviewer, revoke that credential using the existing lifecycle action.
   Re-scan the same QR URL: it returns `revoked` immediately and verification
   logging records the event.
8. Refresh the reviewer and student pages. The roster, request, photo reference,
   credential, lifecycle events, and audit records come back from PostgreSQL.

## Fixture and workflow map

| Need | Existing or added implementation |
| --- | --- |
| Deterministic 200-record source and generated CSV | `apps/api/app/services/luanar_demo.py` |
| Persistent fixture import | `scripts/seed_demo_tenant.py` under `UNIID_DEMO_MODE` |
| Server-authoritative mode | `app/core/config.py` and `/api/v1/health` |
| Reviewer import, mapping, preview, commit, audit | `app/services/import_pipeline.py`, `/api/v1/staff/imports*` |
| Download within reviewer console | `/api/v1/staff/demo/luanar-roster.csv` and Staff Imports page |
| Exact roster-backed onboarding lookup | `app/services/onboarding.py` |
| OTP, review queue, photo upload, student portal | existing onboarding and student endpoints |
| QR verification and lifecycle states | existing credential/verification endpoints and QR scanner UI |

`GET /api/v1/staff/demo/luanar-roster.csv?validation_cases=true` is intentionally
available only to a signed-in LUANAR reviewer while demo mode is active. It
adds validation-only rows; the normal download and seed each contain 200 valid
fixture records.
