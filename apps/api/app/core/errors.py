"""Centralized exception classes and FastAPI error handlers."""

from datetime import datetime, timezone
from typing import Any, List, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import logger


class AstraMindException(Exception):
    """Base exception for all domain and operational errors in AstraMind."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[List[Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or []


class NotFoundException(AstraMindException):
    def __init__(self, message: str = "Resource not found", code: str = "RESOURCE_NOT_FOUND", details: Optional[List[Any]] = None):
        super().__init__(message=message, code=code, status_code=status.HTTP_404_NOT_FOUND, details=details)


class ConflictException(AstraMindException):
    def __init__(self, message: str = "Resource conflict detected", code: str = "RESOURCE_CONFLICT", details: Optional[List[Any]] = None):
        super().__init__(message=message, code=code, status_code=status.HTTP_409_CONFLICT, details=details)


class ValidationException(AstraMindException):
    def __init__(self, message: str = "Validation failed", code: str = "VALIDATION_ERROR", details: Optional[List[Any]] = None):
        super().__init__(message=message, code=code, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, details=details)


class DatabaseUnavailableException(AstraMindException):
    def __init__(self, message: str = "Database service unavailable", code: str = "DATABASE_UNAVAILABLE", details: Optional[List[Any]] = None):
        super().__init__(message=message, code=code, status_code=status.HTTP_503_SERVICE_UNAVAILABLE, details=details)


class TenantContextMissingException(AstraMindException):
    def __init__(self, message: str = "Institution tenant context missing or invalid", code: str = "TENANT_CONTEXT_MISSING", details: Optional[List[Any]] = None):
        super().__init__(message=message, code=code, status_code=status.HTTP_400_BAD_REQUEST, details=details)


def format_error_response(code: str, message: str, details: Optional[List[Any]] = None) -> dict:
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def register_error_handlers(app: FastAPI) -> None:
    """Registers unified error handlers to ensure all errors match the API contract."""

    @app.exception_handler(AstraMindException)
    async def handle_astramind_exception(request: Request, exc: AstraMindException):
        logger.warning(f"Domain exception on {request.method} {request.url.path}: {exc.code} - {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content=format_error_response(code=exc.code, message=exc.message, details=exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        details = []
        for err in exc.errors():
            details.append({
                "loc": [str(item) for item in err.get("loc", [])],
                "msg": err.get("msg", "Invalid value"),
                "type": err.get("type", "value_error"),
            })
        logger.info(f"Validation error on {request.method} {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=format_error_response(
                code="VALIDATION_ERROR",
                message="The request payload failed schema validation.",
                details=details,
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException):
        code_map = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            500: "INTERNAL_SERVER_ERROR",
            503: "SERVICE_UNAVAILABLE",
        }
        code = code_map.get(exc.status_code, "HTTP_ERROR")
        logger.warning(f"HTTP exception {exc.status_code} on {request.method} {request.url.path}: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content=format_error_response(
                code=code,
                message=str(exc.detail) if exc.detail else "An HTTP error occurred.",
                details=[],
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unhandled_exception(request: Request, exc: Exception):
        logger.error(f"Unhandled server error on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=format_error_response(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected server error occurred. Please contact system support.",
                details=[],
            ),
        )
