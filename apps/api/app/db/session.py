"""Database session and connection engine management."""

import time
from typing import AsyncGenerator, Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.logging import logger

# SQLAlchemy 2.x Engine with connection pre-ping to detect stale connections
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=(settings.ENVIRONMENT == "development" and settings.LOG_LEVEL.upper() == "DEBUG"),
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[Session, None]:
    """FastAPI dependency yielding an isolated database session per request."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connectivity() -> Dict[str, Any]:
    """
    Executes a lightweight query (SELECT 1) to verify database reachability and measure latency.
    Returns status dict for the readiness probe.
    """
    start_time = time.perf_counter()
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "healthy",
            "connected": True,
            "latency_ms": latency_ms,
            "error": None,
        }
    except SQLAlchemyError as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.error(f"Database connectivity check failed: {str(exc)}")
        return {
            "status": "unhealthy",
            "connected": False,
            "latency_ms": latency_ms,
            "error": "Database connection failed",
        }
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.error(f"Unexpected error during database check: {str(exc)}")
        return {
            "status": "unhealthy",
            "connected": False,
            "latency_ms": latency_ms,
            "error": "Unexpected connection error",
        }
