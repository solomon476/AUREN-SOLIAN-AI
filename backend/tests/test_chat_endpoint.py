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
