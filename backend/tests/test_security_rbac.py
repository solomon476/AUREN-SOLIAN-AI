import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_admin_access_allowed():
    headers = {"X-User-Role": "admin"}
    response = client.get("/api/v1/teams/members", headers=headers)
    assert response.status_code == 200
    members = response.json()
    assert len(members) > 0


def test_guest_forbidden_from_manager_endpoints():
    # Workflows requires at least MANAGER
    headers = {"X-User-Role": "guest"}
    response = client.get("/api/v1/workflows", headers=headers)
    assert response.status_code == 403
    assert "insufficient" in response.json()["detail"].lower()


def test_manager_allowed_on_workflows():
    headers = {"X-User-Role": "manager"}
    response = client.get("/api/v1/workflows", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
