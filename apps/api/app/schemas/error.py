"""Standardized API Error Response Schemas."""

from datetime import datetime, timezone
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    loc: Optional[List[str]] = Field(default=None, description="Location of the error (e.g., field path)")
    msg: str = Field(..., description="Specific detail message")
    type: Optional[str] = Field(default=None, description="Error type identifier")


class ErrorPayload(BaseModel):
    code: str = Field(..., description="Machine-readable error code in SCREAMING_SNAKE_CASE")
    message: str = Field(..., description="User-facing descriptive error message")
    details: Optional[List[Any]] = Field(default=None, description="Optional granular validation or error details")


class ErrorResponse(BaseModel):
    success: bool = Field(default=False, description="Always false for error responses")
    error: ErrorPayload = Field(..., description="Error payload")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Explicit UTC timestamp of error event"
    )
