import httpx
import pytest


@pytest.mark.anyio
async def test_404_not_found_contract(client: httpx.AsyncClient):
    response = await client.get("/api/v1/non-existent-endpoint")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"
    assert "timestamp" in data


@pytest.mark.anyio
async def test_method_not_allowed_contract(client: httpx.AsyncClient):
    response = await client.post("/api/v1/health")
    assert response.status_code == 405
    assert response.json()["error"]["code"] == "METHOD_NOT_ALLOWED"
