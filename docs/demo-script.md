# AstraMind Digital Student ID: Demonstration Script & Walkthrough

## 1. Demonstration Purpose

This script details the step-by-step presentation narrative for university executives, registrars, and IT directors.
The goal is to demonstrate that AstraMind is an authoritative, secure identity and verification layer that fits seamlessly into their institution's existing ecosystem without replacing their Student Information System.

---

## 2. Demonstration Personas

| Persona Name | Institution & Role | Scenario Narrative |
| :--- | :--- | :--- |
| **Chikondi Phiri** | LUANAR City Campus &bull; Student (Active) | Enrolled in BSc Agribusiness Management. Displays digital student card and presents QR code for campus access. |
| **Tamanda Banda** | LUANAR City Campus &bull; Student (Active) | Enrolled in BSc Food Science & Technology. Demonstrates card renewal workflow and receipt inspection. |
| **Kondwani Mtambo** | LUANAR City Campus &bull; Student (Suspended) | Diploma in Agriculture. Demonstrates system handling of a student ineligible for credential issuance. |
| **Officer Mwale** | Campus Security / Verifier | Stationed at library or examination hall. Scans cards to grant or deny access. |
| **Registrar Banda** | Academic Registrar / Registry Admin | Oversees student eligibility, issues new credentials, and revokes credentials upon disciplinary action. |

---

## 3. The Core Golden Scenario: Valid-to-Revoked Lifecycle

This 6-step walkthrough proves that the platform manages identity throughout its complete lifecycle:

### Step 1: Student Record Reception (University System of Record)
- **Presenter Action**: Open the Registry interface. Show fictional student **Chikondi Phiri** (`LCC/2024/0101`).
- **Narrative**: *"AstraMind does not decide who is a student. We synchronize eligibility directly from the university's authorized registrar records via our integration adapter."*

### Step 2: Simulated Annual Card Service Fee
- **Presenter Action**: Show the simulated payment step. Complete simulated payment (e.g. MWK 15,000).
- **Narrative**: *"Students can settle the annual card fee via mobile money or institutional fee collection. Note that paying the fee does not establish identity—eligibility remains strictly tied to academic status."*

### Step 3: Digital Credential Issuance
- **Presenter Action**: Registrar clicks **Issue Credential**. The platform generates a unique credential reference and signed QR code.
- **Narrative**: *"The registry issues an authorized digital credential with university branding and an explicit UTC expiry timestamp."*

### Step 4: Verification of Active Credential
- **Presenter Action**: Switch to the **Verifier Interface**. Scan Chikondi's QR code.
- **Result**: Immediate green **VALID / ACTIVE** confirmation displaying photo, name, registration number, and programme.
- **Narrative**: *"Campus security or exam invigilators verify the card in real-time. Notice that only necessary details appear—no sensitive personal information is leaked."*

### Step 5: Academic or Disciplinary Status Change (Revocation)
- **Presenter Action**: Switch back to Registry. Registrar selects Chikondi's credential, enters audit reason: *"Administrative Suspension - Academic Misconduct Pending Review"*, and clicks **Revoke**.
- **Result**: Credential status changes to **REVOKED** in the audit ledger.
- **Narrative**: *"When an administrative decision occurs, the change is instant and permanently recorded in the audit log."*

### Step 6: Second Verification Attempt (Instant Rejection)
- **Presenter Action**: Switch to Verifier Interface. Re-scan Chikondi's QR code.
- **Result**: Striking red **REVOKED** banner with timestamp and advisory to report to the Academic Registrar.
- **Narrative**: *"The credential is immediately invalid across campus. Physical plastic cards cannot do this without confiscation."*

---

## 4. Features that Remain Simulated

During this demonstration, clearly acknowledge the simulation boundaries:
1. **University Adapter**: Uses `SimulatedUniversityAdapter` fixtures. An actual production deployment connects directly to the university's database or SARIS API.
2. **Payment Processing**: Uses `SimulatedPaymentAdapter` to simulate mobile money receipts. Real payment flows will integrate with Malawian aggregators.
3. **Institutional Approvals**: Highlight that fees, policies, and rollout timelines are subject to formal agreement with university leadership and the Students' Union.
