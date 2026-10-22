"""Health and readiness monitoring endpoints."""

from fastapi import APIRouter, Response, status
from app import __version__
from app.core.config import settings
from app.db.session import check_db_connectivity
from app.schemas.health import HealthResponse, ReadyResponse, DatabaseCheckDetail

router = APIRouter(tags=["monitoring"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Application liveness probe",
    description="Returns application status, version, and simulation mode flag. Indicates process is running.",
)
async def get_health() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        environment=settings.ENVIRONMENT,
        version=__version__,
        simulation_mode=settings.SIMULATION_MODE,
        uniid_demo_mode=settings.UNIID_DEMO_MODE,
    )


@router.get(
    "/ready",
    response_model=ReadyResponse,
    summary="Application readiness probe",
    description="Verifies whether dependent subsystems (PostgreSQL database) are operational. Returns 503 if unready.",
    responses={
        200: {"description": "All subsystems are ready"},
        503: {"description": "Subsystem readiness check failed"},
    },
)
async def get_ready(response: Response) -> ReadyResponse:
    db_check = check_db_connectivity()

    if not db_check["connected"]:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        overall_status = "not_ready"
    else:
        overall_status = "ready"

    return ReadyResponse(
        status=overall_status,
        environment=settings.ENVIRONMENT,
        version=__version__,
        database=DatabaseCheckDetail(
            connected=db_check["connected"],
            latency_ms=db_check["latency_ms"],
            error=db_check.get("error"),
        ),
    )
