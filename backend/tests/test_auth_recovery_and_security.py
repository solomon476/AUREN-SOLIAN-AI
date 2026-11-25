"""Authentication Recovery, Staging/Prod Boundary, and RBAC Tests."""
from datetime import timedelta
import uuid
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.security import create_access_token, get_current_user, get_optional_user, UserRole
from app.models.organization import PersonnelCreate
from app.services.storage.sqlite_repository import repo
from app.services.chat.retrieval import company_retrieval_service


client = TestClient(app)


def test_staging_rejects_unauthenticated_and_simulation_headers(monkeypatch):
    """Staging must enforce Bearer JWTs just like production and ignore X-User-Id."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging")

    with pytest.raises(HTTPException) as exc1:
        get_current_user(authorization=None)
    assert exc1.value.status_code == 401

    with pytest.raises(HTTPException) as exc2:
        get_current_user(authorization=None, x_user_id="usr-1", x_user_role="owner")
    assert exc2.value.status_code == 401

    # get_optional_user returns strictly GUEST (never usr-1 owner) when no Bearer token is provided
    opt_user = get_optional_user(authorization=None, x_user_id="usr-1", x_user_role="owner")
    assert opt_user.role == UserRole.GUEST
    assert opt_user.user_id == "usr-guest"


def test_expired_jwt_rejected_with_401():
    """Expired JWT tokens must be rejected with 401 Unauthorized."""
    expired_token = create_access_token(
        {"sub": "usr-1", "email": "ian.nyakundi@solianwolves.co"},
        expires_delta=timedelta(minutes=-5),
    )
    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp.status_code == 401
    assert "expired" in resp.json()["detail"].lower()


def test_unlinked_jwt_subject_contained_to_guest():
    """A valid JWT whose 'sub' is not in the members table is strictly contained to GUEST."""
    unknown_uid = f"supa-unlinked-{uuid.uuid4().hex[:8]}"
    token = create_access_token({"sub": unknown_uid, "email": "stranger@example.com"})

    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["role"] == "guest"

    # Cannot access internal member/owner endpoints
    assert client.get("/api/v1/projects", headers={"Authorization": f"Bearer {token}"}).status_code == 403
    assert client.get("/api/v1/finance/overview", headers={"Authorization": f"Bearer {token}"}).status_code == 403


def test_corporate_login_rejects_unactivated_and_invalid_credentials():
    """Unactivated personnel without password_hash and wrong passwords must be rejected."""
    email = f"pending.{uuid.uuid4().hex[:6]}@solianwolves.co"
    member = repo.create_personnel_record(
        PersonnelCreate(
            name="Pending Employee",
            email=email,
            role=UserRole.MEMBER,
            title="Analyst",
            department="Operations",
        )
    )
    assert member.activation_status == "invitation_pending"

    # Unactivated account cannot log in (even with old hardcoded strings)
    for attempt in ("Solian2026!", "Admin2026!", "RandomPass123!"):
        resp = client.post("/api/v1/auth/login", json={"email": email, "password": attempt})
        assert resp.status_code in (401, 403)

    # Unknown email returns 401
    bad_email_resp = client.post("/api/v1/auth/login", json={"email": "nonexistent@solianwolves.co", "password": "TestPassword123!"})
    assert bad_email_resp.status_code == 401


def test_activated_member_login_and_rbac_enforcement():
    """Activated member can log in, receives valid JWT, and cannot escalate to Owner/Admin."""
    email = f"staff.{uuid.uuid4().hex[:6]}@solianwolves.co"
    member = repo.create_personnel_record(
        PersonnelCreate(
            name="Verified Staff",
            email=email,
            role=UserRole.MEMBER,
            title="Operations Specialist",
            department="Operations",
        )
    )
    token, _ = repo.generate_member_invitation(member.id, expires_in_days=1)
    test_pw = f"Pw-{uuid.uuid4().hex[:10]}!"
    act_resp = client.post("/api/v1/auth/activate", json={"token": token, "password": test_pw})
    assert act_resp.status_code == 200

    # Wrong password rejected
    bad_pw = client.post("/api/v1/auth/login", json={"email": email, "password": "WrongPassword!"})
    assert bad_pw.status_code == 401

    # Valid password succeeds
    login_resp = client.post("/api/v1/auth/login", json={"email": email, "password": test_pw})
    assert login_resp.status_code == 200
    jwt_token = login_resp.json()["accessToken"]
    headers = {"Authorization": f"Bearer {jwt_token}", "X-User-Role": "owner"}  # attempted header escalation

    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["role"] == "member"

    # Member can read tasks, but cannot update org profile (Admin/Owner only)
    assert client.get("/api/v1/tasks", headers=headers).status_code == 200
    org_put = client.put("/api/v1/auth/org/profile", json={"name": "Hijacked"}, headers=headers)
    assert org_put.status_code == 403


def test_owner_vs_guest_company_ai_context_isolation():
    """Owner receives company intelligence context while Guest receives zero confidential context."""
    guest_user = get_optional_user(authorization=None, x_user_id=None, x_user_role="guest", x_org_id=None)
    guest_ctx = company_retrieval_service.build_context(
        query="Summarize active strategic initiatives and SOP-401",
        user=guest_user,
    )
    assert guest_ctx["context_sources"] == []
    assert guest_ctx["knowledge_context"] == []
    assert "projects" not in guest_ctx["verified_facts"]
    assert "tasks" not in guest_ctx["verified_facts"]
    assert "finance" not in guest_ctx["verified_facts"]

    owner_token = create_access_token({"sub": "usr-1", "email": "ian.nyakundi@solianwolves.co"})
    owner_user = get_current_user(authorization=f"Bearer {owner_token}", x_user_id=None, x_user_role=None, x_org_id=None)
    assert owner_user.role == UserRole.OWNER
    owner_ctx = company_retrieval_service.build_context(
        query="Summarize active strategic initiatives and SOP-401",
        user=owner_user,
    )
    assert owner_ctx["restricted_attempt"] is False
    assert len(owner_ctx["context_sources"]) > 0
