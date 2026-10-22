import httpx
import pytest


@pytest.mark.anyio
async def test_health_endpoint_success(client: httpx.AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["simulation_mode"] is True
    assert "timestamp" in data


@pytest.mark.anyio
async def test_root_endpoint_info(client: httpx.AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json()["health"] == "/api/v1/health"
