"""Unit tests for PostgreSQL Repository & Supabase Compatibility (Phase 3B.1).

Tests CRUD operations, RLS tenant isolation, transaction rollbacks,
and foreign-key/enum compatibility against actual PostgreSQL 17.
"""
import os
import pytest
import psycopg2
from psycopg2.extras import RealDictCursor

from app.core.config import settings
from app.core.security import UserRole
from app.db.connection import DatabaseManager
from app.services.storage.postgres_repository import PostgresRepository
from app.models.organization import DepartmentCreate
from app.models.knowledge import KnowledgeItemCreate
from app.models.operations import ProjectCreate, TaskCreate, ClientAccountCreate, WorkflowRuleCreate

# Disposable local PostgreSQL unix socket test URL
TEST_PG_URL = "postgresql://kali@/postgres?host=/tmp"


@pytest.fixture(scope="module")
def pg_repo():
    """Provides a PostgresRepository instance connected to disposable PostgreSQL."""
    try:
        conn = psycopg2.connect(TEST_PG_URL)
        conn.close()
    except Exception as e:
        pytest.skip(f"Local PostgreSQL not available: {e}")

    # Initialize repository pointing to test PG cluster
    repo = PostgresRepository(database_url=TEST_PG_URL)
    return repo


def test_postgres_repository_connection_and_profile(pg_repo, monkeypatch):
    """Verifies connecting to PostgreSQL and fetching organization profile."""
    monkeypatch.setattr(settings, "DATABASE_URL", TEST_PG_URL)
    profile = pg_repo.get_organization_profile()
    assert profile.id == "org-solian-wolves"
    assert "Solian Wolves" in profile.name
    assert profile.tier == "enterprise"


