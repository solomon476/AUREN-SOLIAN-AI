"""Database migration runner and schema version tracking for AUREN SOLIAN.

Ensures deterministic, repeatable database schema transitions across environments.
Includes automated pre-migration backup for SQLite databases and tracking in schema_migrations.
"""
import hashlib
import logging
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.db.backup import backup_sqlite_database
from app.db.connection import DatabaseManager, db_manager

logger = logging.getLogger("auren.db.migrations")


def get_default_migrations_dir() -> Path:
    """Returns the default SQL migrations directory in backend/migrations."""
    base_dir = Path(__file__).resolve().parent.parent.parent
    migrations_dir = base_dir / "migrations"
    migrations_dir.mkdir(parents=True, exist_ok=True)
    return migrations_dir


class MigrationManager:
    """Manages schema migrations and version tracking."""

    def __init__(self, manager: Optional[DatabaseManager] = None):
        self.db = manager or db_manager

    def init_migration_table(self, conn) -> None:
        """Initializes the schema_migrations tracking table if it does not already exist."""
        cur = conn.cursor()
        if self.db.dialect == "postgres":
            cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                checksum VARCHAR(64)
            );
            """)
        else:
            cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL,
                checksum TEXT
            );
            """)
        conn.commit()

    def get_applied_migrations(self, conn) -> List[Dict[str, Any]]:
        """Returns a list of all migrations recorded in schema_migrations."""
        self.init_migration_table(conn)
        cur = conn.cursor()
        cur.execute("SELECT version, name, applied_at, checksum FROM schema_migrations ORDER BY version ASC;")
        rows = cur.fetchall()
        applied = []
        for r in rows:
            if isinstance(r, (sqlite3.Row, dict)):
                applied.append({
                    "version": r["version"],
                    "name": r["name"],
                    "applied_at": r["applied_at"],
                    "checksum": r["checksum"],
                })
            else:
                applied.append({
                    "version": r[0],
                    "name": r[1],
                    "applied_at": r[2],
                    "checksum": r[3],
                })
        return applied

    def discover_migrations(self, migrations_dir: Optional[str] = None) -> List[Path]:
        """Discovers all .sql migration files in the migrations directory ordered by filename."""
        target_dir = Path(migrations_dir) if migrations_dir else get_default_migrations_dir()
        if not target_dir.exists():
            return []
        files = [f for f in target_dir.glob("*.sql") if f.is_file()]
        return sorted(files, key=lambda p: p.name)

    def compute_checksum(self, sql_content: str) -> str:
        """Computes SHA-256 hash of migration script content."""
        return hashlib.sha256(sql_content.strip().encode("utf-8")).hexdigest()

    def get_migration_status(self, migrations_dir: Optional[str] = None) -> Dict[str, Any]:
        """Inspects applied vs pending migrations without applying changes."""
        with self.db.connection() as conn:
            applied_records = self.get_applied_migrations(conn)
            applied_versions = {r["version"] for r in applied_records}
            available_files = self.discover_migrations(migrations_dir)

            pending = []
            for file_path in available_files:
                version = file_path.name.split("_")[0]
                if version not in applied_versions:
                    pending.append({
                        "version": version,
                        "filename": file_path.name,
                        "path": str(file_path),
                    })

            return {
                "dialect": self.db.dialect,
                "applied_count": len(applied_records),
                "applied": applied_records,
                "pending_count": len(pending),
                "pending": pending,
            }

    def run_migrations(
        self,
        migrations_dir: Optional[str] = None,
        create_backup: bool = True,
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """
        Executes all pending migrations in chronological order.
        If SQLite, takes an automated backup prior to executing changes.
        """
        with self.db.connection() as conn:
            self.init_migration_table(conn)
            applied_records = self.get_applied_migrations(conn)
            applied_versions = {r["version"] for r in applied_records}
            available_files = self.discover_migrations(migrations_dir)

            pending_files = []
            for f in available_files:
                version = f.name.split("_")[0]
                if version not in applied_versions:
                    pending_files.append(f)

            if not pending_files:
                logger.info("No pending database migrations found. Schema is up to date.")
                return {
                    "status": "up_to_date",
                    "applied_now": [],
                    "total_applied": len(applied_records),
                    "backup_path": None,
                }

            # If SQLite and pending migrations exist, perform safety backup
            backup_file = None
            if self.db.dialect == "sqlite" and create_backup and not dry_run:
                backup_file = backup_sqlite_database(
                    source_path=self.db.database_path,
                    tag="pre_migration",
                )

            if dry_run:
                return {
                    "status": "dry_run",
                    "would_apply": [f.name for f in pending_files],
                    "backup_path": backup_file,
                }

            applied_now = []
            cur = conn.cursor()
            for script_path in pending_files:
                version = script_path.name.split("_")[0]
                name = script_path.name
                logger.info(f"Applying migration: {name}...")

                with open(script_path, "r", encoding="utf-8") as f:
                    sql_content = f.read()

                checksum = self.compute_checksum(sql_content)

                # Execute migration script
                if self.db.dialect == "sqlite":
                    cur.executescript(sql_content)
                    now_str = datetime.now(timezone.utc).isoformat()
                    cur.execute(
                        "INSERT INTO schema_migrations (version, name, applied_at, checksum) VALUES (?, ?, ?, ?);",
                        (version, name, now_str, checksum),
                    )
                else:
                    cur.execute(sql_content)
                    cur.execute(
                        "INSERT INTO schema_migrations (version, name, applied_at, checksum) VALUES (%s, %s, NOW(), %s);",
                        (version, name, checksum),
                    )

                conn.commit()
                applied_now.append(name)
                logger.info(f"Successfully applied migration: {name}")

            return {
                "status": "success",
                "applied_now": applied_now,
                "total_applied": len(applied_records) + len(applied_now),
                "backup_path": backup_file,
            }


migration_manager = MigrationManager()


def run_migrations(migrations_dir: Optional[str] = None, create_backup: bool = True) -> Dict[str, Any]:
    """Convenience helper to run pending migrations."""
    return migration_manager.run_migrations(migrations_dir=migrations_dir, create_backup=create_backup)


def get_migration_status(migrations_dir: Optional[str] = None) -> Dict[str, Any]:
    """Convenience helper to inspect migration status."""
    return migration_manager.get_migration_status(migrations_dir=migrations_dir)
