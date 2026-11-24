"""Comprehensive tests for Phase 2.1: Data integrity, input validation, and proposal idempotency."""
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_auth_me_development_mode():
    """Verify /me returns DEVELOPMENT_SIMULATION authMode and user demo flags."""
    res = client.get("/api/v1/auth/me", headers={"X-User-Id": "usr-1"})
    assert res.status_code == 200
    data = res.json()
    assert data["authMode"] == "DEVELOPMENT_SIMULATION"
    assert data["isDemoUser"] is False
    assert data["fullName"] == "Ian Momanyi Nyakundi"
    assert data["role"] == "owner"


def test_company_data_integrity_demo_flags():
    """Verify statutory officers are real and properly seeded in the company directory."""
    res = client.get("/api/v1/teams/members", headers={"X-User-Id": "usr-1"})
    assert res.status_code == 200
    members = res.json()

    owner = next(m for m in members if m["userId"] == "usr-1")
    assert owner["isDemo"] is False
    assert "Ian Momanyi Nyakundi" in owner["name"]
    assert owner["role"] == "owner"

    # Verify core leadership council exists
    officer_names = [m["name"] for m in members]
    assert any("Ian Momanyi Nyakundi" in name for name in officer_names)
    assert any("Hillary Onchwati Isaiah" in name for name in officer_names)
    assert any("Alice Moraa Nyakundi" in name for name in officer_names)


def test_knowledge_demo_items_are_unverified():
    """Verify seeded demo knowledge items are explicitly flagged as unverified."""
    res = client.get("/api/v1/knowledge/items", headers={"X-User-Id": "usr-1"})
    assert res.status_code == 200
    items = res.json()
    demo_items = [it for it in items if it.get("isDemo")]
    assert len(demo_items) > 0
    for it in demo_items:
        assert it["isVerified"] is False
        assert "[DEMO" in it["title"]


def test_action_proposal_idempotency():
    """Verify an action proposal executes once and duplicate execution is rejected."""
    import uuid
    proposal_id = f"prop-idempotency-{uuid.uuid4().hex[:8]}"
    headers = {"X-User-Id": "usr-2"}  # Admin
    payload = {
        "proposal_id": proposal_id,
        "action_type": "create_task",
        "payload": {
            "title": "Idempotent Task Test",
            "description": "Testing proposal replay protection.",
            "priority": "medium",
            "assignee": "Sarah Chen",
            "due_date": "Next Sprint",
            "department": "Engineering & AI Operations",
        },
    }

    # First execution must succeed
    res1 = client.post("/api/v1/chat/execute-action", json=payload, headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["success"] is True

    # Duplicate execution of the same proposal_id must be rejected
    res2 = client.post("/api/v1/chat/execute-action", json=payload, headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["success"] is False
    assert data2.get("already_executed") is True
    assert "already been executed" in data2["message"]


def test_action_proposal_rbac_index_sop_requires_manager():
    """Verify MEMBER clearance cannot index SOPs via chat action proposals."""
    headers_member = {"X-User-Id": "usr-test-member", "X-User-Role": "member"}
    payload = {
        "proposal_id": f"prop-member-sop-attempt-{uuid.uuid4().hex[:6]}",
        "action_type": "index_sop",
        "payload": {
            "title": "Unauthorized SOP Proposal",
            "category": "SOP",
            "snippet": "Should be rejected for member.",
            "content": "Full unauthorized content.",
            "classification": "Internal",
            "department": "Technology & AI Systems",
            "tags": ["unauthorized"],
        },
    }
    res = client.post("/api/v1/chat/execute-action", json=payload, headers=headers_member)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert "Insufficient clearance" in data["message"]


def test_validation_rejected_project_progress():
    """Verify progress < 0 or > 100 returns HTTP 422."""
    headers_manager = {"X-User-Id": "usr-3"}  # Marcus Vance (Manager)
    invalid_progress_high = {
        "name": "Invalid Progress Initiative",
        "lead": "Marcus Vance",
        "due_date": "2026-12-31",
        "priority": "medium",
        "progress": 150,
        "status": "in_progress",
    }
    res = client.post("/api/v1/projects", json=invalid_progress_high, headers=headers_manager)
    assert res.status_code == 422

    invalid_progress_low = {
        "name": "Invalid Progress Initiative Low",
        "lead": "Marcus Vance",
        "due_date": "2026-12-31",
        "priority": "medium",
        "progress": -5,
        "status": "in_progress",
    }
    res = client.post("/api/v1/projects", json=invalid_progress_low, headers=headers_manager)
    assert res.status_code == 422


def test_validation_rejected_priority_and_classification():
    """Verify invalid priority or classification strings return HTTP 422."""
    headers_manager = {"X-User-Id": "usr-3"}

    # Invalid project priority
    res = client.post(
        "/api/v1/projects",
        json={"name": "Bad Priority", "lead": "Marcus", "due_date": "2026-12-31", "priority": "super-urgent"},
        headers=headers_manager,
    )
    assert res.status_code == 422

    # Invalid task priority
    res = client.post(
        "/api/v1/tasks",
        json={"title": "Bad Task", "priority": "unknown-prio", "due_date": "Tomorrow"},
        headers=headers_manager,
    )
    assert res.status_code == 422

    # Invalid knowledge classification
    res = client.post(
        "/api/v1/knowledge/items",
        json={
            "title": "Bad Classification SOP",
            "category": "SOP",
            "snippet": "Test",
            "content": "Test",
            "classification": "TopSecretOmega",
        },
        headers=headers_manager,
    )
    assert res.status_code == 422


def test_client_creation_and_rbac():
    """Verify MANAGER can create a client and GUEST cannot."""
    headers_guest = {"X-User-Id": "usr-guest-test", "X-User-Role": "guest"}
    headers_manager = {"X-User-Id": "usr-4"}  # Noella Maraka Kaatho (Manager)

    client_payload = {
        "company_name": "Helvetia Alpine Labs",
        "contact_person": "Jonas Meier",
        "email": "jonas@helvetia-labs.ch",
        "status": "active",
        "contract_value": "$240,000 / yr",
        "lead_account_manager": "Elena Rostova",
        "notes": "Bio-informatics AI deployment.",
    }

    # Guest rejected with 403
    res_guest = client.post("/api/v1/clients", json=client_payload, headers=headers_guest)
    assert res_guest.status_code == 403

    # Manager allowed
    res_mgr = client.post("/api/v1/clients", json=client_payload, headers=headers_manager)
    assert res_mgr.status_code == 200
    created = res_mgr.json()
    assert created["companyName"] == "Helvetia Alpine Labs"
    assert created["isDemo"] is False


def test_workflow_creation_and_rbac():
    """Verify MANAGER can create a workflow rule and MEMBER cannot."""
    headers_member = {"X-User-Id": "usr-test-member", "X-User-Role": "member"}
    headers_manager = {"X-User-Id": "usr-4"}  # Noella Maraka Kaatho (Manager)

    wf_payload = {
        "title": "Automated Security Audit Ping",
        "trigger": "Anomalous multi-tenant query pattern detected",
        "action": "Trigger SOC escalation workflow and alert Admin",
        "status": "active",
        "department": "Technology & AI Systems",
    }

    # Member rejected with 403
    res_member = client.post("/api/v1/workflows", json=wf_payload, headers=headers_member)
    assert res_member.status_code == 403

    # Manager allowed
    res_mgr = client.post("/api/v1/workflows", json=wf_payload, headers=headers_manager)
    assert res_mgr.status_code == 200
    created = res_mgr.json()
    assert created["title"] == "Automated Security Audit Ping"
    assert created["isDemo"] is False
