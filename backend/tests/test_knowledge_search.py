import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_knowledge_retrieval_all():
    response = client.get("/api/v1/knowledge/items")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 4


def test_knowledge_search_query():
    response = client.get("/api/v1/knowledge/items?q=escalation")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 1
    assert "SOP-401" in items[0]["title"]
