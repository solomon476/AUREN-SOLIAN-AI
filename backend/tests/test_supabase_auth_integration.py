"""Integration tests for Supabase Auth, Bearer Token Verification, and Role Resolution (Phase 3B.1)."""
from datetime import datetime, timedelta, timezone
import pytest
import jwt
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import UserRole, get_current_user, verify_jwt_token
from app.main import app

client = TestClient(app)


def generate_supabase_jwt(
    sub: str,
    email: str,
    full_name: str,
    expires_in_seconds: int = 3600,
    aud: str = "authenticated",
    secret: str = None,
) -> str:
    """Helper to generate authentic Supabase-formatted JWT tokens."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "email": email,
        "aud": aud,
        "role": "authenticated",  # Standard Supabase Auth top-level claim
        "iss": "https://auth.solian-wolves-test.supabase.co/auth/v1",
        "app_metadata": {
            "provider": "email",
            "providers": ["email"],
        },
        "user_metadata": {
            "full_name": full_name,
        },
        "exp": now + timedelta(seconds=expires_in_seconds),
        "iat": now,
    }
    jwt_secret = secret or settings.jwt_secret
    return jwt.encode(payload, jwt_secret, algorithm="HS256")


def test_supabase_auth_verified_owner_session():
    """
    Verifies that a Supabase token for Solomon K. maps directly to the verified
    database record with OWNER role and organizational authority.
    """
    token = generate_supabase_jwt(
        sub="usr-1",
        email="solomon@solian.ai",
        full_name="Solomon K.",
    )

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["userId"] == "usr-1"
    assert data["email"] == "solomon@solian.ai"
    assert data["fullName"] == "Solomon K."
    assert data["role"] == "owner"
    assert data["authMode"] == "SUPABASE_JWT"
    assert data["isDemoUser"] is False


def test_supabase_auth_verified_staff_member_session():
    """
    Verifies that a Supabase token for David Ochieng maps to his database role (MEMBER),
    even if the client attempts to inject custom role headers.
    """
    token = generate_supabase_jwt(
        sub="usr-5",
        email="d.ochieng@solian.ai",
        full_name="[DEMO] David Ochieng",
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": f"Bearer {token}",
            "X-User-Role": "owner",  # Forged header attempt
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["userId"] == "usr-5"
    assert data["role"] == "member"  # Server-side DB authority prevails!
    assert data["authMode"] == "SUPABASE_JWT"


def test_supabase_auth_external_unapproved_user_containment():
    """
    Verifies that an authenticated Supabase user who is NOT in the corporate staff directory
    is safely contained to GUEST clearance, preventing unauthorized data access.
    """
    token = generate_supabase_jwt(
        sub="usr-external-unapproved-99",
        email="unapproved_intruder@external.io",
        full_name="External Random User",
    )

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    # Must be contained to GUEST
    assert data["role"] == "guest"
    assert data["authMode"] == "SUPABASE_JWT"

    # Verify that this contained user cannot modify organization settings (Admin/Owner only)
    profile_response = client.put(
        "/api/v1/auth/org/profile",
        json={"name": "Attacker Hijacked Corp"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert profile_response.status_code == 403
    assert "insufficient" in profile_response.json()["detail"].lower()


def test_supabase_auth_expired_token_rejection():
    """Verifies that expired Supabase tokens return HTTP 401 Unauthorized."""
    expired_token = generate_supabase_jwt(
        sub="usr-1",
        email="solomon@solian.ai",
        full_name="Solomon K.",
        expires_in_seconds=-60,  # Expired 1 minute ago
    )
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_supabase_auth_tampered_signature_rejection():
    """Verifies that tampered Supabase tokens return HTTP 401 Unauthorized."""
    valid_token = generate_supabase_jwt(
        sub="usr-1",
        email="solomon@solian.ai",
        full_name="Solomon K.",
    )
    tampered_token = valid_token[:-5] + "XXXXX"
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert response.status_code == 401


def test_supabase_auth_unauthorized_signing_key_rejection():
    """Verifies that tokens signed with a foreign secret are rejected."""
    foreign_token = generate_supabase_jwt(
        sub="usr-1",
        email="solomon@solian.ai",
        full_name="Solomon K.",
        secret="foreign-untrusted-secret-key-that-does-not-match",
    )
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {foreign_token}"})
    assert response.status_code == 401


def test_supabase_auth_email_alone_cannot_elevate_privileges():
    """
    CRITICAL SECURITY CHECK:
    Verifies that an external Supabase account presenting the email of a high-privilege
    executive (e.g. solomon@solian.ai) but with an unlinked/unauthorized 'sub' claim
    CANNOT inherit the executive's role. It must be strictly contained to GUEST.
    """
    imposter_token = generate_supabase_jwt(
        sub="attacker-unlinked-supabase-uid-9999",
        email="solomon@solian.ai",  # Executive email
        full_name="Solomon Imposter",
    )

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {imposter_token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "guest"  # STRICTLY CONTAINED! Not 'owner'
    assert data["userId"] == "attacker-unlinked-supabase-uid-9999"


def test_supabase_auth_bound_auth_user_id_resolution():
    """
    Verifies that binding a stable Supabase UID (sub) to a corporate member record
    grants the verified member's authentic server-side role.
    """
    from app.services.storage.sqlite_repository import repo

    # Link stable Auth UID to Solomon K (tm-1)
    stable_uid = "auth-uid-solomon-k-verified"
    repo.link_member_auth_id("tm-1", stable_uid)

    token = generate_supabase_jwt(
        sub=stable_uid,
        email="arbitrary-email@solian.ai",
        full_name="Solomon K.",
    )

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["userId"] == "usr-1"
    assert data["role"] == "owner"


def test_supabase_auth_missing_claims_rejected():
    """Verifies that tokens missing required claims ('sub' or 'iss') are strictly rejected."""
    # 1. Missing 'sub'
    payload_no_sub = {
        "email": "solomon@solian.ai",
        "aud": "authenticated",
        "iss": "https://auth.solian-wolves-test.supabase.co/auth/v1",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    token_no_sub = jwt.encode(payload_no_sub, settings.jwt_secret, algorithm="HS256")
    resp_no_sub = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_no_sub}"})
    assert resp_no_sub.status_code == 401

    # 2. Missing 'iss'
    payload_no_iss = {
        "sub": "usr-1",
        "email": "solomon@solian.ai",
        "aud": "authenticated",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    token_no_iss = jwt.encode(payload_no_iss, settings.jwt_secret, algorithm="HS256")
    resp_no_iss = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_no_iss}"})
    assert resp_no_iss.status_code == 401

