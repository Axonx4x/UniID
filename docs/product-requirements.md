# AstraMind Digital Student ID: Product Requirements Document (PRD)

## 1. Product Purpose

AstraMind Digital Student ID is a multi-tenant digital student identity, lifecycle management, and credential verification platform for higher education institutions in Malawi.

### Primary Objectives:
1. **Student Accessibility**: Provide students with an instantly accessible digital ID card on mobile devices, viewable even when offline on campus.
2. **Instant On-Campus Verification**: Enable university security officers, librarians, and exam invigilators to verify student validity in seconds via QR code scanning.
3. **Registry Governance**: Provide university registrars with authoritative control to issue, suspend, renew, or revoke student credentials with real-time propagation.
4. **Cost Reduction**: Minimize plastic ID card printing, lost card replacement logistics, and administrative delays.

---

## 2. Target User Roles

| Role | Description | Primary Workflows |
| :--- | :--- | :--- |
| **Student** | Enrolled university attendee. | Signs in, views digital ID card, opens full-screen QR code, checks validity & expiry, initiates simulated fee renewal. |
| **Verifier** | Campus security, exam supervisor, library staff. | Scans QR code with camera or enters credential reference; reviews clear Active/Expired/Revoked result. |
| **Registry Administrator** | Academic registrar or student affairs officer. | Searches student records, verifies eligibility against SIS, issues cards, suspends/revokes IDs, reviews audit history. |
| **Platform Administrator** | AstraMind platform operations engineer. | Manages institution tenants, monitors adapter health, inspects system readiness and global statistics. |

---

## 3. Core Modules

### A. Student Portal
- Card interface displaying authorized photo, student full name, registration number, academic programme, study level/year, and expiration date.
- Dynamic QR code view with toggle for full-screen display.
- Offline display support via client-side caching.

### B. Verifier Interface
- Rapid scanning interface optimized for low-bandwidth campus conditions.
- Authoritative verification result states:
  - **VALID / ACTIVE**: Student is actively enrolled and credential is valid.
  - **REVOKED**: Credential has been revoked by registry (e.g., disciplinary suspension, withdrawal).
  - **EXPIRED**: Credential has surpassed valid date without annual renewal.
  - **UNKNOWN / INVALID**: QR reference not recognized by tenant.

### C. Registry Dashboard
- Student search by registration number, name, or programme.
- Credential issuance action for eligible students.
- Revocation and suspension workflows with required audit reason.
- Historical log of administrative events with explicit UTC timestamps.

### D. Payment and Renewal Module
- Clear presentation of annual digital ID service fee in Malawian Kwacha (MWK).
- Transaction reference and receipt display.
- **Strict Constraint**: Payment is separated from academic eligibility.

### E. Platform Administration
- Institution configuration (name, code, campus, primary/accent brand colors).
- Integration adapter status monitoring.

---

## 4. Credential Lifecycle Model

```
                    +--------------------+
                    |  Eligible Record   |
                    |  (SIS Synchronized)|
                    +---------+----------+
                              |
                     [Issue Credential]
                              |
                              v
     +-----------------> +----------+
     |                   |  ACTIVE  | <-------------------+
     |                   +----+-----+                     |
     |                        |                           |
[Re-activate]         [Suspend / Revoke]             [Annual Renewal]
     |                        |                           |
     |                        v                           |
     |               +------------------+                 |
     +-------------- |    SUSPENDED     |                 |
                     +--------+---------+                 |
                              |                           |
                     [Permanent Revocation]        [Payment Confirmed]
                              |                           |
                              v                           |
                     +------------------+        +--------+--------+
                     |     REVOKED      |        |     EXPIRED     |
                     +------------------+        +-----------------+
```

### Invariants:
1. A credential cannot be issued unless the university SIS reports an active enrollment status.
2. A revoked credential can never be silently re-validated without an explicit registry audit action.
3. An expired credential ceases to verify as valid regardless of payment status until re-authorized.

---

## 5. Payment and Eligibility Separation

A critical governance requirement for Malawian universities:

> **Fundamental Rule**: Payment of a student ID service fee is NOT proof of enrollment, identity, or academic good standing.

- An individual who pays a fee but is disqualified or suspended by the university registrar must NOT be granted an active credential.
- Academic status derives solely from the institution's official registrar data source.
- In simulated demonstration mode, payments are visibly marked as illustrative and no real currency is processed.

---

## 6. Verification and Privacy Requirements

1. **No Plaintext PII in QR Codes**: The QR code must not encode sensitive student details (e.g., national ID, phone number) in plaintext. It must encode an opaque, signed credential reference.
2. **Minimal Disclosure on Verification**: When scanned, the verifier sees only information necessary for identity assertion: photo, name, student ID, programme, and active status.
3. **Tamper Detection**: Altering the QR payload must cause immediate verification failure.

---

## 7. Explicit Demonstration Limitations

To maintain institutional trust, the following boundaries are enforced:
1. **Synthetic Data**: All student records, registration numbers (e.g. `LCC/2024/0101`), and photos in the demo are fictional.
2. **No Claim of Official Endorsement**: The demonstration must never claim that LUANAR, KUHeS, MUST, MZUNI or any other institution has formally adopted the platform.
3. **No Financial Claims**: The annual fee (e.g. MWK 15,000) is shown as an illustrative example subject to university policy and Students' Union consultation.
4. **Simulation Labeling**: All simulation screens, receipts, and adapters are explicitly labelled with the `SIMULATION MODE` indicator.
