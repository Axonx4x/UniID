"""Main FastAPI entrypoint for AstraMind Digital Student ID API."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.errors import register_error_handlers
from app.core.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logging (sanitized, safe)
    logger.info("Initializing AstraMind Digital Student ID Backend Engine", extra={"extra_data": settings.safe_summary()})
    yield
    # Shutdown
    logger.info("AstraMind Digital Student ID API server stopped.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Multi-tenant digital student identity and verification platform for universities in Malawi.",
    version=__version__,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Centralized Error Handlers
register_error_handlers(app)

# Mount API v1 router under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", include_in_schema=False)
def root():
    return JSONResponse(
        content={
            "service": settings.PROJECT_NAME,
            "version": __version__,
            "status": "online",
            "documentation": f"{settings.API_V1_STR}/docs",
            "health": f"{settings.API_V1_STR}/health",
            "readiness": f"{settings.API_V1_STR}/ready",
            "simulation_mode": settings.SIMULATION_MODE,
        }
    )
