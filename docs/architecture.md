# AstraMind Digital Student ID: System Architecture

## 1. System Boundaries and Overview

AstraMind Digital Student ID is a multi-tenant digital student identity, lifecycle management, and credential verification platform for higher education institutions in Malawi.

```
+-----------------------------------------------------------------------------------------+
|                                    Client Layer                                         |
|                                                                                         |
|   +-----------------------+   +-----------------------+   +-------------------------+   |
|   | Student Web App / PWA |   | Security / Verifier   |   | Registry Admin Portal   |   |
|   | (Offline Card & QR)   |   | (QR Scanner & Check)  |   | (Issue, Revoke, Audit)  |   |
|   +-----------+-----------+   +-----------+-----------+   +------------+------------+   |
|               |                           |                            |                |
+---------------|---------------------------|----------------------------|----------------+
                |                           |                            |
                +---------------------------+----------------------------+
                                            |  HTTPS (JSON REST)
                                            v
+-----------------------------------------------------------------------------------------+
|                           AstraMind Backend (Modular Monolith)                          |
|                                                                                         |
|   +---------------------------------------------------------------------------------+   |
|   | API Layer: FastAPI Router (/api/v1)                                             |   |
|   | - Health & Readiness Probes                                                     |   |
|   | - Unified Error Handling & Request Validation                                   |   |
|   | - Structured JSON Logging (Redaction of Sensitive PII)                          |   |
|   +---------------------------------------------------------------------------------+   |
|                                            |                                            |
|   +----------------------------------------v----------------------------------------+   |
|   | Core Domain Services                                                            |   |
|   | - Credential Lifecycle Engine (Draft -> Issued -> Suspended -> Revoked)        |   |
|   | - Tenant Isolation Engine (Institution Code context)                            |   |
|   | - Cryptographic Verification Engine (Signed QR Reference Validation)           |   |
|   | - Fee & Audit Ledger (Explicit UTC Timestamps)                                  |   |
|   +---------------------------------------------------------------------------------+   |
|                                            |                                            |
|         +----------------------------------+----------------------------------+         |
|         |                                                                     |         |
|         v                                                                     v         |
|   +----------------------------+                                +-------------------+   |
|   | Persistence Layer          |                                | Integration Adapters| |
|   | - PostgreSQL 16            |                                | (Explicit ABCs)   |   |
|   | - SQLAlchemy 2.0 ORM       |                                +---------+---------+   |
|   | - Alembic Schema Evolution |                                          |             |
|   +----------------------------+                      +-------------------+-------------+
|                                                       |                                 |
+-------------------------------------------------------|---------------------------------+
                                                        |
                                                        v
                                          +---------------------------+
                                          | External / SIS Ecosystem  |
                                          | - University SIS/SARIS    |
                                          | - Mobile Money Gateways   |
                                          |   (Simulated in Phase 1)  |
                                          +---------------------------+
```

### Core Design Philosophy
AstraMind provides a **digital identity and verification layer**, not a replacement Student Information System (SIS). The platform does not claim sovereign authority over who is a student; instead, it binds to authorized institutional records.

---

## 2. Frontend / Backend Responsibilities

| Responsibility Area | Frontend (`apps/web`) | Backend (`apps/api`) |
| :--- | :--- | :--- |
| **Authentication & Context** | Maintains UI active tenant & role session; renders persona banners. | Validates tenant context, RBAC permissions, and issues session tokens. |
| **Digital Card Presentation** | Renders university-branded card with photo, programme, expiry, and dynamic QR. Supports offline view via ServiceWorker/local storage. | Issues cryptographically signed credential tokens; verifies card integrity. |
| **Verification Logic** | Camera QR scanner capture and credential reference submission. | Executes authoritative verification rules against tenant state and revocation lists. |
| **Lifecycle Actions** | Form presentation for issue, suspend, and revoke with confirmation dialogs. | Enforces state transition invariants, commits transactions, and writes audit trails. |
| **Persistence & Audit** | Ephemeral browser state only. | PostgreSQL persistence with explicit UTC timestamps for all state modifications. |

---

## 3. Modular Monolith Architecture

The backend is structured as a **modular monolith** within FastAPI:

