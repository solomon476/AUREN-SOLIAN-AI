"""Tests for dashboard stats and chat action proposal execution."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_dashboard_real_computed_stats():
    res = client.get("/api/v1/dashboard/stats")
    assert res.status_code == 200
    data = res.json()
    assert data["activeStaffCount"] >= 6
    assert data["activeProjectsCount"] >= 4
    assert data["openOperationsCount"] >= 3
    assert len(data["recentActivities"]) >= 1
    assert len(data["operationalInsights"]) >= 1


def test_chat_execute_create_task_action():
    import uuid
    headers = {"X-User-Id": "usr-2"}  # Sarah Chen (Admin)
    proposal_id = f"prop-test-{uuid.uuid4().hex[:8]}"
    payload = {
        "proposal_id": proposal_id,
        "action_type": "create_task",
        "payload": {
            "title": "Audit AI Streaming Latency",
            "description": "Perform benchmark on chunk latency under high concurrency.",
            "priority": "high",
            "assignee": "David Ochieng",
            "due_date": "2026-11-29",
            "department": "Engineering & AI Operations",
        },
    }
    res = client.post("/api/v1/chat/execute-action", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "created" in data["message"].lower()

    # Verify task appears in task backlog
    res_tasks = client.get("/api/v1/tasks")
    assert res_tasks.status_code == 200
    tasks = res_tasks.json()
    created_task = next((t for t in tasks if t["title"] == "Audit AI Streaming Latency"), None)
    assert created_task is not None
    assert created_task["assignee"] == "David Ochieng"


def test_task_status_update():
    headers = {"X-User-Id": "usr-5"}  # Member
    res_patch = client.patch("/api/v1/tasks/t-3", json={"status": "completed"}, headers=headers)
    assert res_patch.status_code == 200
    assert res_patch.json()["status"] == "completed"

