"""Integration tests for Workflow Automation lifecycle and RBAC enforcement."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.storage.sqlite_repository import repo

client = TestClient(app)


def test_workflow_full_crud_and_trigger_lifecycle():
    # 1. List existing workflows (MANAGER clearance)
    resp = client.get("/api/v1/workflows", headers={"X-User-Role": "manager", "X-User-Id": "usr-3"})
    assert resp.status_code == 200
    initial_workflows = resp.json()
    assert isinstance(initial_workflows, list)

    # 2. Member/Guest cannot create workflow (requires MANAGER)
    resp = client.post(
        "/api/v1/workflows",
        json={
            "title": "Unauthorized Trigger Test",
            "trigger": "Every day at midnight",
            "action": "Dispatch summary",
            "department": "Engineering & AI Operations",
        },
        headers={"X-User-Role": "member", "X-User-Id": "usr-5"},
    )
    assert resp.status_code == 403

    # 3. Create a new automation workflow as MANAGER
    create_payload = {
        "title": "Automated SLA Alert Dispatch",
        "trigger": "Customer escalation ticket raised with severity >= High",
        "action": "Notify On-Call Lead via SMS and create High-Priority Task",
        "department": "Engineering & AI Operations",
    }
    resp = client.post(
        "/api/v1/workflows",
        json=create_payload,
        headers={"X-User-Role": "manager", "X-User-Id": "usr-3"},
    )
    assert resp.status_code == 200
    created = resp.json()
    wf_id = created["id"]
    assert created["title"] == create_payload["title"]
    assert created["status"] == "active"
    assert created["executionCount"] == 0

    # 4. Get the workflow by ID
    resp = client.get(f"/api/v1/workflows/{wf_id}", headers={"X-User-Role": "manager", "X-User-Id": "usr-3"})
    assert resp.status_code == 200
    fetched = resp.json()
    assert fetched["id"] == wf_id
    assert fetched["title"] == create_payload["title"]

    # 5. Pause workflow status
    resp = client.patch(
        f"/api/v1/workflows/{wf_id}/status",
        json={"status": "paused"},
        headers={"X-User-Role": "manager", "X-User-Id": "usr-3"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "paused"

    # 6. Re-activate workflow status
    resp = client.patch(
        f"/api/v1/workflows/{wf_id}/status",
        json={"status": "active"},
        headers={"X-User-Role": "manager", "X-User-Id": "usr-3"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"

    # 7. Trigger the workflow manually
    resp = client.post(
        f"/api/v1/workflows/{wf_id}/trigger",
        headers={"X-User-Role": "manager", "X-User-Id": "usr-3"},
    )
    assert resp.status_code == 200
    triggered = resp.json()
    assert triggered["executionCount"] == 1

    # Trigger second time
    resp = client.post(
        f"/api/v1/workflows/{wf_id}/trigger",
        headers={"X-User-Role": "manager", "X-User-Id": "usr-3"},
    )
    assert resp.status_code == 200
    assert resp.json()["executionCount"] == 2

    # 8. Deletion requires ADMIN role (Manager gets 403)
    resp = client.delete(
        f"/api/v1/workflows/{wf_id}",
        headers={"X-User-Role": "manager", "X-User-Id": "usr-3"},
    )
    assert resp.status_code == 403

    # Delete as ADMIN
    resp = client.delete(
        f"/api/v1/workflows/{wf_id}",
        headers={"X-User-Role": "admin", "X-User-Id": "usr-2"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"

    # 9. Verify 404 after deletion
    resp = client.get(f"/api/v1/workflows/{wf_id}", headers={"X-User-Role": "manager", "X-User-Id": "usr-3"})
    assert resp.status_code == 404
