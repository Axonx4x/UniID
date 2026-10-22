from unittest.mock import patch
import httpx
import pytest


@pytest.mark.anyio
async def test_ready_endpoint_healthy(client: httpx.AsyncClient):
    with patch("app.api.v1.endpoints.health.check_db_connectivity") as check:
        check.return_value = {"status": "healthy", "connected": True, "latency_ms": 1.25, "error": None}
        response = await client.get("/api/v1/ready")
    assert response.status_code == 200
    assert response.json()["database"]["connected"] is True


@pytest.mark.anyio
async def test_ready_endpoint_unhealthy(client: httpx.AsyncClient):
    with patch("app.api.v1.endpoints.health.check_db_connectivity") as check:
        check.return_value = {"status": "unhealthy", "connected": False, "latency_ms": 4.5, "error": "Database connection failed"}
        response = await client.get("/api/v1/ready")
    assert response.status_code == 503
    assert response.json()["database"]["connected"] is False