```
apps/api/app/
├── api/
│   └── v1/
│       ├── api.py               # Aggregates v1 sub-routers
│       └── endpoints/
│           └── health.py        # /health and /ready probes
├── core/
│   ├── config.py                # Pydantic Settings & environment validation
│   ├── errors.py                # Domain exceptions & Starlette error handlers
│   └── logging.py               # Structured logging with sensitive data masking
├── db/
│   ├── base.py                  # SQLAlchemy DeclarativeBase
│   └── session.py               # Engine configuration & connection pooling
├── models/
│   ├── base.py                  # TimestampMixin with UTC datetime
│   └── institution.py           # Institution model (Tenant partition entity)
├── schemas/
│   ├── error.py                 # Standard error envelope
│   ├── health.py                # Health & readiness payload schemas
│   └── institution.py           # Institution DTOs
└── integrations/
    ├── university.py            # UniversityIntegrationAdapter ABC & Simulation
    └── payment.py               # PaymentIntegrationAdapter ABC & Simulation
```

### Benefits of the Modular Monolith for this Platform:
1. **Low Operational Overhead**: Single container deployment for API and single PostgreSQL database.
2. **Strict In-Process Boundaries**: Domains communicate via well-defined Python interfaces rather than distributed network RPCs.
3. **Prepared for Extraction**: Clear package boundaries allow future extraction of Verifier or SIS sync workers if load demands.

---

## 4. Database Access Patterns

- **ORM Framework**: SQLAlchemy 2.0 with type-annotated `Mapped[...]` attributes.
- **Session Lifecycle**: FastAPI dependency injection (`get_db`) providing one isolated `Session` per HTTP request with guaranteed cleanup in `finally`.
- **Connection Management**: Connection pooling enabled with `pool_pre_ping=True` to detect and refresh stale socket connections.
- **Migration Strategy**: Alembic manages all schema changes sequentially. Schema drift without migration scripts is strictly prohibited.
- **Auditing**: Every record inherits from `TimestampMixin`, guaranteeing server-generated UTC `created_at` and `updated_at` values.

---

## 5. Integration Adapter Strategy

To ensure AstraMind remains reusable across multiple universities (e.g. LUANAR, KUHeS, MUST, MZUNI), all external interactions are mediated by **Explicit Adapter Interfaces**:

### University SIS Adapter Interface (`UniversityIntegrationAdapter`)
```python
class UniversityIntegrationAdapter(ABC):
    @abstractmethod
    def fetch_student_eligibility(self, institution_code: str, student_id: str) -> Optional[StudentEligibilityRecord]: ...

    @abstractmethod
    def verify_student_status(self, institution_code: str, student_id: str) -> bool: ...
```
- **Phase 1 Implementation**: `SimulatedUniversityAdapter` provides synthetic student fixtures for demonstration without contacting live registrar databases.
- **Future Production Implementation**: Institutional REST/SOAP connectors or scheduled batch import connectors.

### Payment Adapter Interface (`PaymentIntegrationAdapter`)
```python
class PaymentIntegrationAdapter(ABC):
    @abstractmethod
    def initiate_fee_payment(self, institution_code: str, student_id: str, amount_mwk: float, purpose: str) -> PaymentTransactionRecord: ...

    @abstractmethod
    def verify_payment_status(self, transaction_id: str) -> Optional[PaymentTransactionRecord]: ...
```
- **Phase 1 Implementation**: `SimulatedPaymentAdapter` generates synthetic transactions clearly tagged with `is_simulation=True`.

---

## 6. Tenant Isolation Principles

1. **Partition Key**: Every university is designated an immutable `institution_code` (e.g., `luanar`).
2. **Schema-Level Scoping**: Future student, credential, and audit tables will hold foreign keys referencing `institutions.id`.
3. **Query Guarding**: Repositories must filter queries by the authenticated user's institution ID.
4. **Administrative Scoping**: Institutional administrators (e.g., LUANAR Registry) cannot query or mutate records belonging to peer universities.

---

## 7. Simulation vs Production Boundaries

| Capability | Simulation Mode (Phase 1) | Production Requirement |
| :--- | :--- | :--- |
| **Student Eligibility** | Pre-seeded synthetic personas in `SimulatedUniversityAdapter`. | Secure API integration with University SIS / Registrar Database. |
| **Payments** | Immediate simulation receipt generation with test transaction IDs. | Integration with Malawian payment rails (TNM Mpamba, Airtel Money, National Bank). |
| **Authentication** | Persona switching for demonstration review. | Institutional Single Sign-On (SAML/OIDC) and secure JWT sessions. |
| **QR Code Verification** | Validated against database credential status. | Asymmetric public key cryptography (ECDSA) with digital signatures and offline revocation lists. |
| **Legal Status** | Non-binding technical pilot demonstration. | Formal institutional authorization, NCHE alignment, and Data Protection Act compliance. |
