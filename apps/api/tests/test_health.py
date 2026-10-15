"""Tests for /api/v1/health endpoint."""

from fastapi.testclient import TestClient


def test_health_endpoint_success(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert "environment" in data
    assert "version" in data
    assert data["simulation_mode"] is True


def test_root_endpoint_info(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200

    data = response.json()
    assert "service" in data
    assert data["health"] == "/api/v1/health"
    assert data["readiness"] == "/api/v1/ready"
