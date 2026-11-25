"""Pre-Deployment Security Audit Tests for Owner Bootstrap & Activation."""
from datetime import datetime, timedelta, timezone
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.security import UserRole
from app.models.organization import PersonnelCreate
from app.services.storage.sqlite_repository import repo


client = TestClient(app)


def test_invitation_and_bootstrap_tokens_stored_hashed_not_plaintext():
    """Tokens must be stored as SHA-256 hashes in the database, never plaintext."""
    email = f"hashtest.{uuid.uuid4().hex[:6]}@solianwolves.co"
    member = repo.create_personnel_record(
        PersonnelCreate(
            name="Hash Audit Member",
            email=email,
            role=UserRole.MEMBER,
            title="Auditor",
            department="Operations",
        )
    )
    raw_token, _ = repo.generate_member_invitation(member.id, expires_in_days=1)
    stored_member = repo.get_member_by_id(member.id)
    assert stored_member is not None
    assert stored_member.invitation_token != raw_token
    assert stored_member.invitation_token.startswith("sha256:")
    assert raw_token not in stored_member.invitation_token

    # Lookup by raw token still resolves via hash
    resolved = repo.get_member_by_invitation_token(raw_token)
    assert resolved is not None
    assert resolved.id == member.id


def test_expired_and_malformed_tokens_fail_closed():
    """Expired, missing-expiry, or malformed invitation_expires_at must be rejected."""
    email = f"exptest.{uuid.uuid4().hex[:6]}@solianwolves.co"
    member = repo.create_personnel_record(
        PersonnelCreate(
            name="Expiry Audit Member",
            email=email,
            role=UserRole.MEMBER,
            title="Analyst",
            department="Operations",
        )
    )
    raw_token, _ = repo.generate_member_invitation(member.id, expires_in_days=1)

    # 1. Force expired timestamp in SQLite
    past_iso = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    conn = repo._get_connection()
    conn.execute("UPDATE members SET invitation_expires_at = ? WHERE id = ?;", (past_iso, member.id))
    conn.commit()
    conn.close()
    assert repo.get_member_by_invitation_token(raw_token) is None
    assert repo.activate_member_account(raw_token, f"uid-{uuid.uuid4().hex[:6]}", password="StrongPassword123!") is None

    # 2. Force malformed timestamp -> must fail closed (not pass!)
    conn = repo._get_connection()
    conn.execute("UPDATE members SET invitation_expires_at = 'not-a-valid-date' WHERE id = ?;", (member.id,))
    conn.commit()
    conn.close()
    assert repo.get_member_by_invitation_token(raw_token) is None

    # 3. Force NULL timestamp -> must fail closed
    conn = repo._get_connection()
    conn.execute("UPDATE members SET invitation_expires_at = NULL WHERE id = ?;", (member.id,))
    conn.commit()
    conn.close()
    assert repo.get_member_by_invitation_token(raw_token) is None


def test_atomic_single_use_activation_and_non_owner_bootstrap_rejection():
    """A token can only be consumed once, and non-owner tokens are rejected on /bootstrap-owner."""
    email = f"singleuse.{uuid.uuid4().hex[:6]}@solianwolves.co"
    member = repo.create_personnel_record(
        PersonnelCreate(
            name="Single Use Member",
            email=email,
            role=UserRole.MEMBER,
            title="Engineer",
            department="Engineering",
        )
    )
    raw_token, _ = repo.generate_member_invitation(member.id, expires_in_days=1)

    # Non-owner token cannot be used to bootstrap owner (when owner not bootstrapped) or is rejected
    if not repo.get_owner_bootstrap_status()["is_bootstrapped"]:
        resp = client.post(
            "/api/v1/auth/bootstrap-owner",
            json={"bootstrap_token": raw_token, "password": "StrongPassword123!"},
        )
        assert resp.status_code == 400

    # First activation succeeds
    act1 = client.post(
        "/api/v1/auth/activate",
        json={"token": raw_token, "password": "StrongPassword123!"},
    )
    assert act1.status_code == 200
    assert act1.json()["user"]["role"] == "member"

    # Second attempt with same token is rejected
    act2 = client.post(
        "/api/v1/auth/activate",
        json={"token": raw_token, "password": "AnotherPassword123!"},
    )
    assert act2.status_code == 400


def test_bootstrap_owner_requires_strong_password():
    """Owner bootstrap and activation must reject missing or <8 character passwords."""
    resp_short = client.post(
        "/api/v1/auth/bootstrap-owner",
        json={"bootstrap_token": "some-valid-length-token", "password": "12345"},
    )
    assert resp_short.status_code == 422

    resp_missing = client.post(
        "/api/v1/auth/bootstrap-owner",
        json={"bootstrap_token": "some-valid-length-token"},
    )
    assert resp_missing.status_code == 422


def test_bootstrap_ignores_client_auth_user_id_in_staging(monkeypatch):
    """In staging/production, unverified client auth_user_id must not be trusted."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging")
    email = f"uidspoof.{uuid.uuid4().hex[:6]}@solianwolves.co"
    member = repo.create_personnel_record(
        PersonnelCreate(
            name="UID Spoof Check",
            email=email,
            role=UserRole.MEMBER,
            title="Analyst",
            department="Operations",
        )
    )
    raw_token, _ = repo.generate_member_invitation(member.id, expires_in_days=1)

    resp = client.post(
        "/api/v1/auth/activate",
        json={
            "token": raw_token,
            "password": "ValidPassword123!",
            "auth_user_id": "usr-1",  # Attempted impersonation of Owner UID
        },
    )
    assert resp.status_code == 200
    updated = repo.get_member_by_id(member.id)
    assert updated is not None
    assert updated.auth_user_id != "usr-1"
    assert updated.role == UserRole.MEMBER


def test_auth_endpoint_rate_limiting(monkeypatch):
    """Auth endpoints enforce 429 rate limiting under brute-force attempts."""
    monkeypatch.setenv("ENABLE_AUTH_RATE_LIMIT_TEST", "1")
    from app.api.v1 import auth as auth_mod
    auth_mod._AUTH_RATE_BUCKETS.clear()

    statuses = []
    for _ in range(auth_mod.AUTH_RATE_LIMIT_MAX + 2):
        r = client.get("/api/v1/auth/invitation/nonexistent-brute-force-token")
        statuses.append(r.status_code)

    assert 429 in statuses
    auth_mod._AUTH_RATE_BUCKETS.clear()
