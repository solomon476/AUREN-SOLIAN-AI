"""Unit tests for Cryptographic Authentication & RBAC Foundation (Phase 3A)."""
from datetime import timedelta
import uuid
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import (
    UserRole,
    create_access_token,
    verify_jwt_token,
    get_current_user,
    require_role,
    AuthUser,
)
from app.services.storage.sqlite_repository import repo
from app.models.organization import PersonnelCreate
from app.main import app

client = TestClient(app)


def test_jwt_create_and_verify_success():
    """Tests creating and cryptographically validating a JWT token."""
    token = create_access_token({
        "sub": "usr-1",
        "email": "solomon@solian.ai",
        "role": "owner",
    })
    assert isinstance(token, str)
    assert len(token) > 20

    payload = verify_jwt_token(token)
    assert payload["sub"] == "usr-1"
    assert payload["email"] == "solomon@solian.ai"
    assert payload["iss"] == "auren-solian-auth"
    assert payload["aud"] == "authenticated"


def test_jwt_expired_token_rejection():
    """Tests that expired JWT tokens are rejected with HTTP 401."""
    expired_token = create_access_token(
        {"sub": "usr-1", "email": "solomon@solian.ai"},
        expires_delta=timedelta(seconds=-10),  # expired 10 seconds ago
    )
    with pytest.raises(HTTPException) as exc_info:
        verify_jwt_token(expired_token)
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


def test_jwt_tampered_token_rejection():
    """Tests that tampered or invalid JWT signatures are rejected with HTTP 401."""
    valid_token = create_access_token({"sub": "usr-1"})
    # Tamper with the signature portion
    tampered = valid_token[:-4] + "fake"
    with pytest.raises(HTTPException) as exc_info:
        verify_jwt_token(tampered)
    assert exc_info.value.status_code == 401
    assert "invalid" in exc_info.value.detail.lower()


