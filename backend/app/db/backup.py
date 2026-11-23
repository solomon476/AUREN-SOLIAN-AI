"""Database backup utilities for AUREN SOLIAN.

Provides non-destructive point-in-time snapshots of SQLite development databases
prior to applying schema migrations or maintenance routines.
"""
import os
import shutil
import sqlite3
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

from app.core.config import settings

logger = logging.getLogger("auren.db.backup")


def get_default_backup_dir() -> Path:
    """Returns the default backups directory inside backend/backups."""
    base_dir = Path(__file__).resolve().parent.parent.parent
    backup_dir = base_dir / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    return backup_dir


def backup_sqlite_database(
    source_path: Optional[str] = None,
    backup_dir: Optional[str] = None,
    tag: str = "pre_migration",
) -> Optional[str]:
    """
    Creates an atomic, consistent point-in-time snapshot of the SQLite database.
    Uses SQLite's native backup API to ensure ACID consistency without blocking writes.
    
    Returns the absolute path to the newly created backup file.
    """
    db_path = source_path or settings.DATABASE_PATH
    if not os.path.exists(db_path):
        logger.warning(f"Database file does not exist at {db_path}; skipping backup.")
        return None

    target_dir = Path(backup_dir) if backup_dir else get_default_backup_dir()
    target_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    base_name = Path(db_path).stem
    backup_filename = f"{base_name}_{tag}_{timestamp}.db"
    backup_filepath = target_dir / backup_filename

    try:
        # Utilize SQLite native online backup API
        source_conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        dest_conn = sqlite3.connect(str(backup_filepath))
        with dest_conn:
            source_conn.backup(dest_conn, pages=100)
        source_conn.close()
        dest_conn.close()

        file_size_kb = os.path.getsize(str(backup_filepath)) / 1024.0
        logger.info(
            f"Successfully created SQLite backup: {backup_filepath.name} ({file_size_kb:.1f} KB)"
        )
        return str(backup_filepath)
    except Exception as e:
        logger.warning(f"Native SQLite backup failed ({e}); falling back to safe file copy.")
        try:
            shutil.copy2(db_path, str(backup_filepath))
            return str(backup_filepath)
        except Exception as copy_err:
            logger.error(f"Failed to create backup copy: {copy_err}")
            raise RuntimeError(f"Database backup failed: {copy_err}") from copy_err


def list_backups(backup_dir: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns a list of existing database backups with metadata."""
    target_dir = Path(backup_dir) if backup_dir else get_default_backup_dir()
    if not target_dir.exists():
        return []

    backups = []
    for f in sorted(target_dir.glob("*.db"), key=os.path.getmtime, reverse=True):
        stat = f.stat()
        backups.append({
            "filename": f.name,
            "filepath": str(f.resolve()),
            "size_bytes": stat.st_size,
            "size_kb": round(stat.st_size / 1024.0, 2),
            "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        })
    return backups
