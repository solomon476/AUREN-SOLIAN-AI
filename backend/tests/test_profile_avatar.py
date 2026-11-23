"""Unit and Integration Tests for Profile Avatar Upload & Management."""
import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.services.storage.sqlite_repository import repo
from app.services.storage.avatar_storage import avatar_storage

client = TestClient(app)


def create_test_image(format="PNG", size=(300, 300), color=(180, 140, 20)) -> bytes:
    """Generates an in-memory valid test image."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def test_avatar_upload_success():
    """Verify that a valid user can upload a profile picture and receive a WebP URL."""
    img_bytes = create_test_image(format="PNG", size=(600, 400))
    files = {"file": ("test_avatar.png", img_bytes, "image/png")}
    headers = {"X-User-Id": "usr-1"}

    resp = client.post("/api/v1/auth/avatar", files=files, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert data["avatarUrl"].startswith("/api/v1/auth/avatar/avatar_usr-1_")
    assert data["avatarUrl"].endswith(".webp")

    # Verify user profile reflects updated avatar
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["avatarUrl"] == data["avatarUrl"]


def test_avatar_serve_image():
    """Verify that the served avatar endpoint returns valid image/webp with cache headers."""
    img_bytes = create_test_image(format="JPEG", size=(200, 200))
    files = {"file": ("avatar.jpg", img_bytes, "image/jpeg")}
    headers = {"X-User-Id": "usr-2"}

    upload_resp = client.post("/api/v1/auth/avatar", files=files, headers=headers)
    assert upload_resp.status_code == 200
    url = upload_resp.json()["avatarUrl"]
    filename = url.split("/")[-1]

    serve_resp = client.get(f"/api/v1/auth/avatar/{filename}")
    assert serve_resp.status_code == 200
    assert serve_resp.headers["content-type"] == "image/webp"
    assert "public, max-age=86400" in serve_resp.headers.get("cache-control", "")
    assert len(serve_resp.content) > 0


def test_avatar_invalid_format_rejection():
    """Verify that text files or fake image files are rejected with 400."""
    fake_bytes = b"This is not a real image file, just plain text."
    files = {"file": ("fake.txt", fake_bytes, "text/plain")}
    headers = {"X-User-Id": "usr-1"}

    resp = client.post("/api/v1/auth/avatar", files=files, headers=headers)
    assert resp.status_code == 400
    assert "Unsupported file type" in resp.json()["detail"]


def test_avatar_corrupted_image_rejection():
    """Verify that corrupted image bytes with image MIME type are rejected."""
    corrupted_bytes = b"\x89PNG\r\n\x1a\nCorrupted binary payload that is not valid PNG"
    files = {"file": ("corrupt.png", corrupted_bytes, "image/png")}
    headers = {"X-User-Id": "usr-1"}

    resp = client.post("/api/v1/auth/avatar", files=files, headers=headers)
    assert resp.status_code == 400
    assert "Invalid or corrupted image" in resp.json()["detail"]


def test_avatar_path_traversal_defense():
    """Verify that path traversal attempts on avatar serve return 404."""
    resp = client.get("/api/v1/auth/avatar/..%2F..%2Fmain.py")
    assert resp.status_code in (404, 400)


def test_avatar_delete_and_reset():
    """Verify that a user can delete their avatar and it resets to None."""
    img_bytes = create_test_image(format="PNG", size=(100, 100))
    files = {"file": ("avatar.png", img_bytes, "image/png")}
    headers = {"X-User-Id": "usr-1"}

    # Upload first
    client.post("/api/v1/auth/avatar", files=files, headers=headers)

    # Delete
    del_resp = client.delete("/api/v1/auth/avatar", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["avatarUrl"] is None

    # Verify me reflects null avatar
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.json()["avatarUrl"] is None


def test_avatar_authorization_boundary():
    """Verify that non-admin/owner managers/members cannot change another member's avatar."""
    img_bytes = create_test_image(format="PNG", size=(100, 100))
    files = {"file": ("avatar.png", img_bytes, "image/png")}
    data = {"target_user_id": "usr-1"}
    headers = {"X-User-Role": "member", "X-User-Id": "usr-member"}

    resp = client.post("/api/v1/auth/avatar", files=files, data=data, headers=headers)
    assert resp.status_code == 403
    assert "Administrative permissions required" in resp.json()["detail"]