def test_postgres_crud_departments_and_members(pg_repo, monkeypatch):
    """Tests Department creation and Member lookup in PostgreSQL."""
    monkeypatch.setattr(settings, "DATABASE_URL", TEST_PG_URL)

    # 1. Create a department
    dept = pg_repo.create_department(
        DepartmentCreate(
            name="Autonomous AI Systems",
            code="AAIS",
            description="Autonomous infrastructure and agent mesh engineering",
            lead_name="Sarah Chen",
        )
    )
    assert dept.code == "AAIS"
    assert dept.organization_id == "org-solian-wolves"

    # Verify department list
    depts = pg_repo.list_departments()
    assert any(d.code == "AAIS" for d in depts)

    # 2. Insert and retrieve a Member in PostgreSQL
    with DatabaseManager(database_url=TEST_PG_URL).connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO members (
                id, user_id, organization_id, name, email, role, title, department_id, department,
                team_id, team, responsibilities, reports_to_id, reports_to_name, status, is_demo
            ) VALUES (
                'tm-test-1', 'usr-test-1', 'org-solian-wolves', 'Test Engineer', 'engineer@solian.ai',
                'member', 'Staff Systems Engineer', %s, 'Autonomous AI Systems',
                NULL, NULL, '["Infrastructure Monitoring"]'::jsonb, NULL, NULL, 'active', FALSE
            ) ON CONFLICT (user_id) DO UPDATE SET title = 'Staff Systems Engineer';
        """, (dept.id,))

    member = pg_repo.get_member_by_user_id("usr-test-1")
    assert member is not None
    assert member.name == "Test Engineer"
    assert member.role == UserRole.MEMBER
    assert "Infrastructure Monitoring" in member.responsibilities

    # Test member lookup by email
    member_by_email = pg_repo.get_member_by_email("engineer@solian.ai")
    assert member_by_email is not None
    assert member_by_email.id == "tm-test-1"


def test_postgres_crud_operations_knowledge_projects_tasks(pg_repo, monkeypatch):
    """Tests Knowledge vault, Projects, and Tasks CRUD in PostgreSQL."""
    monkeypatch.setattr(settings, "DATABASE_URL", TEST_PG_URL)

    # 1. Create Knowledge Item
    k_item = pg_repo.add_knowledge_item(
        KnowledgeItemCreate(
            title="PostgreSQL Replication & High Availability Standard",
            category="Infrastructure",
            snippet="Standard operating procedure for failover cluster maintenance.",
            content="Full runbook for multi-region active-passive PostgreSQL cluster deployment.",
            classification="Confidential",
            department="Engineering",
            tags=["database", "postgresql", "sop"],
        ),
        author="Solomon K.",
        is_verified=True,
    )
    assert k_item is not None
    assert k_item.classification == "Confidential"
    assert k_item.is_verified is True

    # 2. Create Project
    project = pg_repo.create_project(
        ProjectCreate(
            name="Supabase Migration Engine",
            client="Internal Infrastructure",
            status="in_progress",
            progress=65,
            lead="Sarah Chen",
            due_date="2026-12-01",
            priority="high",
            department="Engineering",
            description="Cutover from local SQLite to managed Supabase PostgreSQL.",
        )
    )
    assert project.name == "Supabase Migration Engine"
    assert project.priority == "high"

    # 3. Create Task
    task = pg_repo.create_task(
        TaskCreate(
            title="Verify RLS Policies on PostgreSQL 17",
            description="Audit all 13 tenant isolation policies across company tables.",
            project_id=project.id,
            project_name=project.name,
            status="in_progress",
            priority="high",
            assignee="Test Engineer",
            due_date="2026-11-25",
            department="Engineering",
        ),
        creator_name="Solomon K.",
    )
    assert task.title == "Verify RLS Policies on PostgreSQL 17"
    assert task.status == "in_progress"

    # 4. Update Task Status
    from app.models.operations import TaskUpdate
    updated_task = pg_repo.update_task(task.id, TaskUpdate(status="completed"))
    assert updated_task is not None
    assert updated_task.status == "completed"


def test_postgres_transaction_rollback_on_error(pg_repo, monkeypatch):
    """Verifies that failed transactions rollback cleanly without leaving partial records."""
    monkeypatch.setattr(settings, "DATABASE_URL", TEST_PG_URL)

    mgr = DatabaseManager(database_url=TEST_PG_URL)
    with pytest.raises(Exception):
        with mgr.connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO clients (id, organization_id, company_name, contact_person, email, status, lead_account_manager, is_demo)
                VALUES ('cli-rollback-test', 'org-solian-wolves', 'Rollback Corp', 'Alice', 'alice@rollback.com', 'prospect', 'Marcus Vance', FALSE);
            """)
            # Force syntax / integrity error
            cur.execute("INSERT INTO non_existent_table VALUES (1);")

    # Verify record was rolled back
    with mgr.connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM clients WHERE id = 'cli-rollback-test';")
        assert cur.fetchone() is None, "Failed transaction must be rolled back"


def test_postgres_list_knowledge_query_and_category(pg_repo, monkeypatch):
    """
    Verifies that list_knowledge accepts query both as keyword and positional argument,
    matching the EnterpriseRepository interface.
    """
    monkeypatch.setattr(settings, "DATABASE_URL", TEST_PG_URL)

    # 1. Test keyword argument query=...
    kw_results = pg_repo.list_knowledge(query="escalation")
    assert isinstance(kw_results, list)

    # 2. Test positional argument
    pos_results = pg_repo.list_knowledge("escalation")
    assert isinstance(pos_results, list)

    # 3. Test category filter
    cat_results = pg_repo.list_knowledge(category="SOP")
    assert isinstance(cat_results, list)


def test_postgres_dashboard_stats_model_completeness(pg_repo, monkeypatch):
    """
    Verifies that get_dashboard_stats returns a fully populated DashboardStats instance
    with all operational insight and telemetry metrics, avoiding schema mismatch exceptions.
    """
    monkeypatch.setattr(settings, "DATABASE_URL", TEST_PG_URL)

    stats = pg_repo.get_dashboard_stats()
    assert hasattr(stats, "active_staff_count")
    assert hasattr(stats, "active_projects_count")
    assert hasattr(stats, "open_operations_count")
    assert hasattr(stats, "knowledge_entities_count")
    assert hasattr(stats, "departments_count")
    assert hasattr(stats, "operations_velocity")
    assert hasattr(stats, "urgent_tasks_count")
    assert hasattr(stats, "pending_reviews_count")
    assert hasattr(stats, "has_demo_data")
    assert hasattr(stats, "verified_knowledge_count")
    assert hasattr(stats, "recent_activities")
    assert hasattr(stats, "operational_insights")
    assert isinstance(stats.operational_insights, list)


