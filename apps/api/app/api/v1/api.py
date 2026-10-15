"""Router aggregator for API v1."""

from fastapi import APIRouter
from app.api.v1.endpoints import health

api_router = APIRouter()

# Monitoring endpoints mounted at root of /api/v1: /api/v1/health and /api/v1/ready
api_router.include_router(health.router)
