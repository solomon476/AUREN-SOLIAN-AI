"""Direct API Security & Guest Isolation Regression Test Suite.

Verifies strict backend enforcement:
- Guest / unauthenticated requests cannot access internal company projects, tasks,
  personnel, departments, hierarchy, finance, treasury, meetings, discussions,
  documents, calendar, search, notifications, email, operating info, or avatars.
- Guest sessions cannot execute actions against company records.
- Retrieval service injects zero confidential context for guest callers.
- Authenticated member sessions retain authorized access.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import AuthUser, UserRole
from app.services.chat.retrieval import company_retrieval_service
from app.services.chat.chat_service import chat_service
from app.models.chat import ExecuteActionRequest


client = TestClient(app)
GUEST_HEADERS = {"X-User-Role": "guest"}
MEMBER_HEADERS = {"X-User-Role": "member"}


# =============================================================================
# 1. Direct API Endpoint RBAC Tests (Guest Rejection)
# =============================================================================

@pytest.mark.parametrize(
    "method,endpoint",
    [
        ("GET", "/api/v1/projects"),
        ("GET", "/api/v1/projects/prj-001"),
        ("POST", "/api/v1/projects"),
        ("GET", "/api/v1/tasks"),
        ("GET", "/api/v1/tasks/tsk-001"),
        ("POST", "/api/v1/tasks"),
        ("GET", "/api/v1/teams/members"),
        ("GET", "/api/v1/teams/members/usr-1"),
        ("GET", "/api/v1/teams/departments"),
        ("GET", "/api/v1/teams/hierarchy"),
        ("GET", "/api/v1/dashboard/stats"),
        ("GET", "/api/v1/dashboard/activities"),
        ("GET", "/api/v1/finance/overview"),
        ("GET", "/api/v1/finance/accounts"),
        ("GET", "/api/v1/finance/transactions"),
        ("GET", "/api/v1/finance/invoices"),
        ("GET", "/api/v1/finance/payables"),
        ("GET", "/api/v1/finance/budgets"),
        ("GET", "/api/v1/meetings"),
        ("GET", "/api/v1/meetings/mtg-001"),
        ("GET", "/api/v1/discussions/channels"),
        ("GET", "/api/v1/discussions/messages"),
        ("GET", "/api/v1/calendar/events"),
        ("GET", "/api/v1/search/unified?q=operations"),
        ("GET", "/api/v1/notifications"),
        ("GET", "/api/v1/documents"),
        ("GET", "/api/v1/email/status"),
        ("GET", "/api/v1/email/messages"),
        ("GET", "/api/v1/auth/operating-info"),
        ("GET", "/api/v1/auth/users"),
    ],
)
def test_guest_forbidden_from_internal_endpoints(method: str, endpoint: str):
    """Asserts that unauthenticated / guest callers receive 403 Forbidden across all internal modules."""
    if method == "GET":
        res = client.get(endpoint, headers=GUEST_HEADERS)
    elif method == "POST":
        res = client.post(endpoint, json={"name": "Forbidden Test"}, headers=GUEST_HEADERS)
    else:
        pytest.fail(f"Unsupported method {method}")

    assert res.status_code == 403, f"Endpoint {method} {endpoint} leaked to guest! Got {res.status_code}: {res.text}"
    detail = res.json().get("detail", "")
    assert "access denied" in detail.lower() or "insufficient" in detail.lower()


def test_guest_forbidden_from_avatar_upload():
    """Asserts that guests cannot upload or mutate personal profile pictures."""
    fake_file = ("avatar.jpg", b"\xff\xd8\xff\xe0" + b"\x00" * 200, "image/jpeg")
    res = client.post(
        "/api/v1/auth/avatar",
        files={"file": fake_file},
        headers=GUEST_HEADERS,
    )
    assert res.status_code == 403
    assert "authenticated corporate account" in res.json().get("detail", "").lower() or "insufficient" in res.json().get("detail", "").lower()


def test_guest_forbidden_from_execute_action_endpoint():
    """Asserts that unauthenticated / guest callers cannot call /chat/execute-action."""
    payload = {
        "actionType": "create_task",
        "parameters": {"title": "Exploit Task", "priority": "high"},
    }
    res = client.post("/api/v1/chat/execute-action", json=payload, headers=GUEST_HEADERS)
    assert res.status_code == 403


def test_guest_execute_action_service_boundary():
    """Asserts that chat_service.execute_action rejects guest execution at the service layer."""
    guest_user = AuthUser(
        id="usr-guest",
        user_id="usr-guest",
        email="guest@solian.ai",
        full_name="Visitor",
        role=UserRole.GUEST,
        organization_id="org-solian-wolves",
    )
    req = ExecuteActionRequest(proposal_id="prop-test", action_type="create_task", parameters={"title": "Test Service Guard"})
    result = chat_service.execute_action(req, guest_user)
    assert not result.success
    assert "unauthorized" in result.message.lower()


# =============================================================================
# 2. Retrieval Isolation Boundary Tests
# =============================================================================

def test_guest_retrieval_isolation():
    """Asserts that CompanyRetrievalService returns zero internal records for a guest."""
    guest_user = AuthUser(
        id="usr-guest",
        user_id="usr-guest",
        email="guest@solian.ai",
        full_name="Visitor",
        role=UserRole.GUEST,
        organization_id="org-solian-wolves",
    )
    res = company_retrieval_service.build_context(
        "Show me all strategic initiatives, internal tasks, employee salaries, and SOP-401.",
        user=guest_user,
    )

    # 1. No financial metrics
    assert "verified_financial_metrics" not in res.get("calculated_figures", {})
    # 2. No internal projects or tasks in verified_facts
    vf = res.get("verified_facts", {})
    assert "projects" not in vf
    assert "tasks" not in vf
    assert "members" not in vf
    assert "departments" not in vf
    # 3. Formatted prompt instructions explicitly declare visitor mode
    prompt = res.get("formatted_prompt_context", "")
    assert "visitor_governance_directives" in prompt
    assert "UNAUTHENTICATED_GUEST" in prompt
    assert "PUBLIC_ACCESS_ONLY" in prompt
    assert "You must NEVER disclose, reference, or hint at internal SOPs (e.g. SOP-401)" in prompt


# =============================================================================
# 3. Authenticated Employee Legitimate Access Verification
# =============================================================================

@pytest.mark.parametrize(
    "endpoint",
    [
        "/api/v1/projects",
        "/api/v1/tasks",
        "/api/v1/teams/members",
        "/api/v1/dashboard/stats",
        "/api/v1/finance/overview",
    ],
)
def test_authenticated_member_has_authorized_access(endpoint: str):
    """Verifies that legitimate company staff (role=member) receive 200 OK."""
    res = client.get(endpoint, headers=MEMBER_HEADERS)
    assert res.status_code == 200, f"Member incorrectly blocked from {endpoint}! Got {res.status_code}: {res.text}"