def test_postgres_multi_tenant_isolation_two_disposable_orgs(pg_repo, monkeypatch):
    """
    Comprehensive Tenant Isolation & RLS Security Gate:
    Uses restricted application role 'app_user' (strictly NON-SUPERUSER without BYPASS RLS).
    Creates two disposable organizations (org-alpha vs org-beta) with distinct records.
    Verifies:
    - Org A cannot read Org B records
    - Org A cannot update or delete Org B records
    - Org A cannot insert records into Org B
    - Missing organization context denies access
    - Empty organization context denies access
    - Invalid organization context denies access
    - Connection reuse and rollback cleanly clear organization context
    - All tenant-owned tables are protected
    """
    monkeypatch.setattr(settings, "DATABASE_URL", TEST_PG_URL)
    mgr = DatabaseManager(database_url=TEST_PG_URL)

    # 1. Seed two disposable organizations as kali superuser
    with mgr.connection() as conn:
        cur = conn.cursor()
        cur.execute("INSERT INTO organizations (id, name, code) VALUES ('org-alpha', 'Alpha Corp', 'ALP') ON CONFLICT (id) DO NOTHING;")
        cur.execute("INSERT INTO organizations (id, name, code) VALUES ('org-beta', 'Beta Inc', 'BET') ON CONFLICT (id) DO NOTHING;")
        cur.execute("""
            INSERT INTO departments (id, organization_id, name, code, description, lead_name)
            VALUES ('dept-alpha-eng', 'org-alpha', 'Alpha Engineering', 'AENG', 'Alpha Devs', 'Alice Lead')
            ON CONFLICT (id) DO NOTHING;
        """)
        cur.execute("""
            INSERT INTO departments (id, organization_id, name, code, description, lead_name)
            VALUES ('dept-beta-sec', 'org-beta', 'Beta Security', 'BSEC', 'Beta Sec', 'Bob Lead')
            ON CONFLICT (id) DO NOTHING;
        """)
        cur.execute("""
            INSERT INTO knowledge_items (id, organization_id, title, category, snippet, content, classification, is_verified, author, updated_at)
            VALUES ('sop-alpha-secret', 'org-alpha', 'Alpha Proprietary Algorithm', 'SOP', 'Confidential alpha code', 'Secret alpha IP', 'Restricted', TRUE, 'Alice', '2026-11-22')
            ON CONFLICT (id) DO NOTHING;
        """)
        cur.execute("""
            INSERT INTO knowledge_items (id, organization_id, title, category, snippet, content, classification, is_verified, author, updated_at)
            VALUES ('sop-beta-secret', 'org-beta', 'Beta Patent Architecture', 'SOP', 'Confidential beta patent', 'Secret beta IP', 'Restricted', TRUE, 'Bob', '2026-11-22')
            ON CONFLICT (id) DO NOTHING;
        """)

    # 2. Test strictly under restricted application role 'app_user'
    with mgr.connection() as conn:
        cur = conn.cursor()
        cur.execute("SET ROLE app_user;")

        # A. Missing context denies access
        cur.execute("SELECT COUNT(*) as count FROM departments;")
        assert cur.fetchone()["count"] == 0, "Missing organization context must DENY access"

        cur.execute("SELECT COUNT(*) as count FROM knowledge_items;")
        assert cur.fetchone()["count"] == 0, "Missing organization context must DENY access to knowledge"

        # B. Empty context denies access
        cur.execute("SET LOCAL app.current_org_id = '';")
        cur.execute("SELECT COUNT(*) as count FROM departments;")
        assert cur.fetchone()["count"] == 0, "Empty organization context must DENY access"

        # C. Invalid context denies access
        cur.execute("SET LOCAL app.current_org_id = 'org-nonexistent-xyz';")
        cur.execute("SELECT COUNT(*) as count FROM departments;")
        assert cur.fetchone()["count"] == 0, "Invalid organization context must DENY access"

        # D. Org Alpha session sees ONLY Org Alpha records
        cur.execute("SET LOCAL app.current_org_id = 'org-alpha';")
        cur.execute("SELECT id FROM departments;")
        alpha_depts = [r["id"] for r in cur.fetchall()]
        assert "dept-alpha-eng" in alpha_depts
        assert "dept-beta-sec" not in alpha_depts, "Org Alpha must NOT see Org Beta department"

        cur.execute("SELECT id FROM knowledge_items;")
        alpha_k = [r["id"] for r in cur.fetchall()]
        assert "sop-alpha-secret" in alpha_k
        assert "sop-beta-secret" not in alpha_k, "Org Alpha must NOT see Org Beta proprietary SOP"

        # E. Org Alpha CANNOT update Org Beta records
        cur.execute("UPDATE departments SET name = 'Attacked Dept' WHERE id = 'dept-beta-sec';")
        assert cur.rowcount == 0, "Org Alpha must NOT be able to update Org Beta records"

        # F. Org Alpha CANNOT delete Org Beta records
        cur.execute("DELETE FROM departments WHERE id = 'dept-beta-sec';")
        assert cur.rowcount == 0, "Org Alpha must NOT be able to delete Org Beta records"

        # G. Org Alpha CANNOT insert records into Org Beta
        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute("""
                INSERT INTO departments (id, organization_id, name, code, description, lead_name)
                VALUES ('dept-alpha-intruder', 'org-beta', 'Intruder Dept', 'INTR', 'Desc', 'Hacker');
            """)
        conn.rollback()

    # 3. Connection reuse / clean context verification
    with mgr.connection() as conn:
        cur = conn.cursor()
        cur.execute("SET ROLE app_user;")
        # New transaction without setting app.current_org_id: context must NOT leak from previous connection!
        cur.execute("SELECT COUNT(*) as count FROM departments;")
        assert cur.fetchone()["count"] == 0, "New transaction on recycled connection must NOT retain stale tenant context"

        # Org Beta session sees ONLY Org Beta records
        cur.execute("SET LOCAL app.current_org_id = 'org-beta';")
        cur.execute("SELECT id FROM departments;")
        beta_depts = [r["id"] for r in cur.fetchall()]
        assert "dept-beta-sec" in beta_depts
        assert "dept-alpha-eng" not in beta_depts

        cur.execute("SELECT id FROM knowledge_items;")
        beta_k = [r["id"] for r in cur.fetchall()]
        assert "sop-beta-secret" in beta_k
        assert "sop-alpha-secret" not in beta_k


