"""Structured logging module that sanitizes sensitive information."""

import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings

# Sensitive keys and patterns to scrub
SENSITIVE_PATTERNS = [
    re.compile(r"(password|passwd|pwd)[\"':\s=]+([^,\s\"']+)", re.IGNORECASE),
    re.compile(r"(secret|token|api_key|authorization)[\"':\s=]+([^,\s\"']+)", re.IGNORECASE),
]

SENSITIVE_KEYS = {"password", "secret", "token", "authorization", "access_token", "refresh_token"}


def mask_sensitive_value(value: str) -> str:
    if not value or len(value) <= 4:
        return "****"
    return f"{value[:2]}****{value[-2:]}"


def sanitize_data(data: Any) -> Any:
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if str(k).lower() in SENSITIVE_KEYS:
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = sanitize_data(v)
        return sanitized
    elif isinstance(data, list):
        return [sanitize_data(item) for item in data]
    elif isinstance(data, str):
        sanitized_str = data
        for pattern in SENSITIVE_PATTERNS:
            sanitized_str = pattern.sub(r"\1=[REDACTED]", sanitized_str)
        return sanitized_str
    return data


class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as structured JSON without sensitive credentials."""

    def format(self, record: logging.LogRecord) -> str:
        log_payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "environment": settings.ENVIRONMENT,
        }

        # Include extra attributes if present
        if hasattr(record, "extra_data") and isinstance(record.extra_data, dict):
            log_payload["data"] = sanitize_data(record.extra_data)

        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(sanitize_data(log_payload))


def setup_logging() -> logging.Logger:
    """Configures structured logging for the application."""
    root_logger = logging.getLogger()
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    root_logger.setLevel(log_level)

    # Avoid duplicate handlers on re-initialization
    if not root_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredJsonFormatter())
        root_logger.addHandler(handler)
    else:
        for handler in root_logger.handlers:
            handler.setFormatter(StructuredJsonFormatter())

    logger = logging.getLogger("astramind")
    return logger


logger = setup_logging()
