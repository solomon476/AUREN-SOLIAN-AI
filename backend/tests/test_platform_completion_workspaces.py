"""Tests for AUREN SOLIAN Full Platform Completion Workspaces.

Covers:
- Meetings & Minutes workspace (CRUD, convert action item to task, publish decision to knowledge).
- Internal Discussions & Strategic Threads (channels, posting, threaded replies).
- Enterprise Notifications Center (dispatch, list, mark read, mark all read).
- Cross-workspace capabilities (Unified Search, Operational Calendar).
- Member invitation and operational status updates.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token, UserRole
from app.models.meetings import MeetingCreate, MeetingActionItem, MeetingDecision
from app.models.discussions import DiscussionMessageCreate
from app.models.notifications import NotificationCreate
from app.models.organization import MemberInviteCreate
from app.services.storage.sqlite_repository import repo


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def owner_headers():
    token = create_access_token(
        data={"sub": "usr-1", "email": "solomon@solian.ai", "role": "owner", "full_name": "Solomon K."}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers():
    token = create_access_token(
        data={"sub": "usr-2", "email": "s.chen@solian.ai", "role": "admin", "full_name": "Sarah Chen"}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def member_headers():
    from app.services.storage.sqlite_repository import repo
    from app.models.organization import PersonnelCreate
    email = "test.platform.member@solianwolves.co"
    member = next((m for m in repo.list_members() if m.email == email), None)
    if not member:
        member = repo.create_personnel_record(
            PersonnelCreate(
                name="Platform Test Member",
                email=email,
                role=UserRole.MEMBER,
                department="Technology & AI Systems",
                title="Systems Associate",
            )
        )
    token = create_access_token(
        data={"sub": member.user_id, "email": member.email, "role": "member", "full_name": member.name}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def guest_headers():
    token = create_access_token(
        data={"sub": "usr-guest", "email": "guest@external.com", "role": "guest", "full_name": "Guest Observer"}
    )
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# Meetings & Minutes Tests
# =============================================================================
def test_list_and_get_meetings(client, member_headers):
    res = client.get("/api/v1/meetings", headers=member_headers)
    assert res.status_code == 200
    meetings = res.json()
    assert isinstance(meetings, list)
    assert len(meetings) >= 1

    first_id = meetings[0]["id"]
    detail_res = client.get(f"/api/v1/meetings/{first_id}", headers=member_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == first_id


def test_create_and_update_meeting(client, member_headers):
    payload = {
        "title": "Q1 Autonomous Systems Alignment",
        "meeting_type": "department",
        "date": "2026-12-01",
        "time": "15:00",
        "duration_minutes": 60,
        "location": "Virtual Briefing Room",
        "agenda": ["Review Sprint Metrics", "Architecture Signoff"],
        "attendees": ["Solomon K.", "David Ochieng"],
    }
    create_res = client.post("/api/v1/meetings", json=payload, headers=member_headers)
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    # Update meeting status and discussion notes
    update_res = client.patch(
        f"/api/v1/meetings/{created_id}",
        json={"status": "in_progress", "discussion_notes": "Reviewed core latency benchmarks."},
        headers=member_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "in_progress"


def test_convert_meeting_action_to_task(client, member_headers):
    # Retrieve a meeting with action items
    meetings = repo.list_meetings()
    target_meeting = None
    target_action = None
    for m in meetings:
        if m.action_items:
            target_meeting = m
            target_action = m.action_items[0]
            break

    assert target_meeting is not None
    assert target_action is not None

    res = client.post(
        f"/api/v1/meetings/{target_meeting.id}/action-items/{target_action.id}/convert-to-task",
        headers=member_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert "taskId" in data
    assert data["status"] in ("backlog", "in_progress", "todo")

    # Verify task exists in repository
    task = repo.list_tasks()
    matching = [t for t in task if t.id == data["taskId"]]
    assert len(matching) == 1


def test_publish_meeting_decision_to_knowledge(client, member_headers):
    # Retrieve a meeting with decisions
    meetings = repo.list_meetings()
    target_meeting = None
    target_decision = None
    for m in meetings:
        if m.decisions:
            target_meeting = m
            target_decision = m.decisions[0]
            break

    assert target_meeting is not None
    assert target_decision is not None

    res = client.post(
        f"/api/v1/meetings/{target_meeting.id}/decisions/{target_decision.id}/publish-to-knowledge",
        headers=member_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert "knowledgeItemId" in data
    assert "Governance" in data["category"]


# =============================================================================
# Discussions & Threads Tests
# =============================================================================
def test_list_discussion_channels(client, member_headers):
    res = client.get("/api/v1/discussions/channels", headers=member_headers)
    assert res.status_code == 200
    channels = res.json()
    assert len(channels) >= 3
    channel_ids = [c["id"] for c in channels]
    assert "general" in channel_ids
    assert "dept-eng" in channel_ids


def test_post_discussion_message_and_reply(client, member_headers):
    msg_payload = {
        "channel_type": "company",
        "channel_id": "general",
        "channel_name": "General Announcements",
        "title": "Platform Completion Verification",
        "content": "All operational services are compiling and active.",
        "is_pinned": False,
    }
    res = client.post("/api/v1/discussions/messages", json=msg_payload, headers=member_headers)
    assert res.status_code == 201
    created_id = res.json()["id"]

    # Threaded Reply
    reply_payload = {
        "channel_type": "company",
        "channel_id": "general",
        "channel_name": "General Announcements",
        "content": "Acknowledged. Verification in progress.",
        "parent_id": created_id,
    }
    reply_res = client.post("/api/v1/discussions/messages", json=reply_payload, headers=member_headers)
    assert reply_res.status_code == 201

    # Fetch messages in channel
    list_res = client.get("/api/v1/discussions/messages?channel_id=general", headers=member_headers)
    assert list_res.status_code == 200
    messages = list_res.json()
    ids = [m["id"] for m in messages]
    assert created_id in ids


# =============================================================================
# Notifications Center Tests
# =============================================================================
def test_notifications_dispatch_and_read_lifecycle(client, admin_headers, member_headers):
    import jwt
    token = member_headers["Authorization"].split(" ")[1]
    member_user_id = jwt.decode(token, options={"verify_signature": False})["sub"]
    notif_payload = {
        "user_id": member_user_id,
        "title": "System Audit Complete",
        "message": "All database queries validated.",
        "type": "system",
        "link_module": "dashboard",
        "priority": "normal",
    }
    create_res = client.post("/api/v1/notifications", json=notif_payload, headers=admin_headers)
    assert create_res.status_code == 201
    notif_id = create_res.json()["id"]

    # Member reads their notifications
    list_res = client.get("/api/v1/notifications", headers=member_headers)
    assert list_res.status_code == 200
    notifs = list_res.json()
    assert any(n["id"] == notif_id for n in notifs)

    # Mark as read
    read_res = client.patch(f"/api/v1/notifications/{notif_id}/read", headers=member_headers)
    assert read_res.status_code == 200
    assert read_res.json()["isRead"] is True

    # Mark all read
    mark_all_res = client.post("/api/v1/notifications/read-all", headers=member_headers)
    assert mark_all_res.status_code == 200


# =============================================================================
# Cross-Workspace: Unified Search & Operational Calendar
# =============================================================================
def test_unified_search_returns_multi_entity_matches(client, member_headers):
    res = client.get("/api/v1/search/unified?q=solian", headers=member_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_matches" in data
    assert data["total_matches"] >= 1
    assert "meetings" in data
    assert "projects" in data
    assert "tasks" in data


def test_operational_calendar_events_aggregation(client, member_headers):
    res = client.get("/api/v1/calendar/events", headers=member_headers)
    assert res.status_code == 200
    events = res.json()
    assert isinstance(events, list)
    types = {e["type"] for e in events}
    assert "meeting" in types or "task" in types or "project" in types


# =============================================================================
# Teams: Member Invitation and Operational Status Updates
# =============================================================================
def test_member_invite_and_status_update(client, admin_headers, member_headers):
    import uuid
    unique_email = f"hopper_{uuid.uuid4().hex[:6]}@solian.ai"
    invite_payload = {
        "name": "Grace Hopper",
        "email": unique_email,
        "role": "member",
        "title": "Systems Optimization Engineer",
        "department": "Engineering & AI Operations",
        "team": "Core AI Mesh",
        "responsibilities": ["Performance profiling", "Latency audits"],
    }
    invite_res = client.post("/api/v1/teams/members/invite", json=invite_payload, headers=admin_headers)
    assert invite_res.status_code == 201
    new_member_id = invite_res.json()["id"]

    # Status update by admin
    status_res = client.patch(
        f"/api/v1/teams/members/{new_member_id}/status",
        json={"status": "away"},
        headers=admin_headers,
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "away"


# =============================================================================
# Projects: Update Project Progress and Status
# =============================================================================
def test_project_update_progress_and_status(client, member_headers):
    # Fetch first project
    list_res = client.get("/api/v1/projects", headers=member_headers)
    assert list_res.status_code == 200
    projects = list_res.json()
    assert len(projects) > 0
    target_project = projects[0]

    # Update progress and status
    patch_res = client.patch(
        f"/api/v1/projects/{target_project['id']}",
        json={"progress": 85, "status": "review"},
        headers=member_headers,
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["progress"] == 85
    assert updated["status"] == "review"