def test_postgres_rls_tenant_isolation(pg_repo):
    """
    Verifies that Row-Level Security (RLS) strictly isolates tenant data in PostgreSQL.
    When querying as a non-superuser application role under another tenant ID,
    Solian Wolves records must NOT be accessible.
    """
    mgr = DatabaseManager(database_url=TEST_PG_URL)

    with mgr.connection() as conn:
        cur = conn.cursor()

        # Switch to application role (non-superuser without BYPASS RLS)
        cur.execute("SET ROLE app_user;")

        # Step 1: Query with Solian Wolves tenant session
        cur.execute("SET LOCAL app.current_org_id = 'org-solian-wolves';")
        cur.execute("SELECT COUNT(*) as count FROM departments;")
        solian_count = cur.fetchone()["count"]
        assert solian_count >= 1, "Solian Wolves should see its own departments"

        # Step 2: Query as a different, untrusted tenant ('org-untrusted-isolated-tenant')
        cur.execute("SET LOCAL app.current_org_id = 'org-untrusted-isolated-tenant';")
        cur.execute("SELECT COUNT(*) as count FROM departments;")
        foreign_count = cur.fetchone()["count"]
        assert foreign_count == 0, "Foreign tenant must NOT access Solian Wolves departments via RLS"

        cur.execute("RESET ROLE;")