def test_jwt_incorrectly_signed_token_rejection():
    """Tests that tokens signed with an unauthorized external secret are rejected."""
    import jwt
    from datetime import datetime, timezone
    payload = {
        "sub": "usr-1",
        "email": "solomon@solian.ai",
        "aud": "authenticated",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    unauthorized_token = jwt.encode(payload, "unauthorized-external-attacker-secret-key", algorithm="HS256")
    with pytest.raises(HTTPException) as exc_info:
        verify_jwt_token(unauthorized_token)
    assert exc_info.value.status_code == 401
    assert "invalid" in exc_info.value.detail.lower()


def test_jwt_invalid_audience_rejection():
    """Tests that tokens with invalid or untrusted audience claims are rejected."""
    import jwt
    from datetime import datetime, timezone
    payload = {
        "sub": "usr-1",
        "aud": "untrusted_service",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    untrusted_aud_token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    with pytest.raises(HTTPException) as exc_info:
        verify_jwt_token(untrusted_aud_token)
    assert exc_info.value.status_code == 401
    assert "invalid" in exc_info.value.detail.lower()


def test_supabase_authentic_payload_resolution():
    """
    Tests compatibility with authentic Supabase Auth JWT payloads:
    including 'iss' (Supabase project URL), 'aud'='authenticated',
    and top-level 'role'='authenticated' from Supabase Auth.
    """
    import jwt
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    supabase_payload = {
        "sub": "usr-1",
        "email": "ian.nyakundi@solianwolves.co",
        "aud": "authenticated",
        "role": "authenticated",
        "iss": "https://auth.solian-wolves-test.supabase.co/auth/v1",
        "app_metadata": {"provider": "email", "providers": ["email"]},
        "user_metadata": {"full_name": "Ian Momanyi Nyakundi"},
        "exp": now + timedelta(hours=1),
        "iat": now,
    }
    token = jwt.encode(supabase_payload, settings.jwt_secret, algorithm="HS256")
    user = get_current_user(authorization=f"Bearer {token}")
    assert user.user_id == "usr-1"
    assert user.role == UserRole.OWNER
    assert user.full_name == "Ian Momanyi Nyakundi"
    assert user.auth_mode == "SUPABASE_JWT"


def test_server_side_role_resolution_via_jwt():
    """
    Tests that when an authenticated user supplies a Bearer token,
    their role is strictly resolved server-side from the verified corporate directory,
    completely ignoring any client-provided role or headers.
    """
    # Create a dynamic Member record
    member = repo.create_personnel_record(
        PersonnelCreate(
            name="Test Verification Member",
            email=f"member.{uuid.uuid4().hex[:6]}@solianwolves.co",
            role=UserRole.MEMBER,
            department="Technology & AI Systems",
            title="Junior Engineer",
        )
    )
    member_token = create_access_token({
        "sub": member.user_id,
        "email": member.email,
    })

    # Even if client tries to spoof an Owner role in headers, server-side DB authority prevails
    user = get_current_user(
        authorization=f"Bearer {member_token}",
        x_user_role="owner",  # Forged header
    )
    assert user.user_id == member.user_id
    assert user.role == UserRole.MEMBER  # Correctly resolved as MEMBER, NOT owner!
    assert user.auth_mode == "SUPABASE_JWT"


def test_production_environment_rejects_unauthenticated_requests(monkeypatch):
    """
    Verifies that in production mode, requests without a valid Bearer token
    are strictly rejected with HTTP 401, and dev simulation headers are disallowed.
    """
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    # 1. Request with no token in production -> 401
    with pytest.raises(HTTPException) as exc_1:
        get_current_user(authorization=None)
    assert exc_1.value.status_code == 401

    # 2. Request with X-User-Id header in production -> still rejected with 401
    with pytest.raises(HTTPException) as exc_2:
        get_current_user(authorization=None, x_user_id="usr-1")
    assert exc_2.value.status_code == 401

    # 3. Request with valid Bearer token in production -> succeeds!
    monkeypatch.setattr(settings, "DATABASE_URL", "postgresql://kali@/postgres?host=/tmp")
    from app.db.connection import DatabaseManager
    with DatabaseManager(database_url="postgresql://kali@/postgres?host=/tmp").connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO members (id, user_id, organization_id, name, email, role, title, department, is_demo)
            VALUES ('tm-1', 'usr-1', 'org-solian-wolves', 'Ian Momanyi Nyakundi', 'ian.nyakundi@solianwolves.co', 'owner', 'Chief Executive Officer', 'Executive Leadership', FALSE)
            ON CONFLICT (id) DO NOTHING;
        """)
    token = create_access_token({"sub": "usr-1", "email": "ian.nyakundi@solianwolves.co"})
    user = get_current_user(authorization=f"Bearer {token}")
    assert user.user_id == "usr-1"
    assert user.role == UserRole.OWNER


def test_api_endpoint_with_bearer_token():
    """Tests calling an API endpoint (/api/v1/auth/me) with a Bearer token."""
    token = create_access_token({"sub": "usr-1", "email": "ian.nyakundi@solianwolves.co"})
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["userId"] == "usr-1"
    assert data["fullName"] == "Ian Momanyi Nyakundi"
    assert data["role"] == "owner"
    assert data["authMode"] == "SUPABASE_JWT"


def test_privilege_escalation_prevention_on_protected_route():
    """
    Verifies that a Member with a valid JWT cannot access Admin-only endpoints,
    even if attempting to spoof headers.
    """
    member = repo.create_personnel_record(
        PersonnelCreate(
            name="Escalation Test Member",
            email=f"escalate.{uuid.uuid4().hex[:6]}@solianwolves.co",
            role=UserRole.MEMBER,
            department="Technology & AI Systems",
            title="Junior Engineer",
        )
    )
    member_token = create_access_token({"sub": member.user_id, "email": member.email})

    # Attempt to call Admin-only PUT /api/v1/auth/org/profile
    response = client.put(
        "/api/v1/auth/org/profile",
        json={"name": "Compromised Wolves"},
        headers={
            "Authorization": f"Bearer {member_token}",
            "X-User-Role": "owner",  # Forged header
        },
    )
    # Must be 403 Forbidden because server-side role is MEMBER
    assert response.status_code == 403
    assert "insufficient" in response.json()["detail"].lower()

