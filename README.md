# AstraMind Digital Student ID

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=flat)](https://www.sqlalchemy.org)
[![Simulation Mode](https://img.shields.io/badge/Status-Simulation%20Demo%20Mode-orange)](#simulation-boundaries)

A multi-tenant digital student identity, lifecycle management, and credential verification platform for higher education institutions in Malawi.

Designed as an authoritative digital credential layer that integrates with existing university Student Information Systems (SIS/SARIS) without requiring institutions to replace their underlying management software.

---

## 1. Platform Status & Implemented Foundation (Phase 1)

This repository is organized in progressive development phases. **Phase 1: Repository Foundation and Engineering Contracts** is complete and fully executable.

### Implemented in Phase 1:
- [x] **Monorepo Architecture**: Clean separation between `apps/web` (React/Vite) and `apps/api` (FastAPI).
- [x] **FastAPI Core & Monitoring**: API prefix `/api/v1`, application liveness probe (`GET /api/v1/health`), and readiness probe (`GET /api/v1/ready`) checking database connectivity.
- [x] **Database & Migrations**: PostgreSQL 16 container, SQLAlchemy 2.0 ORM session management, Alembic migration engine, and initial migration `0001_initial` establishing the multi-tenant `institutions` table.
- [x] **Configuration & Logging**: Pydantic Settings with startup validation, safe defaults, zero committed secrets, and structured JSON logging with automated redaction of sensitive credentials and PII.
- [x] **Integration Contracts**: Explicit abstract adapter interfaces (`UniversityIntegrationAdapter`, `PaymentIntegrationAdapter`) with initial simulation implementations.
- [x] **Unified Error Handling**: Strict error response envelopes matching documented API contracts.
- [x] **Frontend Web Application**: Strict TypeScript Vite application, custom Vanilla CSS design system (Deep Navy palette, neutral surfaces, accessible typography), live backend and database connectivity indicators.
- [x] **Quality Assurance**: Automated backend test suite with Pytest, frontend strict typechecking, ESLint, production build scripts, and Playwright end-to-end testing scaffolding.

### Planned for Subsequent Phases:
- [ ] **Phase 2**: Student Digital Card interface, offline display caching, photo & registration number rendering, dynamic QR code generation.
- [ ] **Phase 3**: Camera QR scanner verifier interface (Active, Expired, Revoked), Registry administrative dashboard (issuance, revocation, audit log), simulated payment flows.
- [ ] **Phase 4**: Institutional SIS connectors, production authentication, and cryptographic signing.

---

## 2. Technology Stack

- **Backend**: Python 3.11+ / 3.13, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, psycopg 3
- **Frontend**: React 18, TypeScript (Strict Mode), Vite, React Router DOM, Lucide Icons, Vanilla CSS Design System
- **Persistence & DevOps**: PostgreSQL 16, Docker Compose, Pytest, Playwright, ESLint

---

## 3. Prerequisites

Ensure you have the following installed locally:
- **Python**: version 3.11, 3.12, or 3.13
- **Node.js**: version 18+ (tested on Node v20/v26) and `npm`
- **Docker & Docker Compose**: for running PostgreSQL container
- **Git**

---

## 4. Quickstart Guide

### Step 1: Clone Repository and Setup Environment
```bash
git clone https://github.com/astramind/digital-id.git
cd digital-id

# Copy environment template to active .env
cp .env.example .env
cp apps/web/.env.example apps/web/.env
```

Review the values in `.env`. Safe defaults are pre-configured for local development.

### Step 2: Start PostgreSQL Database Container
To avoid conflicts with local PostgreSQL instances, Docker Compose maps the database container to host port **5433**:
```bash
make db-up
# Alternatively: docker compose up -d postgres
```

Verify the container is healthy:
```bash
docker compose ps
```

### Step 3: Run Database Migrations
Apply the initial schema migration using Alembic:
```bash
make db-migrate
# Alternatively: PYTHONPATH=apps/api .venv/bin/alembic -c apps/api/alembic.ini upgrade head
```

### Step 4: Start Backend API Server
```bash
make dev-api
# Alternatively: cd apps/api && ../../.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API is available at:
- **Root Info**: [http://localhost:8000/](http://localhost:8000/)
- **Health Probe**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **Readiness Probe**: [http://localhost:8000/api/v1/ready](http://localhost:8000/api/v1/ready)
- **Interactive OpenAPI Docs**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)

### Step 5: Start Frontend Application
In a separate terminal:
```bash
make dev-web
# Alternatively: cd apps/web && npm run dev
```
Open your browser at **[http://localhost:5173](http://localhost:5173)**. The page will display the public platform overview, architectural tenets, roadmap, and live real-time connectivity status with the backend and database.

---

## 5. Verification and Testing

### Backend Unit & Integration Tests
Run the Pytest suite:
```bash
make test-api
```
Tests verify health probes, readiness checks (handling both online and degraded database states), contract error formatting, and simulation adapters.

### Frontend Quality Checks
```bash
# TypeScript strict typechecking
make typecheck-web

# Frontend linting
make lint-web

# Production build test
make build-web
```

### Run All Checks
```bash
make test
```

---

## 6. Project Architecture & Contracts

For comprehensive architectural specifications and engineering standards, refer to the documentation in `/docs`:

- **[System Architecture](docs/architecture.md)**: System boundaries, modular-monolith design, database access patterns, adapter patterns, and tenant isolation principles.
- **[Product Requirements (PRD)](docs/product-requirements.md)**: User roles, core modules, credential lifecycle states, payment separation rules, and demo boundaries.
- **[API Contracts](docs/api-contracts.md)**: URI naming, request/response formats, standard error envelopes, and health probe specifications.
- **[Demonstration Script](docs/demo-script.md)**: Demo narrative, personas (e.g. LUANAR City Campus), and the golden valid-to-revoked credential lifecycle walkthrough.

---

## 7. Simulation Boundaries & Disclaimers

1. **Simulation Mode**: This platform is currently running in an explicit simulation mode (`SIMULATION_MODE=true`).
2. **Synthetic Data**: Student records, matriculation numbers, and photos are synthetic fixtures created for institutional review.
3. **No Claim of Formal Adoption**: Neither this platform nor AstraMind Labs claims that LUANAR, KUHeS, MUST, MZUNI, or any other institution has formally adopted or contracted the service.
4. **Payment Separation**: Payment of an annual service fee does not establish student enrollment or identity. Academic status is determined exclusively by the university's authorized registrar records.

---

## 8. Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `503 Service Unavailable` on `/api/v1/ready` | PostgreSQL container is offline or unreachable on port 5433. | Run `make db-up` and confirm `docker compose ps` shows `astramind-postgres` as healthy. |
| `Port 5432 already in use` | Host machine has local PostgreSQL running. | The provided setup uses port **5433** to prevent collisions. Verify `.env` sets `POSTGRES_PORT=5433`. |
| Frontend displays `Backend Offline` | FastAPI dev server is not running on port 8000. | Start the API server with `make dev-api` and verify [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health). |
| `npm error ERESOLVE` during install | Peer dependency resolution mismatch. | Run `npm install --legacy-peer-deps` inside `apps/web`. |

---

## 9. License & Attribution

Developed by **AstraMind Labs**. Proprietary demonstration platform for higher education institutional evaluation.
