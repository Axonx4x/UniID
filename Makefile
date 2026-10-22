.PHONY: help install dev-api dev-web test-api test-web lint-web typecheck-web build-web db-up db-down db-migrate db-seed demo-seed test clean

PYTHON ?= .venv/bin/python3
PIP ?= .venv/bin/pip
ALEMBIC ?= .venv/bin/alembic
PYTEST ?= .venv/bin/pytest

help:
	@echo "AstraMind Digital Student ID - Engineering Foundation"
	@echo "====================================================="
	@echo "make install         - Initialize Python venv and install all dependencies"
	@echo "make db-up           - Start PostgreSQL container via Docker Compose"
	@echo "make db-migrate      - Run Alembic database migrations"
	@echo "make db-seed         - Seed deterministic synthetic development data"
	@echo "make demo-seed       - Seed the opt-in LUANAR synthetic presenter roster (requires UNIID_DEMO_MODE=true)"
	@echo "make db-down         - Stop PostgreSQL container"
	@echo "make dev-api         - Start FastAPI backend server (port 8000)"
	@echo "make dev-web         - Start Vite frontend dev server (port 5173)"
	@echo "make test-api        - Execute backend Pytest suite"
	@echo "make lint-web        - Run ESLint on frontend code"
	@echo "make typecheck-web   - Run TypeScript strict typecheck"
	@echo "make build-web       - Build frontend production bundle"
	@echo "make test            - Run all backend tests and frontend checks"

install:
	@echo "==> Setting up Python virtual environment..."
	python3 -m venv .venv
	$(PIP) install --upgrade pip
	$(PIP) install -r apps/api/requirements.txt
	@echo "==> Setting up Frontend dependencies..."
	cd apps/web && npm install --legacy-peer-deps

db-up:
	docker compose up -d postgres

db-down:
	docker compose down

db-migrate:
	PYTHONPATH=apps/api $(ALEMBIC) -c apps/api/alembic.ini upgrade head

db-seed:
	PYTHONPATH=apps/api $(PYTHON) scripts/seed_demo_tenant.py

demo-seed:
	PYTHONPATH=apps/api $(PYTHON) scripts/seed_luanar_demo.py

dev-api:
	cd apps/api && ../../$(PYTHON) -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

dev-web:
	cd apps/web && npm run dev

test-api:
	PYTHONPATH=apps/api $(PYTEST) apps/api/tests

lint-web:
	cd apps/web && npm run lint

typecheck-web:
	cd apps/web && npm run typecheck

build-web:
	cd apps/web && npm run build

test: test-api typecheck-web lint-web build-web
	@echo "==> All backend and frontend verification checks passed."

clean:
	rm -rf apps/web/dist .pytest_cache apps/api/__pycache__
