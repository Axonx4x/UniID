# Product requirements

## Purpose and governing rules

AstraMind Digital Student ID is a proposed multi-tenant identity and verification layer for higher education. An authorized institution—not a payment or the platform alone—determines enrollment and eligibility.

1. Every institution is a separate tenant.
2. Student, enrollment, credential, payment, and operational records are institution-scoped.
3. Payment never proves identity, enrollment, or eligibility.
4. Verification will consult backend rules and disclose only what is necessary.
5. QR payload design must not expose student personal data.
6. Credential and privileged changes require append-only history.
7. Demonstration data is synthetic and does not imply adoption.

## Phase 3 roles

| Role | Phase 3 capability | Explicit boundary |
| --- | --- | --- |
| Student | Authenticate, choose an authorized institution, and view only the account-linked profile and current credential. | No other students, QR, verification, renewal, or lifecycle actions. |
| Verifier | Authenticate and view academic structure for an authorized institution. | No student list or general personal data; verification results arrive in a later phase. |
| Registry administrator | View students, eligibility, credentials, and lifecycle history; issue, suspend, reinstate, revoke, and materialize expiry in the selected institution. | Cannot cross institutions by changing a URL/header; reasons and history are required for lifecycle actions. |
| Platform administrator | View discoverable institutions, academic structure, and membership configuration. | Does not inherit registry access to student personal data. |

A user may hold different roles at different institutions. Each institution has one active/inactive membership per user, and the server validates the selected context on each request. The UI cannot grant or switch roles; it only selects among server-returned memberships.

## Phase 3 domain requirements

- Institutions own campuses and programmes with institution-local unique codes.
- Emails are normalized and globally unique; passwords are never stored in plaintext.
- Student numbers are unique within an institution and may repeat across institutions.
- A student may be linked to one user per institution; date of birth is omitted because this demo has no justified use for it.
- Programme enrollments preserve academic history with pending, active, completed, suspended, and withdrawn states.
- A registry administrator may issue an active credential only for a student with an active current enrollment in an active programme at the active institution.
- A credential is valid only while its persisted state is `active` and its UTC expiry is in the future. Payment never contributes to eligibility.
- Issuance, transitions, lifecycle events, and audit records are one transaction. One active credential per student is enforced by the database; a suspended credential is a replacement blocker until reinstated or revoked.
- Suspension, reinstatement, and revocation require a non-empty documented reason. Revocation and expiry are terminal.
- Registry actions and the student's own credential view return intentionally limited schemas; no QR or verifier disclosure is implemented.
- Monetary values use fixed-precision decimals.
- Integration configuration stores non-secret values or secret references, never credentials.
- Credential and audit events have no mutation endpoints.

## Authentication requirements

- Backend verification with Argon2 password hashes.
- Revocable, expiring sessions stored server-side and transported in protected cookies.
- Current-user and logout behavior sourced from the API, not browser booleans.
- Uniform invalid-login errors, no secret/token logging, strict credentialed CORS origins, and unsafe-auth origin checks.
- Development credentials appear only in the development seed/readme and the seed refuses production.

## Deferred product modules

The following are not Phase 3 acceptance targets: QR payloads or scanning, public verification-result disclosures, live SIS sync, real payment initiation, account linking, self-service role changes, full tenant CRUD, SSO, offline cards, and an institution-approved policy engine. The student card is a controlled authenticated display, not a bearer credential.

Any illustrative fee is inactive and unapproved. Any integration configuration is marked synthetic and has no live credentials. Production deployment additionally requires institutional agreements, privacy/legal assessment, security hardening, operational monitoring, incident response, backups, accessibility validation, and user research.
