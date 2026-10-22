"""Router aggregator for API v1."""

from fastapi import APIRouter
from app.api.v1.endpoints import auth, credentials, health, institutions, onboarding, onboarding_queue, roster, staff, student, verification

api_router = APIRouter()

# Monitoring endpoints mounted at root of /api/v1: /api/v1/health and /api/v1/ready
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(institutions.router)
api_router.include_router(credentials.router)
api_router.include_router(verification.router)
api_router.include_router(onboarding.router)
api_router.include_router(onboarding_queue.router)
api_router.include_router(roster.router)
api_router.include_router(staff.router)
api_router.include_router(student.router)

