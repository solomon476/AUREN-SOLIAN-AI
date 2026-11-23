"""Tests for knowledge classification and role-based security boundaries."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_guest_classification_restriction():
    # Aria Thorne (Guest, usr-6) should only see Public items
    headers = {"X-User-Id": "usr-6"}
    res = client.get("/api/v1/knowledge/items", headers=headers)
    assert res.status_code == 200
    items = res.json()
    # All items seen by guest must be Public
    for it in items:
        assert it["classification"] == "Public"


def test_guest_forbidden_from_restricted_knowledge_item():
    # ARCH-003 is Restricted
    headers = {"X-User-Id": "usr-6"}
    res = client.get("/api/v1/knowledge/items/arch-003", headers=headers)
    assert res.status_code == 403
    assert "classified" in res.json()["detail"].lower()


def test_member_can_access_internal_knowledge():
    # David Ochieng (Member, usr-5) can access Internal SOP-401
    headers = {"X-User-Id": "usr-5"}
    res = client.get("/api/v1/knowledge/items/sop-401", headers=headers)
    assert res.status_code == 200
    assert "SOP-401" in res.json()["title"]
    assert res.json()["classification"] == "Internal"


def test_member_forbidden_from_indexing_sop():
    # Member cannot create new knowledge items
    headers = {"X-User-Id": "usr-5"}
    payload = {
        "title": "Unauthorized SOP",
        "category": "SOP",
        "snippet": "Unauthorized",
        "content": "Content",
        "classification": "Internal",
    }
    res = client.post("/api/v1/knowledge/items", json=payload, headers=headers)
    assert res.status_code == 403


def test_manager_can_index_new_sop():
    # Marcus Vance (Manager, usr-3) can index SOP
    headers = {"X-User-Id": "usr-3"}
    payload = {
        "title": "Client Escalation Quick-Reference Protocol",
        "category": "SOP",
        "snippet": "Verified rapid response procedure for Tier-1 enterprise incidents.",
        "content": "Step 1: Verify SLA severity. Step 2: Open incident bridge.",
        "classification": "Internal",
        "department": "Strategic Advisory & Client Accounts",
        "tags": ["client", "triage", "sla"],
    }
    res = client.post("/api/v1/knowledge/items", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == payload["title"]
    assert data["isVerified"] is True

