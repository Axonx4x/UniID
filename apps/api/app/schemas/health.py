"""Pydantic schemas for health and readiness endpoints."""

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class DatabaseCheckDetail(BaseModel):
    connected: bool = Field(..., description="Whether database connection succeeded")
    latency_ms: float = Field(..., description="Query execution round-trip latency in milliseconds")
    error: Optional[str] = Field(default=None, description="Error message if check failed")


class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Application service status")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Explicit UTC timestamp of the check"
    )
    environment: str = Field(..., description="Application environment name")
    version: str = Field(..., description="Platform semantic version")
    simulation_mode: bool = Field(..., description="Flag indicating synthetic demonstration mode")
    uniid_demo_mode: bool = Field(default=False, description="Server-authoritative LUANAR demo environment flag")


class ReadyResponse(BaseModel):
    status: str = Field(..., description="'ready' when all critical subsystems are operational, else 'not_ready'")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Explicit UTC timestamp of readiness verification"
    )
    environment: str = Field(..., description="Application environment name")
    version: str = Field(..., description="Platform semantic version")
    database: DatabaseCheckDetail = Field(..., description="Database connectivity probe results")
