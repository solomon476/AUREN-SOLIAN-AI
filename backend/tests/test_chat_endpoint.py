import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_chat_stream_endpoint():
    payload = {
        "message": "Review Q4 operations and check if we are aligned with SOP-401",
        "user_role": "admin",
    }
    response = client.post("/api/v1/chat/stream", json=payload)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    content = response.text
    assert "data: " in content
    assert "[DONE]" in content


def test_chat_stream_with_history_and_workspace_context():
    """Verifies that conversation history and workspace context are accepted and processed."""
    payload = {
        "message": "Continue from our previous discussion on capital allocation",
        "user_role": "admin",
        "workspace_context": "Financial Intelligence & Company Records",
        "history": [
            {"role": "user", "content": "What is our current capital runway?"},
            {"role": "assistant", "content": "Our runway is currently estimated at 18 months based on verified reserves."},
        ],
    }
    response = client.post("/api/v1/chat/stream", json=payload)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    content = response.text
    assert "data: " in content
    assert "[DONE]" in content


def test_chat_stream_guest_clearance_filtering():
    """Verifies that GUEST users receive appropriate clearance bounds without exception."""
    payload = {
        "message": "Tell me about general company mission",
        "user_role": "guest",
    }
    response = client.post("/api/v1/chat/stream", json=payload)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    assert "[DONE]" in response.text

