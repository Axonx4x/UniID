# Phase 3 demonstration script

## Preparation

All data and accounts are synthetic.

```bash
make db-up
make db-migrate
make db-seed
make dev-api
make dev-web
```

Confirm the simulation banner and `/api/v1/ready` before opening the web app.

## Walkthrough

1. Sign in as `registry@demo.invalid`, choose Northstar Institute of Applied
   Learning, and open **Registry lifecycle**. Explain that the server checks the
   cookie session, active membership, path institution, context header, and role
   before returning registry records.
2. Search for `DEMO/2026/002`. Its active enrollment and programme make it
   eligible. Issue the credential. Show the active state, opaque public
   reference, timestamps, event history, and actor. Explain that the backend
   wrote the credential, credential event, and audit event atomically.
3. Suspend the new credential with a reason, then reinstate it with a reason.
   Explain that the credential cannot be reinstated after expiry, and that
   revocation is terminal. Optionally revoke it to show the terminal state and
   the required reason.
4. Search for the seeded suspended and revoked examples. Their status prevents
   any misleading “valid” presentation; a suspended credential blocks
   replacement until it is resolved.
5. Log out and sign in as `student@demo.invalid`. Select Northstar and open
   **My credential**. Show that the student sees only the account-linked
   profile and current credential. The card is a controlled display; it has no
   QR code or public-verification claim.
6. Log in as `platform@demo.invalid` or `verifier@demo.invalid`. Explain
   that neither role obtains registry lifecycle access by changing a URL or
   institution header.

## Claims and boundaries

- Eligibility is the documented demo rule `enrollment-active-v1`: same active
  institution, active programme, and current active enrollment. Payments do
  not make a student eligible.
- A credential is authoritative only while `active` and before its UTC
  expiry. The expiry endpoint merely materializes that authoritative result and
  is safe to run repeatedly.
- Verification claims reflect authoritative persisted state; scanning the QR code
  locates the credential for verification but does not constitute standalone proof.
- No live university SIS integration, production payment processing, or external
  accreditation is claimed. All accounts and entities are fictional simulation fixtures.

## Phase 4: QR-based digital student ID verification walkthrough

This end-to-end walkthrough demonstrates cryptographically secure, real-time QR verification
reflecting backend credential lifecycle transitions. All accounts and university names are synthetic demo fixtures.

### Step 1: Log in as registry administrator
1. Navigate to `http://localhost:5173/login`.
2. Sign in as `registry@demo.invalid` with password `development password`.
3. Select **Northstar Institute of Applied Learning** (or fictional demo institution).

### Step 2: Issue an eligible student credential
1. Open the **Registry lifecycle** console (`/app/registry`).
2. Search for student `DEMO/2026/002` (or select any eligible student with an active enrollment).
3. If no credential exists, click **Issue credential**.
4. Confirm issuance: a new opaque reference (e.g., `cr_...` with 192 bits of entropy) is generated.

### Step 3: Open student digital ID card & display QR code
1. Log out or open an incognito/guest window and sign in as `student@demo.invalid` (`development password`).
2. Select Northstar and open **My Digital Student ID** (`/app/credential`).
3. View the student ID card rendered with university branding, student full name, student number, programme, campus, and validity dates.
4. Observe the dynamic QR code generated directly from the backend-issued opaque reference pointing to the canonical verification base URL: `http://localhost:5173/verify/{opaque_reference}`.

### Step 4 & 5: Open verification URL / scan QR code — Valid result
1. Click **Verify Current Status** or copy the verification URL and open it in a guest/unauthenticated window: `http://localhost:5173/verify/{opaque_reference}`.
2. Observe the authoritative result panel:
   - Green status badge: `Status: VALID & ACTIVE`.
   - Accessible heading: **Authentic Student ID — Valid**.
   - Verified timestamp recorded.
   - Disclosed details: Issuing University (`Northstar Institute of Applied Learning`), Student Full Name, and Enrolled Programme.
   - Privacy guarantee: Student number, internal UUIDs, DoB, and administrative audit history are **strictly omitted**.

### Step 6 & 7: Suspend credential — Verification immediately reflects suspension
1. Return to the Registry console as `registry@demo.invalid`.
2. Locate the credential and click **Suspend**, entering reason `"Pending library fine reconciliation"`.
3. Refresh or re-verify the **exact same QR verification URL** in the public verifier window.
4. Observe the immediate updated outcome:
   - Amber status badge: `Status: SUSPENDED`.
   - Heading: **Credential Temporarily Suspended**.
   - Message: Credential is temporarily suspended by the institution.
   - Machine-readable status: `valid: false`.
   - Notice: Suspension reason remains private and is never disclosed to public verifiers.

