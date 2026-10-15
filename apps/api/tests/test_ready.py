"""Tests for /api/v1/ready endpoint."""

from unittest.mock import patch
from fastapi.testclient import TestClient


def test_ready_endpoint_healthy(client: TestClient):
    with patch("app.api.v1.endpoints.health.check_db_connectivity") as mock_check:
        mock_check.return_value = {
            "status": "healthy",
            "connected": True,
            "latency_ms": 1.25,
            "error": None,
        }

        response = client.get("/api/v1/ready")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "ready"
        assert data["database"]["connected"] is True
        assert data["database"]["latency_ms"] == 1.25
        assert data["database"]["error"] is None


def test_ready_endpoint_unhealthy(client: TestClient):
    with patch("app.api.v1.endpoints.health.check_db_connectivity") as mock_check:
        mock_check.return_value = {
            "status": "unhealthy",
            "connected": False,
            "latency_ms": 4.5,
            "error": "Database connection failed",
        }

        response = client.get("/api/v1/ready")
        assert response.status_code == 503

        data = response.json()
        assert data["status"] == "not_ready"
        assert data["database"]["connected"] is False
        assert data["database"]["error"] == "Database connection failed"
