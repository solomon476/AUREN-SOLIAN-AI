"""Tests for organization foundation, departments, hierarchy, and operating info."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_company_identity_and_profile():
    res = client.get("/api/v1/auth/org")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Solian Wolves"
    assert data["code"] == "SLN-WLV"
    assert "Organizational Intelligence" in data["tagline"]
    assert "mission" in data
    assert "operating_model" in data


def test_company_operating_info():
    res = client.get("/api/v1/auth/operating-info")
    assert res.status_code == 200
    data = res.json()
    assert len(data["principles"]) >= 4
    assert len(data["cadences"]) >= 4
    assert len(data["escalation_slas"]) >= 4


def test_departments_and_teams():
    res = client.get("/api/v1/teams/departments")
    assert res.status_code == 200
    depts = res.json()
    assert len(depts) >= 5
    dept_names = [d["name"] for d in depts]
    assert any("Technology & AI Systems" in name or "Engineering" in name for name in dept_names)
    assert any("Executive Leadership" in name for name in dept_names)

    res_teams = client.get("/api/v1/teams/teams")
    assert res_teams.status_code == 200
    teams = res_teams.json()
    assert len(teams) >= 5


def test_organizational_hierarchy():
    res = client.get("/api/v1/teams/hierarchy")
    assert res.status_code == 200
    hierarchy = res.json()
    assert len(hierarchy) >= 1
    # Top level should be Ian Momanyi Nyakundi (Owner)
    owner_node = hierarchy[0]
    assert owner_node["name"] == "Ian Momanyi Nyakundi"
    assert owner_node["role"] == "owner"
    assert len(owner_node["subordinates"]) >= 1


def test_role_update_permissions():
    # Member trying to update role should be rejected with 403
    member_headers = {"X-User-Id": "usr-test-member", "X-User-Role": "member"}
    payload = {"role": "manager"}
    res = client.patch("/api/v1/teams/members/tm-5/role", json=payload, headers=member_headers)
    assert res.status_code == 403

    # Admin can update role of a non-owner member
    admin_headers = {"X-User-Id": "usr-2"}  # Hillary Onchwati Isaiah (Admin)
    res_admin = client.patch("/api/v1/teams/members/tm-4/role", json={"role": "member"}, headers=admin_headers)
    assert res_admin.status_code == 200
    assert res_admin.json()["role"] == "member"

    # Admin cannot assign Owner role
    res_illegal = client.patch("/api/v1/teams/members/tm-4/role", json={"role": "owner"}, headers=admin_headers)
    assert res_illegal.status_code == 403

    # Restore tm-4 back to manager
    client.patch("/api/v1/teams/members/tm-4/role", json={"role": "manager"}, headers=admin_headers)
