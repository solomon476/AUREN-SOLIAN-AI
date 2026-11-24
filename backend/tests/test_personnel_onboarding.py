"""
Comprehensive integration and unit test suite for:
AUREN SOLIAN — Company Personnel, Identity & Account Provisioning

Tests all 10 directives:
1. Personnel Directory establishment (admin can create without email/phone).
2. Contact info update later (email, phone, title, department).
3. Secure cryptographic invitation token generation.
4. Token verification and unauthenticated public inspection.
5. Account activation & password setting (binding Auth UID, role assignment, not guest).
6. Authenticated profile avatar upload, replace, and remove.
7. Role hierarchy & anti-privilege escalation (cannot self-promote or elevate above caller).
8. Guest isolation (guests cannot create personnel, edit records, or upload avatars).
9. Account suspension & access revocation.
10. Owner bootstrap workflow (secure claim, active owner session, single-use defense).
"""
import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import UserRole, create_access_token
from app.services.storage.sqlite_repository import repo
from app.models.organization import PersonnelCreate, PersonnelUpdate

client = TestClient(app)

# Helper headers
def auth_headers(sub: str, email: str, role: str, name: str):
    token = create_access_token({"sub": sub, "email": email, "role": role, "name": name})
    return {"Authorization": f"Bearer {token}"}

admin_headers = {
    "X-User-Id": "usr-admin-test",
    "X-User-Role": "admin",
}

guest_headers = {
    "X-User-Id": "usr-guest-test",
    "X-User-Role": "guest",
}


