"""Tests for centralized error handling and API contract compliance."""

from fastapi.testclient import TestClient


def test_404_not_found_contract(client: TestClient):
    response = client.get("/api/v1/non-existent-endpoint")
    assert response.status_code == 404

    data = response.json()
    assert data["success"] is False
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "message" in data["error"]
    assert "timestamp" in data


def test_method_not_allowed_contract(client: TestClient):
    response = client.post("/api/v1/health")
    assert response.status_code == 405

    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "METHOD_NOT_ALLOWED"
    assert "timestamp" in data