### Step 8: Reinstate credential — Verification returns to valid
1. In the Registry console, click **Reinstate**, entering reason `"Library account cleared"`.
2. Re-verify the **exact same QR verification URL**.
3. Observe the result immediately reverts to **Authentic Student ID — Valid** (`valid: true`).

### Step 9 & 10: Revoke credential — Permanent terminal state
1. In the Registry console, click **Revoke**, entering reason `"Student transferred to another institution"`.
2. Re-verify the **exact same QR verification URL**.
3. Observe the updated outcome:
   - Red status badge: `Status: REVOKED`.
   - Heading: **Credential Revoked — Inactive**.
   - Machine-readable status: `valid: false`.
4. Attempt to reinstate or re-verify: the credential **never becomes valid again**; revocation is strictly permanent and terminal.

### Step 11: Test unknown reference & expired credential
1. On the public verification page (`http://localhost:5173/verify`), enter a random or unknown reference: `cr_fraudulent_reference_999`.
2. Click **Verify ID**:
   - Result: `Status: INVALID`, `valid: false`.
   - Message: "Verification reference is invalid or unknown."
   - No database lookup details or internal hints are revealed.
3. Verify an expired credential (or query an overdue credential):
   - Result: `Status: EXPIRED`, `valid: false`.
   - The authoritative UTC clock immediately enforces expiration even if a background sweep is pending.

### Step 12: Confirm public page privacy & registry security
1. Confirm that `GET /api/v1/public/verify/{ref}` contains no internal database IDs, student numbers, dates of birth, emails, or event logs.
2. Confirm that public verification endpoints cannot access registry administration functions (`/api/v1/institutions/{id}/...` returns `401 Unauthorized` without credentials).
3. Observe that public verification attempts create audit records in `verification_events` with sanitized metadata (no raw references, no full IP addresses), completely decoupled from credential lifecycle events.

## Student Onboarding & Institutional Verification Walkthrough

Demonstrate the two official student onboarding pathways and institutional roster management.

### Pathway A: Automated API Verification (e.g. Northstar Institute)
1. Navigate to `/onboarding`.
2. Select **Northstar Institute of Advanced Learning** from the institution dropdown.
3. Observe real-time institutional domain feedback confirming `@student.northstar.invalid`.
4. Enter student email: `nsial-demo@student.northstar.invalid`, full name: `Alex Rivera`, and set a password. Click **Continue to Verification**.
5. Step 2 opens with a 6-digit OTP code prompt and 60-second resend cooldown timer.
6. Click the dev mailbox assistant button to autofill the active verification code.
7. Click **Verify & Activate Account**.
8. System executes `SimulatedUniversityAdapter` check, discovers the active matching student record, and **automatically approves** the student account.
9. System transitions directly to active student state and credential issuance.

### Pathway B: Institutional Records & Review (e.g. Lakeside University)
1. In the Registry Console (`/app/registry`), sign in as `lakeside.registry@uniid.invalid`.
2. Open the **Roster Import** tab:
   - Paste or upload a valid student CSV with columns `student_number, email, full_name, campus_code, programme_code, is_eligible`.
   - Click **Preview Roster**: observe the metric cards (Total, New Students, Updates, Unchanged).
   - Toggle **Authoritative Snapshot** and click **Commit Roster Import** to update institutional records transactionally.
3. Open an incognito/guest browser and navigate to `/onboarding`.
4. Select **Lakeside University** (configured for `file_and_review`).
5. Register with `student@student.lakeside.invalid`, provide student number and name, and submit.
6. On Step 2, enter the 6-digit OTP code.
7. Verification succeeds against the imported roster and routes the application to staff review.
8. Student is redirected to the **Restricted Pending Dashboard** (`/pending/:reference`):
   - Notice: **Strictly no valid student ID card, QR code, or barcode is displayed**.
   - Displays reference copy, application status pill (`UNDER REVIEW`), timeline, and contact information.
9. Return to the Registry Console as `lakeside.registry@uniid.invalid` and select the **Verification Queue** tab:
   - Search for the reference or filter by `verification_pending`.
   - Click **Review Application**: inspect student details and matched roster record.
   - Click **Approve Application**: status immediately updates to `approved`, linking the student record and granting full platform access.

