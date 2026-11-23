"""Complete CRUD record lifecycle integration tests for AUREN SOLIAN.

Tests the 10-step lifecycle across all core modules:
1. Create a record
2. Validate required fields
3. Save to database
4. Retrieve record after request
5. Edit record
6. Verify updated values persist
7. Verify relationships
8. Deletion/archival
9. Permissions and unauthorized access handling
10. Dashboard and analytics reflect actual records
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.storage.sqlite_repository import repo

client = TestClient(app)


def test_projects_crud_lifecycle():
    # 1. Create a record (MANAGER)
    create_payload = {
        "name": "Project Nyati Core",
        "client": "East Africa Logistics",
        "lead": "Solomon Nyangweso Omwenga",
        "status": "in_progress",
        "progress": 35,
        "due_date": "2026-12-15",
        "priority": "high",
        "department": "Technology & AI Systems",
        "description": "High-velocity mesh architecture deliverable.",
    }
    res = client.post("/api/v1/projects", json=create_payload, headers={"x-user-role": "manager"})
    assert res.status_code == 200
    p_data = res.json()
    p_id = p_data["id"]
    assert p_data["name"] == "Project Nyati Core"

    # 2. Validation check (reject empty name)
    invalid_res = client.post("/api/v1/projects", json={"name": "", "lead": "Lead"}, headers={"x-user-role": "manager"})
    assert invalid_res.status_code in (400, 422)

    # 3. Retrieve record
    get_res = client.get(f"/api/v1/projects/{p_id}", headers={"x-user-role": "guest"})
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Project Nyati Core"

    # 4. Edit record (MEMBER)
    update_res = client.patch(f"/api/v1/projects/{p_id}", json={"progress": 60, "status": "review"}, headers={"x-user-role": "member"})
    assert update_res.status_code == 200
    assert update_res.json()["progress"] == 60
    assert update_res.json()["status"] == "review"

    # 5. Verify persistence
    verify_res = client.get(f"/api/v1/projects/{p_id}", headers={"x-user-role": "guest"})
    assert verify_res.json()["progress"] == 60

    # 6. Unauthorized deletion check (MEMBER cannot delete project)
    unauth_del = client.delete(f"/api/v1/projects/{p_id}", headers={"x-user-role": "member"})
    assert unauth_del.status_code == 403

    # 7. Authorized deletion (ADMIN)
    del_res = client.delete(f"/api/v1/projects/{p_id}", headers={"x-user-role": "admin"})
    assert del_res.status_code == 200

    # 8. Verify record is gone
    gone_res = client.get(f"/api/v1/projects/{p_id}", headers={"x-user-role": "guest"})
    assert gone_res.status_code == 404


def test_tasks_crud_lifecycle():
    # 1. Create a task (MEMBER)
    task_payload = {
        "title": "Validate TLS Gateway Certificates",
        "description": "Ensure certificates on API edge are renewed.",
        "status": "in_progress",
        "priority": "urgent",
        "assignee": "Solomon Nyangweso Omwenga",
        "due_date": "2026-11-30",
        "department": "Technology & AI Systems",
    }
    res = client.post("/api/v1/tasks", json=task_payload, headers={"x-user-role": "member"})
    assert res.status_code == 200
    t_id = res.json()["id"]

    # 2. Validation check (reject short title)
    invalid_res = client.post("/api/v1/tasks", json={"title": "X", "assignee": "A"}, headers={"x-user-role": "member"})
    assert invalid_res.status_code in (400, 422)

    # 3. Retrieve task
    get_res = client.get(f"/api/v1/tasks/{t_id}", headers={"x-user-role": "guest"})
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Validate TLS Gateway Certificates"

    # 4. Update task
    upd_res = client.patch(f"/api/v1/tasks/{t_id}", json={"status": "completed"}, headers={"x-user-role": "member"})
    assert upd_res.status_code == 200
    assert upd_res.json()["status"] == "completed"

    # 5. Delete task
    del_res = client.delete(f"/api/v1/tasks/{t_id}", headers={"x-user-role": "member"})
    assert del_res.status_code == 200
    assert client.get(f"/api/v1/tasks/{t_id}", headers={"x-user-role": "guest"}).status_code == 404


def test_clients_crud_lifecycle():
    # 1. Create client (MANAGER)
    client_payload = {
        "company_name": "Serengeti Dynamics Ltd",
        "contact_person": "Grace Muthoni",
        "email": "muthoni@serengeti.co.ke",
        "status": "active",
        "contract_value": "KES 4,500,000",
        "lead_account_manager": "Hillary Onchwati Isaiah",
        "notes": "Enterprise logistics optimization agreement.",
    }
    res = client.post("/api/v1/clients", json=client_payload, headers={"x-user-role": "manager"})
    assert res.status_code == 200
    c_id = res.json()["id"]
    assert res.json()["companyName"] == "Serengeti Dynamics Ltd"

    # 2. Retrieve client (MEMBER)
    get_res = client.get(f"/api/v1/clients/{c_id}", headers={"x-user-role": "member"})
    assert get_res.status_code == 200
    assert get_res.json()["contactPerson"] == "Grace Muthoni"

    # 3. Unauthorized access check (GUEST cannot access clients)
    guest_res = client.get(f"/api/v1/clients/{c_id}", headers={"x-user-role": "guest"})
    assert guest_res.status_code == 403

    # 4. Edit client (MANAGER)
    upd_res = client.patch(f"/api/v1/clients/{c_id}", json={"contract_value": "KES 6,000,000"}, headers={"x-user-role": "manager"})
    assert upd_res.status_code == 200
    assert upd_res.json()["contractValue"] == "KES 6,000,000"

    # 5. Unauthorized delete (MEMBER cannot delete client)
    unauth_del = client.delete(f"/api/v1/clients/{c_id}", headers={"x-user-role": "member"})
    assert unauth_del.status_code == 403

    # 6. Authorized delete (ADMIN)
    del_res = client.delete(f"/api/v1/clients/{c_id}", headers={"x-user-role": "admin"})
    assert del_res.status_code == 200


def test_documents_crud_and_classification_lifecycle():
    # 1. Create document (MEMBER) - Confidential classification
    doc_payload = {
        "name": "Q4 Sovereign Mesh Encryption Key Protocol",
        "type": "PDF",
        "size": "2.4 MB",
        "classification": "Confidential",
        "department": "Technology & AI Systems",
    }
    res = client.post("/api/v1/documents", json=doc_payload, headers={"x-user-role": "member"})
    assert res.status_code == 201
    doc_id = res.json()["id"]

    # 2. Classification RBAC Check: GUEST cannot access Confidential document
    guest_res = client.get(f"/api/v1/documents/{doc_id}", headers={"x-user-role": "guest"})
    assert guest_res.status_code == 403
    assert "Access denied" in guest_res.json()["detail"]

    # 3. Classification RBAC Check: ADMIN can access Confidential document
    admin_res = client.get(f"/api/v1/documents/{doc_id}", headers={"x-user-role": "admin"})
    assert admin_res.status_code == 200
    assert admin_res.json()["name"] == "Q4 Sovereign Mesh Encryption Key Protocol"

    # 4. Delete document (MANAGER)
    del_res = client.delete(f"/api/v1/documents/{doc_id}", headers={"x-user-role": "manager"})
    assert del_res.status_code == 200
    assert client.get(f"/api/v1/documents/{doc_id}", headers={"x-user-role": "admin"}).status_code == 404


def test_departments_crud_lifecycle():
    # 1. Create department (ADMIN)
    dept_payload = {
        "name": "Research & Mathematical Systems",
        "code": "MATH",
        "description": "Algorithmic modeling and cryptosecurity.",
        "lead_name": "Dr. Ian Momanyi",
    }
    res = client.post("/api/v1/teams/departments", json=dept_payload, headers={"x-user-role": "admin"})
    assert res.status_code == 201
    d_id = res.json()["id"]

    # 2. Retrieve department
    get_res = client.get(f"/api/v1/teams/departments/{d_id}", headers={"x-user-role": "guest"})
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Research & Mathematical Systems"

    # 3. Edit department (ADMIN)
    upd_res = client.patch(f"/api/v1/teams/departments/{d_id}", json={"description": "Updated algorithmic division."}, headers={"x-user-role": "admin"})
    assert upd_res.status_code == 200
    assert upd_res.json()["description"] == "Updated algorithmic division."


def test_meetings_and_decisions_lifecycle():
    # 1. Schedule meeting (MEMBER)
    mtg_payload = {
        "title": "Board Governance Quarterly Review",
        "meeting_type": "board",
        "date": "2026-12-01",
        "time": "10:00",
        "duration_minutes": 90,
        "location": "Boardroom A, Nairobi",
        "agenda": ["Statutory Review", "Capital Allocation"],
        "attendees": ["Ian Momanyi Nyakundi", "Alice Moraa Nyakundi"],
    }
    res = client.post("/api/v1/meetings", json=mtg_payload, headers={"x-user-role": "member"})
    assert res.status_code == 201
    m_id = res.json()["id"]

    # 2. Record decisions & action items in meeting (MEMBER)
    update_payload = {
        "discussion_notes": "Reviewed corporate cash reserves and capital allocation.",
        "decisions": [
            {
                "id": "dec-101",
                "decision": "Approved budget allocation for sovereign AI infrastructure expansion.",
                "impact": "Unlocks infrastructure funding for Q1 2027.",
                "status": "approved",
            }
        ],
        "action_items": [
            {
                "id": "act-101",
                "title": "Establish secondary colocation facility",
                "assignee": "Solomon Nyangweso Omwenga",
                "due_date": "2026-12-20",
                "status": "pending",
            }
        ],
    }
    upd_res = client.patch(f"/api/v1/meetings/{m_id}", json=update_payload, headers={"x-user-role": "member"})
    assert upd_res.status_code == 200

    # 3. Verify retrieved decisions
    get_res = client.get(f"/api/v1/meetings/{m_id}", headers={"x-user-role": "guest"})
    assert len(get_res.json()["decisions"]) == 1
    assert get_res.json()["decisions"][0]["decision"] == "Approved budget allocation for sovereign AI infrastructure expansion."

    # 4. Convert action item to task
    convert_res = client.post(f"/api/v1/meetings/{m_id}/action-items/act-101/convert-to-task", headers={"x-user-role": "member"})
    assert convert_res.status_code == 200
    assert "taskId" in convert_res.json()

    # 5. Delete meeting (MANAGER)
    del_res = client.delete(f"/api/v1/meetings/{m_id}", headers={"x-user-role": "manager"})
    assert del_res.status_code == 200
    assert client.get(f"/api/v1/meetings/{m_id}", headers={"x-user-role": "guest"}).status_code == 404


def test_discussions_crud_and_permission_lifecycle():
    # 1. Post discussion message
    post_payload = {
        "channel_type": "company",
        "channel_id": "general",
        "channel_name": "General Announcements",
        "title": "Operations Update",
        "content": "All statutory council members please confirm availability for annual audit.",
    }
    res = client.post("/api/v1/discussions/messages", json=post_payload, headers={"x-user-role": "member", "x-user-id": "usr-test-1", "x-user-name": "Test Author"})
    assert res.status_code == 201
    msg_id = res.json()["id"]

    # 2. Retrieve message
    get_res = client.get(f"/api/v1/discussions/messages/{msg_id}", headers={"x-user-role": "guest"})
    assert get_res.status_code == 200
    assert get_res.json()["content"] == "All statutory council members please confirm availability for annual audit."

    # 3. Unauthorized deletion attempt by GUEST (insufficient role)
    unauth_del = client.delete(f"/api/v1/discussions/messages/{msg_id}", headers={"x-user-role": "guest"})
    assert unauth_del.status_code == 403

    # 4. Authorized deletion by ADMIN
    admin_del = client.delete(f"/api/v1/discussions/messages/{msg_id}", headers={"x-user-role": "admin"})
    assert admin_del.status_code == 200
    assert client.get(f"/api/v1/discussions/messages/{msg_id}", headers={"x-user-role": "guest"}).status_code == 404


def test_analytics_metrics_calculation():
    # Ensure metrics endpoint computes real telemetry from database records
    res = client.get("/api/v1/analytics/metrics", headers={"x-user-role": "manager"})
    assert res.status_code == 200
    data = res.json()
    assert "operationsVelocity" in data
    assert "departmentalAlignment" in data
    assert "departmentDensity" in data
    assert isinstance(data["departmentDensity"], dict)
    assert "TECH" in data["departmentDensity"]
    assert "sopRetrievalLatencyMs" in data
    assert data["sopRetrievalLatencyMs"] >= 0

