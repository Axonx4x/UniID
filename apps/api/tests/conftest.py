"""Pytest test fixtures and configuration."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Synchronous test client fixture for API endpoints."""
    with TestClient(app, base_url="http://testserver") as test_client:
        yield test_client
