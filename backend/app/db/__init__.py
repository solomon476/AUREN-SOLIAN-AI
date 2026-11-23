"""AUREN SOLIAN Enterprise Database & Persistence Package.

Provides database connectivity management, point-in-time SQLite backups,
and deterministic schema migration runners for SQLite and PostgreSQL/Supabase.
"""
from app.db.connection import DatabaseManager, db_manager
from app.db.backup import backup_sqlite_database, list_backups
from app.db.migrations import (
    MigrationManager,
    migration_manager,
    run_migrations,
    get_migration_status,
)

__all__ = [
    "DatabaseManager",
    "db_manager",
    "backup_sqlite_database",
    "list_backups",
    "MigrationManager",
    "migration_manager",
    "run_migrations",
    "get_migration_status",
]