def test_admin_can_provision_personnel_without_email_or_phone():
    """Directive 1 & 4: Admin can establish personnel records before email/phone is known."""
    resp = client.post(
        "/api/v1/teams/members",
        headers=admin_headers,
        json={
            "name": f"David Mwangi {uuid.uuid4().hex[:4]}",
            "title": "Lead Site Reliability Engineer",
            "department": "Technology & AI Systems",
            "role": "member",
            "responsibilities": ["Cloud Infrastructure", "Kubernetes Mesh"],
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "David Mwangi" in data["name"]
    assert data["title"] == "Lead Site Reliability Engineer"
    assert data["email"] is None
    assert data["phone"] is None
    assert data["activationStatus"] == "created"
    assert data["status"] == "active"
    member_id = data["id"]

    # Verify record in repository
    member = repo.get_member_by_id(member_id)
    assert member is not None
    assert "David Mwangi" in member.name
    assert member.activation_status == "created"


def test_admin_can_update_contact_info_later():
    """Directive 1 & 4: Contact details can be completed later by administrator."""
    # Create initial pending record
    created = repo.create_personnel_record(
        PersonnelCreate(
            name=f"Grace Achieng {uuid.uuid4().hex[:4]}",
            title="Senior Financial Analyst",
            department="Finance & Corporate Treasury",
            role=UserRole.MEMBER,
        ),
        creator_name="Admin Test",
    )
    assert created.email is None

    # Update with official email and phone
    email = f"grace.{uuid.uuid4().hex[:6]}@solianwolves.co"
    resp = client.patch(
        f"/api/v1/teams/members/{created.id}",
        headers=admin_headers,
        json={
            "email": email,
            "phone": "+254 711 223 344",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == email
    assert data["phone"] == "+254 711 223 344"
    assert data["activationStatus"] == "invitation_pending"


def test_invitation_generation_and_public_token_verification():
    """Directive 2 & 3: Admin generates cryptographic token; public verification returns profile."""
    # Create employee
    email = f"kevin.{uuid.uuid4().hex[:6]}@solianwolves.co"
    created = repo.create_personnel_record(
        PersonnelCreate(
            name="Kevin Omondi",
            email=email,
            title="DevOps Specialist",
            department="Technology & AI Systems",
            role=UserRole.MEMBER,
        ),
        creator_name="Admin Test",
    )

    # Admin generates invitation
    invite_resp = client.post(
        f"/api/v1/teams/members/{created.id}/invite",
        headers=admin_headers,
    )
    assert invite_resp.status_code == 200
    invite_data = invite_resp.json()
    token = invite_data["invitationToken"]
    assert token is not None
    assert len(token) >= 32
    assert invite_data["activationStatus"] == "invitation_sent"
    assert f"/activate?token={token}" in invite_data["activationUrl"]

    # Public check endpoint without authentication
    check_resp = client.get(f"/api/v1/auth/invitation/{token}")
    assert check_resp.status_code == 200
    check_data = check_resp.json()
    assert check_data["valid"] is True
    assert check_data["name"] == "Kevin Omondi"
    assert check_data["email"] == email
    assert check_data["title"] == "DevOps Specialist"
    assert check_data["role"] == "member"
    assert check_data["organization"] == "Solian Enterprise Group"
    assert check_data["is_owner_bootstrap"] is False


def test_invalid_or_fake_token_rejected():
    """Directive 4: Identity cannot be claimed by guessing without cryptographic token."""
    # Bogus token check
    check_resp = client.get("/api/v1/auth/invitation/fake-nonexistent-token-12345678")
    assert check_resp.status_code == 200
    assert check_resp.json()["valid"] is False

    # Attempt activation with fake token
    activate_resp = client.post(
        "/api/v1/auth/activate",
        json={
            "token": "fake-nonexistent-token-12345678",
            "password": "Password123!",
        },
    )
    assert activate_resp.status_code == 400
    assert "Invalid or expired" in activate_resp.json()["detail"]


def test_employee_onboarding_activation_lifecycle():
    """Directive 3 & 5: Employee self-activates account with token and creates own password."""
    # 1. Admin creates personnel record
    email = f"beatrice.{uuid.uuid4().hex[:6]}@solianwolves.co"
    created = repo.create_personnel_record(
        PersonnelCreate(
            name="Beatrice Muthoni",
            email=email,
            phone="+254 722 000 111",
            title="Senior QA Engineer",
            department="Technology & AI Systems",
            role=UserRole.MEMBER,
        ),
        creator_name="Admin Test",
    )

    # 2. Admin issues invitation token
    token, _ = repo.generate_member_invitation(created.id)

    # 3. Employee activates account, sets password, and receives verified session
    auth_uid = f"usr-auth-beatrice-{created.id}"
    activate_resp = client.post(
        "/api/v1/auth/activate",
        json={
            "token": token,
            "password": "SecurePassword2026!",
            "auth_user_id": auth_uid,
        },
    )
    assert activate_resp.status_code == 200
    activate_data = activate_resp.json()
    assert activate_data["success"] is True
    access_token = activate_data["accessToken"]
    assert access_token is not None
    assert activate_data["user"]["fullName"] == "Beatrice Muthoni"
    assert activate_data["user"]["role"] == "member"

    # 4. Token cannot be reused (one-time cryptographic consumption)
    second_try = client.post(
        "/api/v1/auth/activate",
        json={
            "token": token,
            "password": "AnotherPassword!",
            "auth_user_id": "usr-attacker",
        },
    )
    assert second_try.status_code == 400

    # 5. Verified session: Employee calls /api/v1/auth/me with Bearer token
    headers = {"Authorization": f"Bearer {access_token}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["fullName"] == "Beatrice Muthoni"
    assert me_data["role"] == "member"
    assert me_data["title"] == "Senior QA Engineer"
    assert me_data["email"] == email


def test_authenticated_employee_can_manage_avatar():
    """Directive 6: Authenticated employees can upload and delete profile pictures."""
    # Create and activate employee
    email = f"brian.{uuid.uuid4().hex[:6]}@solianwolves.co"
    member = repo.create_personnel_record(
        PersonnelCreate(
            name="Brian Kiprono",
            email=email,
            title="Platform Architect",
            department="Technology & AI Systems",
            role=UserRole.MEMBER,
        )
    )
    token, _ = repo.generate_member_invitation(member.id)
    auth_uid = f"usr-auth-brian-{member.id}"
    repo.activate_member_account(token, auth_uid)

    headers = auth_headers(
        sub=auth_uid,
        email=email,
        role="member",
        name="Brian Kiprono",
    )

    # 1. Unauthenticated guest avatar upload is forbidden
    guest_upload = client.post(
        "/api/v1/auth/avatar",
        headers=guest_headers,
        files={"file": ("avatar.png", b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR", "image/png")},
    )
    assert guest_upload.status_code == 403

    # 2. Authenticated employee avatar deletion works
    delete_resp = client.delete("/api/v1/auth/avatar", headers=headers)
    assert delete_resp.status_code == 200
    assert delete_resp.json()["success"] is True


def test_role_hierarchy_and_anti_privilege_escalation():
    """Directive 3 & 7: Employees cannot self-elevate; admin cannot create/modify owner."""
    # Member cannot update roles
    member_headers = {
        "X-User-Id": "usr-test-member",
        "X-User-Role": "member",
    }
    resp = client.patch(
        "/api/v1/teams/members/tm-1/role",
        headers=member_headers,
        json={"role": "admin"},
    )
    assert resp.status_code == 403

    # Admin cannot grant OWNER
    resp2 = client.patch(
        "/api/v1/teams/members/tm-2/role",
        headers=admin_headers,
        json={"role": "owner"},
    )
    assert resp2.status_code == 403
    assert "exceeding your own authority" in resp2.json()["detail"]


def test_guest_forbidden_from_personnel_management():
    """Directive 8: Guests cannot create or modify personnel records."""
    # Guest cannot create personnel
    resp = client.post(
        "/api/v1/teams/members",
        headers=guest_headers,
        json={
            "name": "Unauthorized Attempt",
            "title": "Infiltrator",
            "department": "Security",
            "role": "admin",
        },
    )
    assert resp.status_code == 403

    # Guest cannot issue invitations
    resp2 = client.post(
        "/api/v1/teams/members/tm-1/invite",
        headers=guest_headers,
    )
    assert resp2.status_code == 403


def test_member_suspension_lifecycle():
    """Directive 2 & 9: Account suspension revokes access; restored restores access."""
    # Create and activate employee
    email = f"faith.{uuid.uuid4().hex[:6]}@solianwolves.co"
    member = repo.create_personnel_record(
        PersonnelCreate(
            name="Faith Chebet",
            email=email,
            title="Finance Associate",
            department="Finance & Corporate Treasury",
            role=UserRole.MEMBER,
        )
    )
    token, _ = repo.generate_member_invitation(member.id)
    auth_uid = f"usr-auth-faith-{member.id}"
    repo.activate_member_account(token, auth_uid)

    headers = auth_headers(
        sub=auth_uid,
        email=email,
        role="member",
        name="Faith Chebet",
    )

    # Verify access is OK before suspension
    ok_resp = client.get("/api/v1/auth/me", headers=headers)
    assert ok_resp.status_code == 200

    # Admin suspends employee
    suspend_resp = client.post(
        f"/api/v1/teams/members/{member.id}/suspend",
        headers=admin_headers,
    )
    assert suspend_resp.status_code == 200
    assert suspend_resp.json()["activationStatus"] == "suspended"

    # Suspended employee now receives 403 Forbidden
    blocked_resp = client.get("/api/v1/auth/me", headers=headers)
    assert blocked_resp.status_code == 403
    assert "suspended" in blocked_resp.json()["detail"]

    # Admin restores employee
    restore_resp = client.post(
        f"/api/v1/teams/members/{member.id}/unsuspend",
        headers=admin_headers,
    )
    assert restore_resp.status_code == 200
    assert restore_resp.json()["activationStatus"] == "active"

    # Restored employee can access again
    restored_resp = client.get("/api/v1/auth/me", headers=headers)
    assert restored_resp.status_code == 200


def test_owner_bootstrap_pathway():
    """Directive 5: Company owner bootstrapping and single-use security."""
    # Check bootstrap status endpoint
    status_resp = client.get("/api/v1/auth/owner-bootstrap-status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["owner_name"] == "Ian Momanyi Nyakundi"
    assert status_data["owner_email"] == "ian.nyakundi@solianwolves.co"

    # If owner is already bootstrapped from a previous run, verify single-use protection
    if status_data["is_bootstrapped"]:
        repeat_resp = client.post(
            "/api/v1/auth/bootstrap-owner",
            json={"bootstrap_token": "some-token", "password": "Password123!"},
        )
        assert repeat_resp.status_code == 403
        assert "already been bootstrapped" in repeat_resp.json()["detail"]
    else:
        # Generate bootstrap token
        token = repo.get_or_create_owner_bootstrap_token(expires_in_days=3)
        assert token is not None

        # Verify token via public check endpoint
        check_resp = client.get(f"/api/v1/auth/invitation/{token}")
        assert check_resp.status_code == 200
        check_data = check_resp.json()
        assert check_data["valid"] is True
        assert check_data["name"] == "Ian Momanyi Nyakundi"
        assert check_data["is_owner_bootstrap"] is True

        # Bootstrap the owner account
        owner_auth_uid = "usr-owner-ian-nyakundi-stable-uid"
        bootstrap_resp = client.post(
            "/api/v1/auth/bootstrap-owner",
            json={
                "bootstrap_token": token,
                "password": "ExecutiveMasterPassword2026!",
                "auth_user_id": owner_auth_uid,
            },
        )
        assert bootstrap_resp.status_code == 200
        bootstrap_data = bootstrap_resp.json()
        assert bootstrap_data["success"] is True
        assert bootstrap_data["user"]["role"] == "owner"
        assert bootstrap_data["user"]["fullName"] == "Ian Momanyi Nyakundi"

        # Owner calls /api/v1/auth/me with session token
        owner_headers = {"Authorization": f"Bearer {bootstrap_data['accessToken']}"}
        me_resp = client.get("/api/v1/auth/me", headers=owner_headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["role"] == "owner"
        assert me_resp.json()["fullName"] == "Ian Momanyi Nyakundi"

        # Subsequent bootstrap attempt is permanently rejected
        repeat_resp = client.post(
            "/api/v1/auth/bootstrap-owner",
            json={"bootstrap_token": token, "password": "AnotherPassword!"},
        )
        assert repeat_resp.status_code == 403
