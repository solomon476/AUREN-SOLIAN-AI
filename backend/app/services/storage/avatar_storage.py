"""Secure Avatar and Profile Picture Storage Service for AUREN SOLIAN.

Features:
- Validates image MIME type and content bytes (JPEG, PNG, WebP)
- Strict file size limit (5MB max)
- Pillow sanitization (EXIF stripping, format normalization to WebP, dimension bounding to 512x512)
- Collision-resistant, path-safe filename generation
- Path traversal defense
- Safe deletion and cleanup of superseded pictures
"""
import os
import uuid
import time
import io
import re
from pathlib import Path
from typing import Optional, Tuple
from PIL import Image

# Max upload limit: 5 Megabytes
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5,242,880 bytes
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
AVATAR_DIMENSIONS = (512, 512)

# Dedicated storage directory
STORAGE_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "uploads" / "avatars"


class AvatarStorageService:
    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = (storage_dir or STORAGE_ROOT).resolve()
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _sanitize_user_id(self, user_id: str) -> str:
        """Strip any non-alphanumeric characters to prevent path tampering."""
        clean = re.sub(r"[^a-zA-Z0-9_\-]", "", user_id)
        return clean or "user"

    def validate_file(self, content_type: Optional[str], size: int) -> Tuple[bool, Optional[str]]:
        """Validates file MIME type and size boundaries."""
        if size <= 0:
            return False, "Uploaded file is empty."
        if size > MAX_FILE_SIZE:
            return False, f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE // (1024 * 1024)}MB."
        if not content_type or content_type.lower() not in ALLOWED_MIME_TYPES:
            return False, f"Unsupported file type '{content_type}'. Supported formats: JPEG, PNG, WebP."
        return True, None

    def process_and_save_image(self, file_bytes: bytes, user_id: str) -> Tuple[str, str]:
        """
        Sanitizes image bytes, resizes/crops, strips metadata, and writes a WebP image.
        Returns (filename, relative_url).
        """
        if len(file_bytes) > MAX_FILE_SIZE:
            raise ValueError(f"File size exceeds limit of {MAX_FILE_SIZE // (1024 * 1024)}MB.")

        try:
            image = Image.open(io.BytesIO(file_bytes))
            image.verify()  # Verify integrity
            # Reopen after verify
            image = Image.open(io.BytesIO(file_bytes))
        except Exception as e:
            raise ValueError(f"Invalid or corrupted image file: {str(e)}")

        # Normalize format / mode
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            # Convert transparent png/webp preserving alpha
            image = image.convert("RGBA")
        else:
            image = image.convert("RGB")

        # Resize preserving aspect ratio or center square crop
        width, height = image.size
        min_dim = min(width, height)
        # Center crop to square
        left = (width - min_dim) // 2
        top = (height - min_dim) // 2
        right = left + min_dim
        bottom = top + min_dim
        image = image.crop((left, top, right, bottom))

        # Downscale to 512x512 with high-quality resampling
        if min_dim > 512:
            image = image.resize(AVATAR_DIMENSIONS, Image.Resampling.LANCZOS)

        # Generate safe filename
        safe_uid = self._sanitize_user_id(user_id)
        timestamp = int(time.time())
        unique_token = uuid.uuid4().hex[:8]
        filename = f"avatar_{safe_uid}_{timestamp}_{unique_token}.webp"

        target_path = (self.storage_dir / filename).resolve()
        # Path traversal guard
        if not str(target_path).startswith(str(self.storage_dir)):
            raise SecurityError("Detected path traversal attempt.")

        # Save as WebP with 85% quality and stripped metadata
        image.save(target_path, format="WEBP", quality=85, method=6)

        relative_url = f"/api/v1/auth/avatar/{filename}"
        return filename, relative_url

    def get_avatar_path(self, filename: str) -> Optional[Path]:
        """Safely resolves an avatar file path, preventing directory traversal."""
        # Sanitize filename - allow only safe pattern
        clean_name = os.path.basename(filename)
        if not re.match(r"^avatar_[a-zA-Z0-9_\-]+\.webp$", clean_name):
            return None

        target_path = (self.storage_dir / clean_name).resolve()
        if not str(target_path).startswith(str(self.storage_dir)):
            return None

        if target_path.is_file():
            return target_path
        return None

    def delete_avatar(self, filename: str) -> bool:
        """Deletes an avatar file safely."""
        path = self.get_avatar_path(filename)
        if path and path.is_file():
            try:
                path.unlink()
                return True
            except OSError:
                return False
        return False


avatar_storage = AvatarStorageService()

