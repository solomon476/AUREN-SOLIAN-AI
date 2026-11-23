"""Unit tests for Database Architecture, Backups, and Migration Management (Phase 3A)."""
import os
import sqlite3
import tempfile
from pathlib import Path
import pytest

from app.db.connection import DatabaseManager
from app.db.backup import backup_sqlite_database, list_backups
from app.db.migrations import MigrationManager


@pytest.fixture
def temp_db_path():
    """Provides a path for a temporary, isolated SQLite database."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        path = f.name
    yield path
    if os.path.exists(path):
        os.remove(path)


@pytest.fixture
def temp_backup_dir():
    """Provides a temporary directory for database backups."""
    with tempfile.TemporaryDirectory() as d:
        yield d


def test_database_manager_connection_and_health(temp_db_path):
    """Verifies that DatabaseManager connects cleanly and passes health check."""
    mgr = DatabaseManager(database_path=temp_db_path)
    assert mgr.dialect == "sqlite"

    health = mgr.check_connection()
    assert health["status"] == "connected"
    assert health["dialect"] == "sqlite"
    assert health["ping"] == 1
    assert "latency_ms" in health


def test_sqlite_backup_creation(temp_db_path, temp_backup_dir):
    """Verifies that point-in-time SQLite backups are created atomically."""
    # Seed a small table in temp db
    conn = sqlite3.connect(temp_db_path)
    conn.execute("CREATE TABLE test_data (id INT, val TEXT);")
    conn.execute("INSERT INTO test_data VALUES (1, 'initial_state');")
    conn.commit()
    conn.close()

    backup_path = backup_sqlite_database(
        source_path=temp_db_path,
        backup_dir=temp_backup_dir,
        tag="test_snap",
    )
    assert backup_path is not None
    assert os.path.exists(backup_path)
    assert "test_snap" in backup_path

    # Verify backup contains the seeded data
    b_conn = sqlite3.connect(backup_path)
    row = b_conn.execute("SELECT val FROM test_data WHERE id=1;").fetchone()
    b_conn.close()
    assert row[0] == "initial_state"

    backups = list_backups(backup_dir=temp_backup_dir)
    assert len(backups) >= 1
    assert backups[0]["filename"] == os.path.basename(backup_path)


def test_backup_restoration_procedure(temp_db_path, temp_backup_dir):
    """
    Tests full backup restoration workflow:
    1. Creates initial state with data.
    2. Takes a backup snapshot.
    3. Simulates destructive data loss.
    4. Restores from backup.
    5. Confirms complete data recovery.
    """
    import shutil
    conn = sqlite3.connect(temp_db_path)
    conn.execute("CREATE TABLE critical_records (id INT PRIMARY KEY, name TEXT);")
    conn.execute("INSERT INTO critical_records VALUES (1, 'Solian Wolves Master Record');")
    conn.commit()
    conn.close()

    # Step 2: Take snapshot
    snap_path = backup_sqlite_database(
        source_path=temp_db_path,
        backup_dir=temp_backup_dir,
        tag="pre_incident",
    )
    assert snap_path is not None

    # Step 3: Simulate accidental data loss
    conn = sqlite3.connect(temp_db_path)
    conn.execute("DELETE FROM critical_records;")
    conn.commit()
    count_after_loss = conn.execute("SELECT COUNT(*) FROM critical_records;").fetchone()[0]
    conn.close()
    assert count_after_loss == 0, "Data should be wiped in simulation"

    # Step 4: Restore from backup snapshot
    shutil.copy2(snap_path, temp_db_path)

    # Step 5: Verify recovery
    conn = sqlite3.connect(temp_db_path)
    row = conn.execute("SELECT name FROM critical_records WHERE id=1;").fetchone()
    conn.close()
    assert row is not None
    assert row[0] == "Solian Wolves Master Record"


def test_migration_lifecycle_clean_and_idempotent(temp_db_path, temp_backup_dir):
    """
    Tests end-to-end migration execution on a disposable SQLite database:
    1. Creates schema_migrations table.
    2. Applies all pending migrations in order (001, 002).
    3. Verifies all 14 core tables are created.
    4. Confirms idempotency on subsequent runs.
    """
    mgr = DatabaseManager(database_path=temp_db_path)
    mig_mgr = MigrationManager(manager=mgr)

    migrations_dir = Path(__file__).resolve().parent.parent / "migrations"
    assert migrations_dir.exists(), "migrations directory must exist"

    # Step 1: Check initial status
    status = mig_mgr.get_migration_status(migrations_dir=str(migrations_dir))
    assert status["applied_count"] == 0
    assert status["pending_count"] >= 2

    # Step 2: Run migrations
    result = mig_mgr.run_migrations(
        migrations_dir=str(migrations_dir),
        create_backup=True,
    )
    assert result["status"] == "success"
    assert len(result["applied_now"]) >= 2
    assert "001_initial_company_schema.sql" in result["applied_now"]
    assert "002_add_audit_and_indexes.sql" in result["applied_now"]

    # Step 3: Verify all 14 tables exist in the new database
    conn = sqlite3.connect(temp_db_path)
    cur = conn.cursor()
    tables = [
        r[0]
        for r in cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
        ).fetchall()
    ]
    conn.close()

    expected_tables = {
        "organizations", "departments", "teams", "members",
        "operating_principles", "operating_cadences", "knowledge_items",
        "projects", "tasks", "clients", "documents", "workflows",
        "company_activities", "executed_proposals", "schema_migrations",
    }
    for expected in expected_tables:
        assert expected in tables, f"Expected table '{expected}' missing from migrated database"

    # Step 4: Test Idempotency — Running again should do nothing
    second_run = mig_mgr.run_migrations(
        migrations_dir=str(migrations_dir),
        create_backup=True,
    )
    assert second_run["status"] == "up_to_date"
    assert len(second_run["applied_now"]) == 0


def test_postgresql_migration_syntax_and_coverage():
    """
    Validates that the unified Supabase/PostgreSQL migration file
    includes all 14 enterprise entities, enums, indexes, and RLS policies.
    """
    pg_mig_path = (
        Path(__file__).resolve().parent.parent.parent
        / "supabase"
        / "migrations"
        / "20261122000002_auren_solian_unified_company_schema.sql"
    )
    assert pg_mig_path.exists(), "Unified PostgreSQL migration file must exist"

    content = pg_mig_path.read_text(encoding="utf-8")

    # Assert Enums
    assert "CREATE TYPE user_role" in content
    assert "CREATE TYPE priority_level" in content
    assert "CREATE TYPE doc_classification" in content

    # Assert Core 14 Tables
    expected_tables = [
        "organizations", "departments", "teams", "members",
        "operating_principles", "operating_cadences", "knowledge_items",
        "projects", "tasks", "clients", "documents", "workflows",
        "company_activities", "executed_proposals",
    ]
    for tbl in expected_tables:
        assert f"CREATE TABLE IF NOT EXISTS {tbl}" in content, f"Table {tbl} missing in PG migration"

    # Assert Row-Level Security
    assert "ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;" in content
    assert "ALTER TABLE members ENABLE ROW LEVEL SECURITY;" in content
    assert "ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;" in content
    assert "ALTER TABLE documents ENABLE ROW LEVEL SECURITY;" in content

    # Assert RLS Policies for Tenant Isolation across all 13 tenant tables
    expected_policies = [
        "org_tenant_isolation", "dept_tenant_isolation", "teams_tenant_isolation",
        "members_tenant_isolation", "principles_tenant_isolation", "cadences_tenant_isolation",
        "knowledge_tenant_isolation", "projects_tenant_isolation", "tasks_tenant_isolation",
        "clients_tenant_isolation", "documents_tenant_isolation", "workflows_tenant_isolation",
        "activities_tenant_isolation",
    ]
    for pol in expected_policies:
        assert pol in content, f"Policy '{pol}' missing from PG migration"

    # Assert Indexes
    assert "CREATE INDEX IF NOT EXISTS idx_pg_members_org" in content
    assert "CREATE INDEX IF NOT EXISTS idx_pg_knowledge_class" in content

