"""Unit and Integration Tests for Company Email, Drafts, and AI Assistance."""
import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.email import EmailDraftCreate

client = TestClient(app)


def test_email_provider_status_disconnected_by_default():
    """Verify that provider status honestly reports disconnected when no SMTP/OAuth credentials are set."""
    headers = {"X-User-Role": "member", "X-User-Id": "usr-test-email"}
    resp = client.get("/api/v1/email/status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["provider_type"] in ("none", "smtp")
    if data["provider_type"] == "none":
        assert data["is_connected"] is False
        assert "No external email provider configured" in data["status_message"]
        assert len(data["required_configs"]) > 0


def test_email_empty_inbox_when_disconnected():
    """Verify that the system does not fabricate fake incoming emails."""
    headers = {"X-User-Role": "member", "X-User-Id": "usr-test-email"}
    resp = client.get("/api/v1/email/messages?folder=inbox", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["folder"] == "inbox"
    assert isinstance(data["messages"], list)
    assert "providerStatus" in data


def test_email_send_blocked_when_disconnected():
    """Verify that send is blocked with clear instructions when provider is not configured."""
    # Ensure test bypass is disabled
    old_val = os.environ.get("SOLIAN_ENABLE_TEST_EMAIL_SEND")
    os.environ.pop("SOLIAN_ENABLE_TEST_EMAIL_SEND", None)

    headers = {"X-User-Role": "member", "X-User-Id": "usr-test-email"}
    payload = {
        "to_addresses": ["board@solianwolves.co"],
        "subject": "Q4 Strategy Update",
        "body": "Dear Board, please review our deliverables.",
    }
    resp = client.post("/api/v1/email/send", json=payload, headers=headers)
    assert resp.status_code == 400
    assert "No active email provider configured" in resp.json()["detail"]

    if old_val:
        os.environ["SOLIAN_ENABLE_TEST_EMAIL_SEND"] = old_val


def test_email_drafts_crud_lifecycle():
    """Verify complete lifecycle of email drafts: Create -> Get -> Update -> List -> Delete."""
    headers = {"X-User-Role": "member", "X-User-Id": "usr-draft-tester"}

    # 1. Create Draft
    create_payload = {
        "to_addresses": ["hillary.isaiah@solianwolves.co"],
        "cc_addresses": ["alice.moraa@solianwolves.co"],
        "subject": "Weekly Operations Sync Agenda",
        "body": "Hi Hillary, here is our draft agenda for tomorrow.",
    }
    create_resp = client.post("/api/v1/email/drafts", json=create_payload, headers=headers)
    assert create_resp.status_code == 201
    draft = create_resp.json()
    draft_id = draft["id"]
    assert draft["subject"] == "Weekly Operations Sync Agenda"
    assert "hillary.isaiah@solianwolves.co" in draft["to_addresses"]

    # 2. Get Draft
    get_resp = client.get(f"/api/v1/email/drafts/{draft_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == draft_id

    # 3. Update Draft
    update_payload = {
        "subject": "Updated: Weekly Operations Sync Agenda",
        "body": "Hi Hillary, updated agenda with finance report item added.",
    }
    update_resp = client.put(f"/api/v1/email/drafts/{draft_id}", json=update_payload, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["subject"] == "Updated: Weekly Operations Sync Agenda"

    # 4. List Drafts
    list_resp = client.get("/api/v1/email/drafts", headers=headers)
    assert list_resp.status_code == 200
    draft_ids = [d["id"] for d in list_resp.json()]
    assert draft_id in draft_ids

    # 5. Delete Draft
    del_resp = client.delete(f"/api/v1/email/drafts/{draft_id}", headers=headers)
    assert del_resp.status_code == 204

    # 6. Verify 404 after deletion
    get_after_del = client.get(f"/api/v1/email/drafts/{draft_id}", headers=headers)
    assert get_after_del.status_code == 404


def test_ai_email_assistance_actions():
    """Verify AI assistance actions (draft, improve, summarize, extract_action_items)."""
    headers = {"X-User-Role": "member", "X-User-Id": "usr-ai-tester"}

    # 1. Draft
    draft_req = {
        "action": "draft",
        "prompt": "Quarterly cloud migration project status for executive leadership",
        "tone": "executive",
    }
    draft_res = client.post("/api/v1/email/ai/assist", json=draft_req, headers=headers)
    assert draft_res.status_code == 200
    data = draft_res.json()
    assert data["action"] == "draft"
    assert "Solian Wolves" in data["content"]
    assert len(data["action_items"]) > 0

    # 2. Improve tone
    improve_req = {
        "action": "improve",
        "email_text": "Hey guys we need the reports by tomorrow ok?",
        "tone": "executive",
    }
    imp_res = client.post("/api/v1/email/ai/assist", json=improve_req, headers=headers)
    assert imp_res.status_code == 200
    assert imp_res.json()["action"] == "improve"
    assert len(imp_res.json()["content"]) > len(improve_req["email_text"])

    # 3. Summarize
    sum_req = {
        "action": "summarize",
        "email_text": (
            "We have completed Phase 1 of the infrastructure audit. All personal and company resources "
            "are partitioned. Next milestone is database migration on Friday."
        ),
    }
    sum_res = client.post("/api/v1/email/ai/assist", json=sum_req, headers=headers)
    assert sum_res.status_code == 200
    assert "EXECUTIVE SUMMARY" in sum_res.json()["content"]

    # 4. Extract action items
    extract_req = {
        "action": "extract_action_items",
        "email_text": (
            "Please review the attached invoice.\n"
            "Action 1: Confirm payment with bank by Thursday.\n"
            "Action 2: Update finance ledger."
        ),
    }
    ext_res = client.post("/api/v1/email/ai/assist", json=extract_req, headers=headers)
    assert ext_res.status_code == 200
    assert len(ext_res.json()["action_items"]) >= 2


def test_email_send_in_test_mode():
    """Verify that when test email dispatch is enabled, outbound email persists into sent folder."""
    os.environ["SOLIAN_ENABLE_TEST_EMAIL_SEND"] = "1"
    headers = {"X-User-Role": "member", "X-User-Id": "usr-test-sender"}

    payload = {
        "to_addresses": ["client.relations@solianwolves.co"],
        "subject": "Official Company Transmittal",
        "body": "Please find the requested transmittal documentation attached.",
    }
    resp = client.post("/api/v1/email/send", json=payload, headers=headers)
    assert resp.status_code == 200
    result = resp.json()
    assert result["success"] is True

    # Check sent folder
    sent_resp = client.get("/api/v1/email/messages?folder=sent", headers=headers)
    assert sent_resp.status_code == 200
    messages = sent_resp.json()["messages"]
    subjects = [m["subject"] for m in messages]
    assert "Official Company Transmittal" in subjects

    os.environ.pop("SOLIAN_ENABLE_TEST_EMAIL_SEND", None)

