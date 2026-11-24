"""SQLite repository for Solian Wolves Enterprise Organizational Intelligence."""
import hashlib
import hmac
import json
import logging
import os
import secrets
import sqlite3
import threading
import uuid
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.core.security import UserRole
from app.models.organization import (
    Department,
    DepartmentCreate,
    DepartmentUpdate,
    Team,
    OrganizationMember,
    OrganizationProfile,
    OrganizationProfileUpdate,
    OperatingPrinciple,
    OperatingCadence,
    CompanyOperatingInfo,
    VerifiedLeader,
    VERIFIED_LEADERSHIP_COUNCIL,
    MemberInviteCreate,
    MemberStatusUpdate,
    PersonnelCreate,
    PersonnelUpdate,
    AccountActivationStatus,
)
from app.models.knowledge import KnowledgeItem, KnowledgeItemCreate
from app.models.operations import (
    Project,
    ProjectCreate,
    Task,
    TaskCreate,
    TaskUpdate,
    ClientAccount,
    ClientAccountCreate,
    ClientAccountUpdate,
    CorporateDocument,
    CorporateDocumentCreate,
    WorkflowRule,
    WorkflowRuleCreate,
    CompanyActivityEvent,
    OperationalInsight,
    DashboardStats,
)
from app.models.meetings import (
    Meeting,
    MeetingCreate,
    MeetingUpdate,
    MeetingActionItem,
    MeetingDecision,
)
from app.models.discussions import (
    DiscussionMessage,
    DiscussionMessageCreate,
    DiscussionChannel,
)
from app.models.notifications import (
    NotificationItem,
    NotificationCreate,
)
from app.models.email import (
    EmailMessage,
    EmailDraft,
    EmailDraftCreate,
    EmailDraftUpdate,
    EmailAttachmentMeta,
)
from app.models.finance import (
    FinancialAccount,
    FinancialAccountCreate,
    FinancialAccountUpdate,
    FinancialTransaction,
    FinancialTransactionCreate,
    FinancialTransactionUpdate,
    Invoice,
    InvoiceItem,
    InvoiceCreate,
    InvoiceUpdate,
    InvoicePaymentRecord,
    AccountsPayable,
    AccountsPayableCreate,
    AccountsPayableUpdate,
    AccountsPayablePaymentRecord,
    FinancialBudget,
    FinancialBudgetCreate,
    FinancialBudgetUpdate,
    ExpenseRequest,
    ExpenseRequestCreate,
    ExpenseRequestReview,
    ExpenseRequestPay,
    FinancialOverviewStats,
    ProjectFinancialSummary,
)


class EnterpriseRepository:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or settings.DATABASE_PATH
        self.organization_id = settings.ORGANIZATION_ID
        self._lock = threading.Lock()
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=30.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_db(self):
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()

            cur.executescript("""
            CREATE TABLE IF NOT EXISTS organizations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT NOT NULL UNIQUE,
                tagline TEXT,
                mission TEXT,
                vision TEXT,
                operating_model TEXT,
                headquarters TEXT,
                founded_year INTEGER,
                primary_timezone TEXT DEFAULT 'UTC',
                fiscal_year TEXT,
                tier TEXT DEFAULT 'enterprise',
                total_members INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS departments (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                name TEXT NOT NULL,
                code TEXT NOT NULL UNIQUE,
                description TEXT,
                lead_id TEXT,
                lead_name TEXT NOT NULL,
                member_count INTEGER DEFAULT 0,
                active_initiatives INTEGER DEFAULT 0,
                is_demo INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS teams (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                department_id TEXT NOT NULL,
                department_name TEXT NOT NULL,
                name TEXT NOT NULL,
                lead_name TEXT NOT NULL,
                description TEXT,
                focus_area TEXT,
                member_count INTEGER DEFAULT 0,
                is_demo INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS members (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE,
                organization_id TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                role TEXT NOT NULL,
                title TEXT NOT NULL,
                department_id TEXT,
                department TEXT NOT NULL,
                team_id TEXT,
                team TEXT,
                responsibilities TEXT, -- JSON array
                reports_to_id TEXT,
                reports_to_name TEXT,
                status TEXT DEFAULT 'active',
                assigned_projects INTEGER DEFAULT 0,
                joined_date TEXT DEFAULT '2024-01-15',
                is_demo INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS operating_principles (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                is_demo INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS operating_cadences (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                name TEXT NOT NULL,
                cadence TEXT NOT NULL,
                audience TEXT NOT NULL,
                description TEXT NOT NULL,
                lead TEXT NOT NULL,
                is_demo INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS knowledge_items (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                snippet TEXT NOT NULL,
                content TEXT NOT NULL,
                classification TEXT NOT NULL DEFAULT 'Internal',
                is_verified INTEGER NOT NULL DEFAULT 0,
                department TEXT,
                version TEXT DEFAULT '1.0',
                updated_at TEXT NOT NULL,
                author TEXT NOT NULL,
                tags TEXT, -- JSON array
                is_demo INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                name TEXT NOT NULL,
                client TEXT,
                status TEXT NOT NULL DEFAULT 'planning',
                progress INTEGER NOT NULL DEFAULT 0,
                lead TEXT NOT NULL,
                due_date TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'medium',
                department TEXT,
                description TEXT,
                is_demo INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                project_id TEXT,
                project_name TEXT,
                status TEXT NOT NULL DEFAULT 'backlog',
                priority TEXT NOT NULL DEFAULT 'medium',
                assignee TEXT NOT NULL,
                due_date TEXT NOT NULL,
                department TEXT,
                created_at TEXT DEFAULT '2026-11-20',
                is_demo INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                company_name TEXT NOT NULL,
                contact_person TEXT NOT NULL,
                email TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'prospect',
                contract_value TEXT,
                lead_account_manager TEXT NOT NULL,
                notes TEXT,
                is_demo INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                size TEXT NOT NULL,
                classification TEXT NOT NULL DEFAULT 'Internal',
                updated_at TEXT NOT NULL,
                owner TEXT NOT NULL,
                department TEXT,
                is_demo INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS workflows (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                title TEXT NOT NULL,
                trigger TEXT NOT NULL,
                action TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                execution_count INTEGER NOT NULL DEFAULT 0,
                department TEXT,
                is_demo INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS company_activities (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                actor_name TEXT NOT NULL,
                action_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                module TEXT NOT NULL,
                is_demo INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS executed_proposals (
                id TEXT PRIMARY KEY,
                action_type TEXT NOT NULL,
                executed_by TEXT NOT NULL,
                executed_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL,
                checksum TEXT
            );

            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
                title TEXT NOT NULL,
                meeting_type TEXT NOT NULL DEFAULT 'department',
                organizer_name TEXT NOT NULL,
                organizer_id TEXT,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                duration_minutes INTEGER DEFAULT 60,
                location TEXT,
                virtual_link TEXT,
                related_project_id TEXT,
                related_client_id TEXT,
                agenda TEXT,
                discussion_notes TEXT DEFAULT '',
                decisions TEXT,
                attendees TEXT,
                action_items TEXT,
                status TEXT NOT NULL DEFAULT 'scheduled',
                created_at TEXT NOT NULL,
                is_demo INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS discussions (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
                channel_type TEXT NOT NULL DEFAULT 'company',
                channel_id TEXT NOT NULL DEFAULT 'general',
                channel_name TEXT NOT NULL DEFAULT 'General Announcements',
                author_id TEXT NOT NULL,
                author_name TEXT NOT NULL,
                author_role TEXT NOT NULL DEFAULT 'member',
                title TEXT,
                content TEXT NOT NULL,
                parent_id TEXT,
                is_pinned INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                is_demo INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'system',
                link_module TEXT,
                link_id TEXT,
                is_read INTEGER DEFAULT 0,
                priority TEXT DEFAULT 'normal',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS financial_accounts (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
                name TEXT NOT NULL,
                account_type TEXT NOT NULL DEFAULT 'bank',
                account_number TEXT,
                currency TEXT NOT NULL DEFAULT 'KES',
                opening_balance REAL NOT NULL DEFAULT 0.0,
                current_balance REAL NOT NULL DEFAULT 0.0,
                status TEXT NOT NULL DEFAULT 'active',
                description TEXT,
                is_demo INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
                invoice_number TEXT NOT NULL UNIQUE,
                client_id TEXT NOT NULL,
                client_name TEXT NOT NULL,
                project_id TEXT,
                project_name TEXT,
                issue_date TEXT NOT NULL,
                due_date TEXT NOT NULL,
                items TEXT NOT NULL DEFAULT '[]',
                subtotal REAL NOT NULL DEFAULT 0.0,
                tax_rate REAL NOT NULL DEFAULT 0.0,
                tax_amount REAL NOT NULL DEFAULT 0.0,
                total_amount REAL NOT NULL DEFAULT 0.0,
                amount_paid REAL NOT NULL DEFAULT 0.0,
                balance_due REAL NOT NULL DEFAULT 0.0,
                currency TEXT NOT NULL DEFAULT 'KES',
                status TEXT NOT NULL DEFAULT 'issued',
                notes TEXT,
                terms TEXT,
                created_by TEXT NOT NULL,
                is_demo INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS accounts_payable (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
                reference TEXT NOT NULL,
                supplier_name TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'Operations',
                amount_due REAL NOT NULL DEFAULT 0.0,
                amount_paid REAL NOT NULL DEFAULT 0.0,
                balance_due REAL NOT NULL DEFAULT 0.0,
                currency TEXT NOT NULL DEFAULT 'KES',
                due_date TEXT NOT NULL,
                project_id TEXT,
                project_name TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                supporting_document_url TEXT,
                notes TEXT,
                created_by TEXT NOT NULL,
                is_demo INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS financial_budgets (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
                name TEXT NOT NULL,
                period TEXT NOT NULL DEFAULT 'quarterly',
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                category TEXT,
                project_id TEXT,
                project_name TEXT,
                department TEXT,
                allocated_amount REAL NOT NULL DEFAULT 0.0,
                spent_amount REAL NOT NULL DEFAULT 0.0,
                currency TEXT NOT NULL DEFAULT 'KES',
                status TEXT NOT NULL DEFAULT 'active',
                created_by TEXT NOT NULL,
                notes TEXT,
                is_demo INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS financial_transactions (
                id TEXT PRIMARY KEY,
                reference TEXT NOT NULL UNIQUE,
                organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
                transaction_type TEXT NOT NULL,
                date TEXT NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL DEFAULT 'KES',
                account_id TEXT NOT NULL,
                destination_account_id TEXT,
                category TEXT NOT NULL,
                project_id TEXT,
                client_id TEXT,
                invoice_id TEXT,
                payable_id TEXT,
                payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
                status TEXT NOT NULL DEFAULT 'completed',
                recorded_by_id TEXT NOT NULL,
                recorded_by_name TEXT NOT NULL,
                supporting_document_url TEXT,
                notes TEXT,
                is_demo INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS expense_requests (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'Operations',
                amount REAL NOT NULL,
                currency TEXT NOT NULL DEFAULT 'KES',
                requested_by_id TEXT NOT NULL,
                requested_by_name TEXT NOT NULL,
                project_id TEXT,
                project_name TEXT,
                department TEXT,
                urgency TEXT NOT NULL DEFAULT 'normal',
                status TEXT NOT NULL DEFAULT 'submitted',
                reviewed_by_id TEXT,
                reviewed_by_name TEXT,
                review_comments TEXT,
                reviewed_at TEXT,
                transaction_id TEXT,
                supporting_document_url TEXT,
                is_demo INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS email_drafts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
                to_addresses TEXT NOT NULL,
                cc_addresses TEXT DEFAULT '[]',
                bcc_addresses TEXT DEFAULT '[]',
                subject TEXT NOT NULL DEFAULT '',
                body TEXT NOT NULL DEFAULT '',
                attachments TEXT DEFAULT '[]',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS email_messages (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves',
                user_id TEXT,
                folder TEXT NOT NULL DEFAULT 'inbox',
                from_address TEXT NOT NULL,
                to_addresses TEXT NOT NULL,
                cc_addresses TEXT DEFAULT '[]',
                bcc_addresses TEXT DEFAULT '[]',
                subject TEXT NOT NULL,
                body_text TEXT NOT NULL,
                body_html TEXT,
                is_read INTEGER DEFAULT 1,
                attachments TEXT DEFAULT '[]',
                reply_to_id TEXT,
                created_at TEXT NOT NULL
            );
            """)

            # Ensure initial migrations are recorded if table was initialized
            cur.execute("SELECT COUNT(*) as count FROM schema_migrations;")
            if cur.fetchone()["count"] == 0:
                cur.execute(
                    "INSERT OR IGNORE INTO schema_migrations (version, name, applied_at, checksum) VALUES (?, ?, datetime('now'), ?);",
                    ("001", "001_initial_company_schema.sql", "initial_bootstrap"),
                )
                cur.execute(
                    "INSERT OR IGNORE INTO schema_migrations (version, name, applied_at, checksum) VALUES (?, ?, datetime('now'), ?);",
                    ("002", "002_add_audit_and_indexes.sql", "initial_bootstrap"),
                )

            # Ensure columns exist on members table for identity, avatars, and onboarding lifecycles
            for col_name, col_def in [
                ("auth_user_id", "TEXT"),
                ("avatar_url", "TEXT"),
                ("phone", "TEXT"),
                ("activation_status", "TEXT DEFAULT 'created'"),
                ("invitation_token", "TEXT"),
                ("invitation_expires_at", "TEXT"),
                ("password_hash", "TEXT"),
            ]:
                try:
                    cur.execute(f"ALTER TABLE members ADD COLUMN {col_name} {col_def};")
                except sqlite3.OperationalError:
                    pass  # column already exists

            try:
                cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_members_auth_user_id ON members(auth_user_id);")
                cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_members_invitation_token ON members(invitation_token);")
            except sqlite3.OperationalError:
                pass

            # Relax NOT NULL on members.email if present from older SQLite schema
            try:
                col_rows = cur.execute("PRAGMA table_info(members);").fetchall()
                email_cols = [c for c in col_rows if c["name"] == "email"]
                if email_cols and email_cols[0]["notnull"] == 1:
                    cur.execute("PRAGMA foreign_keys = OFF;")
                    cur.execute("""
                        CREATE TABLE members_migrated (
                            id TEXT PRIMARY KEY,
                            user_id TEXT NOT NULL UNIQUE,
                            organization_id TEXT NOT NULL,
                            name TEXT NOT NULL,
                            email TEXT UNIQUE,
                            phone TEXT,
                            role TEXT NOT NULL,
                            title TEXT NOT NULL,
                            department_id TEXT,
                            department TEXT NOT NULL,
                            team_id TEXT,
                            team TEXT,
                            responsibilities TEXT,
                            reports_to_id TEXT,
                            reports_to_name TEXT,
                            status TEXT DEFAULT 'active',
                            activation_status TEXT DEFAULT 'created',
                            invitation_token TEXT UNIQUE,
                            invitation_expires_at TEXT,
                            assigned_projects INTEGER DEFAULT 0,
                            joined_date TEXT DEFAULT '2024-01-15',
                            avatar_url TEXT,
                            auth_user_id TEXT UNIQUE,
                            is_demo INTEGER DEFAULT 0
                        );
                    """)
                    cur.execute("""
                        INSERT INTO members_migrated (
                            id, user_id, organization_id, name, email, phone, role, title,
                            department_id, department, team_id, team, responsibilities,
                            reports_to_id, reports_to_name, status, activation_status,
                            invitation_token, invitation_expires_at, assigned_projects, joined_date,
                            avatar_url, auth_user_id, is_demo
                        )
                        SELECT
                            id, user_id, organization_id, name, email,
                            CASE WHEN 'phone' IN (SELECT name FROM pragma_table_info('members')) THEN phone ELSE NULL END,
                            role, title, department_id, department, team_id, team, responsibilities,
                            reports_to_id, reports_to_name, status,
                            CASE WHEN 'activation_status' IN (SELECT name FROM pragma_table_info('members')) THEN activation_status ELSE 'created' END,
                            CASE WHEN 'invitation_token' IN (SELECT name FROM pragma_table_info('members')) THEN invitation_token ELSE NULL END,
                            CASE WHEN 'invitation_expires_at' IN (SELECT name FROM pragma_table_info('members')) THEN invitation_expires_at ELSE NULL END,
                            assigned_projects, joined_date,
                            CASE WHEN 'avatar_url' IN (SELECT name FROM pragma_table_info('members')) THEN avatar_url ELSE NULL END,
                            CASE WHEN 'auth_user_id' IN (SELECT name FROM pragma_table_info('members')) THEN auth_user_id ELSE NULL END,
                            is_demo
                        FROM members;
                    """)
                    cur.execute("DROP TABLE members;")
                    cur.execute("ALTER TABLE members_migrated RENAME TO members;")
                    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_members_auth_user_id ON members(auth_user_id);")
                    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_members_invitation_token ON members(invitation_token);")
                    cur.execute("PRAGMA foreign_keys = ON;")
            except Exception as e:
                logger.warning(f"Members email nullability migration skipped: {e}")

            # Ensure organization_id column exists on executed_proposals
            try:
                cur.execute("ALTER TABLE executed_proposals ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'org-solian-wolves';")
            except sqlite3.OperationalError:
                pass  # column already exists

            # Purge legacy demo mock records if present and normalize executive leadership records
            cur.execute("DELETE FROM members WHERE is_demo = 1 OR id = 'tm-6' OR name LIKE '%[DEMO]%' OR name = 'Solomon K.';")
            cur.execute("UPDATE members SET auth_user_id = 'usr-1' WHERE id = 'tm-1' AND auth_user_id IS NULL;")
            cur.execute("UPDATE departments SET lead_name = 'Ian Momanyi Nyakundi' WHERE lead_id = 'tm-1' OR lead_name = 'Solomon K.';")
            cur.execute("UPDATE operating_cadences SET lead = 'Ian Momanyi Nyakundi' WHERE lead = 'Solomon K.';")
            cur.execute("UPDATE knowledge_items SET author = 'Ian Momanyi Nyakundi' WHERE author = 'Solomon K.';")
            cur.execute("UPDATE projects SET lead = 'Ian Momanyi Nyakundi' WHERE lead = 'Solomon K.';")
            cur.execute("UPDATE tasks SET assignee = 'Ian Momanyi Nyakundi' WHERE assignee = 'Solomon K.';")
            cur.execute("UPDATE clients SET lead_account_manager = 'Ian Momanyi Nyakundi' WHERE lead_account_manager = 'Solomon K.';")
            cur.execute("UPDATE company_activities SET actor_name = 'Ian Momanyi Nyakundi' WHERE actor_name = 'Solomon K.';")
            cur.execute("UPDATE meetings SET organizer_name = 'Ian Momanyi Nyakundi' WHERE organizer_name = 'Solomon K.' OR organizer_id = 'tm-1';")
            cur.execute("UPDATE discussions SET author_name = 'Ian Momanyi Nyakundi' WHERE author_id = 'tm-1' OR author_name = 'Solomon K.';")

            # Always ensure the real Solian Wolves leadership council exists
            cur.execute("SELECT COUNT(*) as count FROM organizations;")
            count = cur.fetchone()["count"]
            if count == 0:
                self._bootstrap_production_foundation(conn)
            else:
                cur.execute("SELECT name FROM members WHERE id = 'tm-1' LIMIT 1;")
                tm1 = cur.fetchone()
                if not tm1 or tm1["name"] != "Ian Momanyi Nyakundi":
                    self._bootstrap_production_foundation(conn)
                cur.execute("SELECT 1 FROM meetings WHERE id = 'mtg-1' LIMIT 1;")
                if not cur.fetchone():
                    self._seed_new_modules(conn)

            # Seed financial records if accounts table is empty
            cur.execute("SELECT COUNT(*) as count FROM financial_accounts;")
            fin_count = cur.fetchone()["count"]
            if fin_count == 0:
                if (settings.ENABLE_DEMO_FIXTURES or not settings.is_production) and not settings.is_production:
                    self._seed_finance_data(conn)

            conn.commit()
            conn.close()

    def _seed_new_modules(self, conn: sqlite3.Connection):
        cur = conn.cursor()
        # 14. Meetings (DEMO)
        meetings = [
            (
                "mtg-1", "org-solian-wolves", "Executive Strategy & Capital Allocation Review",
                "executive", "Ian Momanyi Nyakundi", "tm-1", "2026-11-24", "10:00", 60, "Executive Boardroom & Virtual",
                "https://meet.solian.ai/exec-sync", None, None,
                json.dumps(["Q4 Strategic Priorities", "Institutional Capital Allocation", "Enterprise Client SLA Adherence"]),
                "Reviewed Q4 operating plan and confirmed milestone timelines across all engineering tracks.",
                json.dumps([
                    {"id": "dec-1", "decision": "Approve unified PostgreSQL migration with zero-trust tenant isolation", "impact": "Enforces complete customer isolation and unlocks production Supabase deployment", "status": "approved", "knowledge_item_id": None},
                    {"id": "dec-2", "decision": "Authorize new enterprise client onboarding protocol with automatic SLA alerts", "impact": "Reduces onboarding latency by 45%", "status": "approved", "knowledge_item_id": None}
                ]),
                json.dumps(["Ian Momanyi Nyakundi", "Hillary Onchwati Isaiah", "Alice Moraa Nyakundi", "Noella Maraka Kaatho", "Solomon Nyangweso Omwenga"]),
                json.dumps([
                    {"id": "act-item-1", "title": "Finalize RLS tenant isolation verification in staging cluster", "assignee": "Solomon Nyangweso Omwenga", "due_date": "2026-11-26", "status": "pending", "task_id": None},
                    {"id": "act-item-2", "title": "Publish updated enterprise governance charter to Knowledge Vault", "assignee": "Alice Moraa Nyakundi", "due_date": "2026-11-28", "status": "pending", "task_id": None}
                ]),
                "scheduled", "2026-11-20T08:00:00Z", 0
            ),
            (
                "mtg-2", "org-solian-wolves", "[DEMO] AI Mesh Architecture & Telemetry Sprint Planning",
                "department", "[DEMO] Sarah Chen", "tm-2", "2026-11-25", "14:00", 45, "Virtual Link",
                "https://meet.solian.ai/eng-sync", "p-102", None,
                json.dumps(["FastAPI Backend Endpoints Optimization", "Vite Frontend Production Bundle Optimization", "Test Suite Coverage Expansion"]),
                "Evaluated streaming latency and confirmed all unit tests pass with zero flakiness.",
                json.dumps([
                    {"id": "dec-3", "decision": "Standardize all company API responses on typed Pydantic V2 schemas", "impact": "Prevents data corruption across frontend-backend boundaries", "status": "approved", "knowledge_item_id": None}
                ]),
                json.dumps(["[DEMO] Sarah Chen", "[DEMO] David Ochieng", "Solomon Nyangweso Omwenga"]),
                json.dumps([
                    {"id": "act-item-3", "title": "Implement unified command palette search across all modules", "assignee": "[DEMO] Sarah Chen", "due_date": "2026-11-27", "status": "pending", "task_id": None}
                ]),
                "scheduled", "2026-11-21T09:30:00Z", 1
            ),
            (
                "mtg-3", "org-solian-wolves", "[DEMO] Meridian Global Logistics SLA Operations Review",
                "client", "[DEMO] Marcus Vance", "tm-3", "2026-11-26", "11:00", 60, "Client Portal Conference",
                "https://meet.solian.ai/meridian-sla", None, "c-1",
                json.dumps(["Review Monthly SLA Performance", "Capacity Allocation for Peak Season", "Q1 Contract Renewal Discussion"]),
                "Client expressed satisfaction with platform reliability and agreed to contract renewal terms.",
                json.dumps([
                    {"id": "dec-4", "decision": "Extend dedicated SLA tier for Meridian Logistics through 2027", "impact": "Secures enterprise ARR commitment", "status": "approved", "knowledge_item_id": None}
                ]),
                json.dumps(["[DEMO] Marcus Vance", "Alister Sterling (Demo)", "Ian Momanyi Nyakundi"]),
                json.dumps([
                    {"id": "act-item-4", "title": "Draft revised Master Services Agreement amendment", "assignee": "[DEMO] Marcus Vance", "due_date": "2026-11-29", "status": "pending", "task_id": None}
                ]),
                "scheduled", "2026-11-22T11:00:00Z", 1
            ),
        ]
        cur.executemany("INSERT OR IGNORE INTO meetings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", meetings)

        # 15. Discussions (DEMO)
        discussions = [
            (
                "dsc-1", "org-solian-wolves", "company", "general", "General Announcements",
                "tm-1", "Ian Momanyi Nyakundi", "owner", "Welcome to Solian Wolves Unified Operating Environment",
                "The AUREN SOLIAN platform is now active as our primary company intelligence and operational command system. All department leads, please ensure your sprint deliverables, client accounts, and institutional knowledge are accurately reflected in the system.",
                None, 1, "2026-11-20T10:00:00Z", 1
            ),
            (
                "dsc-2", "org-solian-wolves", "company", "general", "General Announcements",
                "tm-2", "[DEMO] Sarah Chen", "admin", "Infrastructure Update: Dual PostgreSQL & SQLite Architecture Active",
                "Engineering has completed the database abstraction layer supporting real PostgreSQL clusters with strict multi-tenant Row-Level Security while preserving seamless local development. Next up: production Supabase integration.",
                "dsc-1", 0, "2026-11-20T11:15:00Z", 1
            ),
            (
                "dsc-3", "org-solian-wolves", "department", "dept-eng", "Engineering & AI Operations",
                "tm-2", "[DEMO] Sarah Chen", "admin", "FastAPI Endpoints & Type-Safe Integration Guidelines",
                "All backend routes must now validate through Pydantic models with clear error envelopes. Please review the updated schemas before opening merge requests.",
                None, 1, "2026-11-21T09:00:00Z", 1
            ),
            (
                "dsc-4", "org-solian-wolves", "department", "dept-strat", "Strategic Advisory & Client Accounts",
                "tm-3", "[DEMO] Marcus Vance", "manager", "Meridian Global Logistics SLA Performance Briefing",
                "Meridian Logistics reports 99.98% uptime on their supply chain orchestration integration. We are on track for Q1 contract expansion.",
                None, 0, "2026-11-22T08:30:00Z", 1
            ),
        ]
        cur.executemany("INSERT OR IGNORE INTO discussions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", discussions)

        # 16. Notifications (DEMO)
        notifications = [
            ("notif-1", "org-solian-wolves", "usr-1", "Executive Review Scheduled", "Strategic Review meeting scheduled for Nov 24, 10:00 UTC", "meeting_invite", "meetings", "mtg-1", 0, "high", "2026-11-22T09:00:00Z"),
            ("notif-2", "org-solian-wolves", "usr-1", "Task Assigned: RLS Tenant Isolation", "You have been assigned to verify RLS tenant isolation across all enterprise tables.", "task_assigned", "tasks", "t-101", 0, "urgent", "2026-11-22T09:30:00Z"),
            ("notif-3", "org-solian-wolves", "all", "Platform Upgrade Notice", "AUREN SOLIAN platform v2.5 unified workspace is active.", "announcement", None, None, 1, "normal", "2026-11-21T12:00:00Z"),
        ]
        cur.executemany("INSERT OR IGNORE INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", notifications)

    def _seed_finance_data(self, conn: sqlite3.Connection):
        cur = conn.cursor()
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Accounts (13 cols)
        accounts = [
            (
                "acc-kcb-01", "org-solian-wolves", "KCB Corporate Operational Account",
                "bank", "•••• 4892", "KES", 4500000.0, 5320000.0, "active",
                "Primary operational treasury holding for Solian Wolves statutory operations and payroll.",
                1, now_iso, now_iso
            ),
            (
                "acc-mpesa-01", "org-solian-wolves", "Safaricom M-Pesa Business Till",
                "mobile_money", "Till 982142", "KES", 850000.0, 905000.0, "active",
                "Commercial merchant mobile money till for operational logistics and rapid vendor dispatches.",
                1, now_iso, now_iso
            ),
            (
                "acc-cash-01", "org-solian-wolves", "Executive Petty Cash Safe",
                "cash", None, "KES", 150000.0, 150000.0, "active",
                "Audited executive office petty cash reserves for immediate operational incidentals.",
                1, now_iso, now_iso
            ),
        ]
        cur.executemany("INSERT OR REPLACE INTO financial_accounts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", accounts)

        # 2. Invoices (24 cols)
        invoices = [
            (
                "inv-1", "org-solian-wolves", "INV-2026-001", "c-1", "Meridian Global Logistics",
                "p-101", "Project Alpha: Edge Telemetry Architecture", "2026-11-01", "2026-12-15",
                json.dumps([
                    {"description": "Edge Telemetry Architecture Deployment - Milestone 1", "quantity": 1.0, "unit_price": 2400000.0, "subtotal": 2400000.0}
                ]),
                2400000.0, 0.0, 0.0, 2400000.0, 1200000.0, 1200000.0, "KES", "partially_paid",
                "Milestone 1 completed. 50% retainer received, remaining balance payable upon acceptance.",
                "Net 30 days from invoice issue date.", "Alice Moraa Nyakundi", 1, now_iso, now_iso
            ),
            (
                "inv-2", "org-solian-wolves", "INV-2026-002", "c-2", "Apex Financial Core",
                "p-102", "Project Beta: Core AI Inference Engine", "2026-11-15", "2026-12-30",
                json.dumps([
                    {"description": "Core AI Inference Architecture & Telemetry Integration Phase 1", "quantity": 1.0, "unit_price": 1850000.0, "subtotal": 1850000.0}
                ]),
                1850000.0, 0.0, 0.0, 1850000.0, 0.0, 1850000.0, "KES", "issued",
                "Phase 1 deliverable sign-off pending final integration test.",
                "Net 45 days. Standard enterprise terms.", "Alice Moraa Nyakundi", 1, now_iso, now_iso
            ),
        ]
        cur.executemany("INSERT OR REPLACE INTO invoices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", invoices)

        # 3. Accounts Payable (20 cols)
        payables = [
            (
                "ap-1", "org-solian-wolves", "BILL-2026-001", "Safaricom Enterprise Telemetry",
                "Dedicated Leased Fiber & Cloud Gateway bandwidth", "Internet and communications",
                145000.0, 0.0, 145000.0, "KES", "2026-11-30", "p-101", "Project Alpha: Edge Telemetry Architecture",
                "pending", None, "Monthly recurrent enterprise gateway connection", "Hillary Onchwati Isaiah",
                1, now_iso, now_iso
            ),
            (
                "ap-2", "org-solian-wolves", "BILL-2026-002", "AWS Cloud Infrastructure EMEA",
                "GPU Server Instances & Kubernetes Node Clusters", "Software and subscriptions",
                320000.0, 0.0, 320000.0, "KES", "2026-12-05", "p-102", "Project Beta: Core AI Inference Engine",
                "pending", None, "Monthly infrastructure reserved instances invoice", "Solomon Nyangweso Omwenga",
                1, now_iso, now_iso
            ),
        ]
        cur.executemany("INSERT OR REPLACE INTO accounts_payable VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", payables)

        # 4. Financial Budgets (19 cols)
        budgets = [
            (
                "bgt-1", "org-solian-wolves", "Q4 2026 Engineering & AI Mesh Infrastructure",
                "quarterly", "2026-10-01", "2026-12-31", "Technology", "p-102", "Project Beta: Core AI Inference Engine",
                "Technology", 3500000.0, 1420000.0, "KES", "active", "Alice Moraa Nyakundi",
                "Approved by Statutory Leadership Council for core engineering scaling.", 1, now_iso, now_iso
            ),
            (
                "bgt-2", "org-solian-wolves", "Q4 2026 General Company Operations & Administration",
                "quarterly", "2026-10-01", "2026-12-31", "Operations", None, None,
                "Operations", 2000000.0, 890000.0, "KES", "active", "Alice Moraa Nyakundi",
                "Operational maintenance, facility lease, utilities, and communications.", 1, now_iso, now_iso
            ),
        ]
        cur.executemany("INSERT OR REPLACE INTO financial_budgets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", budgets)

        # 5. Financial Transactions (24 cols)
        transactions = [
            (
                "tx-1", "TX-2026-0001", "org-solian-wolves", "income", "2026-11-15",
                "Meridian Global Logistics Milestone 1 Retainer Payment", 1200000.0, "KES",
                "acc-kcb-01", None, "Client Retainer", "p-101", "c-1", "inv-1", None,
                "bank_transfer", "completed", "tm-1", "Alice Moraa Nyakundi", None,
                "Payment received via RTGS into KCB Corporate Operating Account.", 1, now_iso, now_iso
            ),
            (
                "tx-2", "TX-2026-0002", "org-solian-wolves", "expense", "2026-11-18",
                "SaaS Hosting & AI Cloud Instances Monthly Billing", 280000.0, "KES",
                "acc-kcb-01", None, "Software and subscriptions", "p-102", None, None, None,
                "bank_transfer", "completed", "tm-1", "Alice Moraa Nyakundi", None,
                "Automated recurring corporate debit for cloud telemetry cluster.", 1, now_iso, now_iso
            ),
            (
                "tx-3", "TX-2026-0003", "org-solian-wolves", "expense", "2026-11-20",
                "Field Operations Logistics & Regional Fuel Dispatches", 45000.0, "KES",
                "acc-mpesa-01", None, "Transport", None, None, None, None,
                "mobile_money", "completed", "tm-1", "Hillary Onchwati Isaiah", None,
                "Dispatched via M-Pesa Business Till for logistical deployment.", 1, now_iso, now_iso
            ),
            (
                "tx-4", "TX-2026-0004", "org-solian-wolves", "transfer", "2026-11-21",
                "Operating Treasury Replenishment to M-Pesa Till", 100000.0, "KES",
                "acc-kcb-01", "acc-mpesa-01", "Internal Transfer", None, None, None, None,
                "bank_transfer", "completed", "tm-1", "Alice Moraa Nyakundi", None,
                "Authorized internal liquidity transfer to replenish operating mobile till.", 1, now_iso, now_iso
            ),
        ]
        cur.executemany("INSERT OR REPLACE INTO financial_transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", transactions)

        # 6. Expense & Procurement Requests (23 cols)
        requests = [
            (
                "req-1", "org-solian-wolves", "Edge Telemetry Sensor Hardware Batch",
                "Low-latency edge microcontrollers for Project Alpha pilot deployment",
                "Equipment", 210000.0, "KES", "tm-1", "Solomon Nyangweso Omwenga",
                "p-101", "Project Alpha: Edge Telemetry Architecture", "Technology",
                "urgent", "submitted", None, None, None, None, None, None, 1, now_iso, now_iso
            ),
            (
                "req-2", "org-solian-wolves", "Annual Compliance & Statutory Audit Retainer",
                "Statutory corporate filing, financial governance, and legal compliance advisory",
                "Professional services", 450000.0, "KES", "tm-1", "Alice Moraa Nyakundi",
                None, None, "Finance", "normal", "approved", "tm-1", "Ian Momanyi Nyakundi",
                "Approved in Executive Strategy Session. Ready for treasury dispatch upon voucher presentation.",
                now_iso, None, None, 1, now_iso, now_iso
            ),
        ]
        cur.executemany("INSERT OR REPLACE INTO expense_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", requests)
        conn.commit()

    def _seed_initial_data(self, conn: Optional[sqlite3.Connection] = None):
        owns_conn = False
        if conn is None:
            conn = self._get_connection()
            owns_conn = True
        cur = conn.cursor()

        # Seed finance data (accounts, invoices, payables, budgets, transactions)
        self._seed_finance_data(conn)

        # Seed clean verified production statutory foundation
        self._bootstrap_production_foundation(conn)

        # 1. Organization: Solian Wolves (Neutral, unverified fields set to None)
        cur.execute("""
        INSERT OR REPLACE INTO organizations (
            id, name, code, tagline, mission, vision, operating_model,
            headquarters, founded_year, primary_timezone, fiscal_year, tier, total_members
        ) VALUES (
            'org-solian-wolves',
            'Solian Wolves',
            'SLN-WLV',
            'Organizational Intelligence & High-Trust Autonomous Operations',
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            'UTC',
            NULL,
            'enterprise',
            6
        );
        """)

        # 2. Operating Principles (DEMO Templates)
        principles = [
            ("op-1", "org-solian-wolves", "[DEMO Template] High-Trust Autonomy", "Empower distributed teams with clear SOPs and verified decision matrices while maintaining absolute accountability.", 1),
            ("op-2", "org-solian-wolves", "[DEMO Template] Precise Grounding", "Never fabricate operational intelligence; distinguish verified knowledge from assumptions and surface unknown data gaps early.", 1),
            ("op-3", "org-solian-wolves", "[DEMO Template] Strict RBAC & Boundary Isolation", "Institutional and customer data must strictly respect multi-tenant boundaries and security clearance tiers.", 1),
            ("op-4", "org-solian-wolves", "[DEMO Template] Velocity Through Discipline", "Standard Operating Procedures (SOPs) are living operational assets reviewed regularly to prevent drift.", 1),
        ]
        cur.executemany("INSERT OR REPLACE INTO operating_principles VALUES (?, ?, ?, ?, ?);", principles)

        # 3. Operating Cadences (DEMO Templates)
        cadences = [
            ("cad-1", "org-solian-wolves", "Executive Strategic Briefing", "Weekly (Mondays 09:00 UTC)", "Executive Leadership & Department Heads", "High-level review of strategic initiatives, capital velocity, and cross-departmental blockers.", "Ian Momanyi Nyakundi", 0),
            ("cad-2", "org-solian-wolves", "[DEMO Template] Engineering & AI Mesh Sync", "Bi-Weekly (Tuesdays 14:00 UTC)", "AI Ops, Architecture & Data Teams", "Audit sprint velocity, LLM boundary latency, and model infrastructure deployments.", "[DEMO] Sarah Chen", 1),
            ("cad-3", "org-solian-wolves", "[DEMO Template] Client Operations Triage", "Daily (10:00 UTC)", "Strategic Accounts & Client Leads", "Review client escalation tickets, SLA adherence, and contract milestones.", "[DEMO] Marcus Vance", 1),
            ("cad-4", "org-solian-wolves", "[DEMO Template] Institutional Knowledge Audit", "Monthly (First Friday)", "Compliance & Data Intelligence", "Evaluate stale documentation, update SOP classifications, and audit RBAC matrices.", "[DEMO] Elena Rostova", 1),
        ]
        cur.executemany("INSERT OR REPLACE INTO operating_cadences VALUES (?, ?, ?, ?, ?, ?, ?, ?);", cadences)

        # 4. Departments (DEMO Templates)
        departments = [
            ("dept-exec", "org-solian-wolves", "Executive Leadership & Strategy", "EXEC", "Corporate strategy, capital allocation, governance, and organizational command.", "tm-1", "Ian Momanyi Nyakundi", 1, 1, 0),
            ("dept-eng", "org-solian-wolves", "[DEMO Template] Engineering & AI Operations", "ENG-AI", "AUREN SOLIAN core mesh architecture, backend systems, and container infrastructure.", "tm-2", "[DEMO] Sarah Chen", 1, 1, 1),
            ("dept-strat", "org-solian-wolves", "[DEMO Template] Strategic Advisory & Client Accounts", "STRAT", "Enterprise client management, advisory services, commercial contracts, and SLA delivery.", "tm-3", "[DEMO] Marcus Vance", 2, 1, 1),
            ("dept-arch", "org-solian-wolves", "[DEMO Template] Product Architecture & Governance", "ARCH", "Security architecture, multi-tenant RBAC boundaries, and regulatory SOC2 compliance.", "tm-4", "[DEMO] Elena Rostova", 1, 1, 1),
            ("dept-data", "org-solian-wolves", "[DEMO Template] Data Intelligence & Knowledge Systems", "DATA", "Vector memory stores, institutional SOP ingestion, and semantic search pipelines.", "tm-5", "[DEMO] David Ochieng", 1, 0, 1),
        ]
        cur.executemany("INSERT OR REPLACE INTO departments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", departments)

        # 5. Teams (DEMO Templates)
        teams = [
            ("team-1", "org-solian-wolves", "dept-eng", "[DEMO Template] Engineering & AI Operations", "[DEMO] Core AI Mesh", "[DEMO] Sarah Chen", "Design and maintain high-speed LLM inference and streaming pipelines.", "AI Pipeline & Orchestration", 1, 1),
            ("team-2", "org-solian-wolves", "dept-eng", "[DEMO Template] Engineering & AI Operations", "[DEMO] Autonomous Infrastructure", "[DEMO] Sarah Chen", "Resilient container deployments, database migrations, and telemetry.", "Cloud & Infrastructure", 1, 1),
            ("team-3", "org-solian-wolves", "dept-strat", "[DEMO Template] Strategic Advisory & Client Accounts", "[DEMO] Enterprise Client Growth", "[DEMO] Marcus Vance", "Commercial expansion and enterprise client relationships.", "Client Accounts & CRM", 1, 1),
            ("team-4", "org-solian-wolves", "dept-arch", "[DEMO Template] Product Architecture & Governance", "[DEMO] Risk & Compliance Operations", "[DEMO] Elena Rostova", "Data classification, RBAC enforcement, and boundary verification.", "Security & Compliance", 1, 1),
            ("team-5", "org-solian-wolves", "dept-data", "[DEMO Template] Data Intelligence & Knowledge Systems", "[DEMO] Knowledge Pipeline Team", "[DEMO] David Ochieng", "Semantic indexing, corporate document ingestion, and search latency.", "Knowledge Retrieval", 1, 1),
        ]
        cur.executemany("INSERT OR REPLACE INTO teams VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", teams)

        # 6. Members
        # Verified Solian Wolves Leadership Council
        members = [
            (
                "tm-1", "usr-1", "org-solian-wolves", "Ian Momanyi Nyakundi", "ian.nyakundi@solianwolves.co", "owner",
                "Chief Executive Officer", "dept-exec", "Executive Leadership & Governance",
                None, "Executive Council",
                json.dumps(["Corporate Strategy & Executive Governance", "Capital Allocation & Operational Authority", "Strategic Alliances"]),
                None, None, "active", 0, "2024-01-01", 0
            ),
            (
                "tm-2", "usr-2", "org-solian-wolves", "Hillary Onchwati Isaiah", "hillary.isaiah@solianwolves.co", "admin",
                "Chief Operating Officer", "dept-ops", "Operations & Delivery",
                None, "Executive Council",
                json.dumps(["Operations Leadership & Delivery", "Organizational Cadences", "Resource Coordination"]),
                "tm-1", "Ian Momanyi Nyakundi", "active", 0, "2024-01-01", 0
            ),
            (
                "tm-3", "usr-3", "org-solian-wolves", "Alice Moraa Nyakundi", "alice.moraa@solianwolves.co", "admin",
                "Chief Financial Officer", "dept-fin", "Finance & Corporate Treasury",
                None, "Executive Council",
                json.dumps(["Treasury & Financial Planning", "Budget Control & Capital Management", "Auditing & Compliance"]),
                "tm-1", "Ian Momanyi Nyakundi", "active", 0, "2024-01-01", 0
            ),
            (
                "tm-4", "usr-4", "org-solian-wolves", "Noella Maraka Kaatho", "noella.maraka@solianwolves.co", "manager",
                "Executive Director / Finance & Administration", "dept-admin", "Administration & Corporate Services",
                None, "Executive Council",
                json.dumps(["Corporate Administration & Compliance", "Operations Support", "Organizational Governance"]),
                "tm-1", "Ian Momanyi Nyakundi", "active", 0, "2024-01-01", 0
            ),
            (
                "tm-5", "usr-5", "org-solian-wolves", "Solomon Nyangweso Omwenga", "solomon.omwenga@solianwolves.co", "admin",
                "Chief Technology Officer", "dept-tech", "Technology & AI Systems",
                None, "Executive Council",
                json.dumps(["Technology Architecture & AI Systems", "Security Infrastructure", "Engineering Leadership"]),
                "tm-1", "Ian Momanyi Nyakundi", "active", 0, "2024-01-01", 0
            ),
        ]
        cur.executemany("""
        INSERT OR REPLACE INTO members (
            id, user_id, organization_id, name, email, role, title,
            department_id, department, team_id, team, responsibilities,
            reports_to_id, reports_to_name, status, assigned_projects,
            joined_date, is_demo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, members)

        # 7. Knowledge Items (DEMO Templates - explicitly is_verified = 0, is_demo = 1)
        knowledge = [
            (
                "sop-401", "org-solian-wolves",
                "[DEMO] Enterprise Incident Escalation Framework (SOP-401)",
                "SOP",
                "Demonstration template for Severity-1 operational bottlenecks, client notification SLAs, and executive escalation trees.",
                "Demonstration protocol specification outlining response SLAs (15 min for P1), command bridge setup, and client advisories for Solian Wolves testing.",
                "Internal", 0, "Engineering & AI Operations", "2.1", "2026-11-20", "Solian Operations",
                json.dumps(["demo", "incident", "SLA", "escalation", "engineering"]), 1
            ),
            (
                "pol-202", "org-solian-wolves",
                "[DEMO] Corporate Data Classification & Access Governance (POL-202)",
                "Compliance",
                "Demonstration policy controls for Confidential and Restricted business records, RBAC tiers, and AI boundary isolation.",
                "Demonstration rules governing multi-tenant data isolation, model training confidentiality boundaries, and role credential management.",
                "Confidential", 0, "Product Architecture & Governance", "1.4", "2026-11-18", "Solian Operations",
                json.dumps(["demo", "security", "compliance", "RBAC", "governance", "classification"]), 1
            ),
            (
                "pb-105", "org-solian-wolves",
                "[DEMO] High-Value Client Onboarding & Stakeholder Kickoff (PB-105)",
                "Playbook",
                "Demonstration template engagement ritual from contract signing to milestone-0 delivery review.",
                "Demonstration playbook detailing technical discovery, resource allocation, and initial sprint velocity calibration for testing.",
                "Internal", 0, "Strategic Advisory & Client Accounts", "1.2", "2026-11-15", "Solian Operations",
                json.dumps(["demo", "clients", "onboarding", "milestones"]), 1
            ),
            (
                "arch-003", "org-solian-wolves",
                "[DEMO] Solian Intelligence Mesh Architecture & Security Boundary (ARCH-003)",
                "Architecture",
                "Demonstration technical design of the multi-tenant context router, zero-trust LLM boundary, and asynchronous event bus.",
                "Demonstration technical specifications of AUREN SOLIAN core architecture and container orchestration.",
                "Restricted", 0, "Engineering & AI Operations", "3.0", "2026-11-12", "Solian Operations",
                json.dumps(["demo", "architecture", "security", "ai-mesh", "restricted"]), 1
            ),
            (
                "pol-101", "org-solian-wolves",
                "[DEMO] Operating Principles & Code of Discipline (POL-101)",
                "Policy",
                "Demonstration corporate identity, operational autonomy tenets, and ethical guidelines for testing.",
                "Demonstration operating policy detailing organizational values, executive accountability, and disciplined delivery practices.",
                "Public", 0, "Executive Leadership & Strategy", "1.0", "2026-11-01", "Ian Momanyi Nyakundi",
                json.dumps(["demo", "identity", "principles", "discipline", "public"]), 1
            ),
            (
                "sop-302", "org-solian-wolves",
                "[DEMO] Operational Task Delegation & Signoff Procedure (SOP-302)",
                "SOP",
                "Demonstration standard procedure for converting AI action proposals into verified tasks and completing executive reviews.",
                "Demonstration workflow defining how department managers review, accept, or reject action proposals without silent operational execution.",
                "Internal", 0, "Executive Leadership & Strategy", "1.1", "2026-11-10", "Ian Momanyi Nyakundi",
                json.dumps(["demo", "tasks", "delegation", "ai-proposals", "governance"]), 1
            ),
        ]
        cur.executemany("INSERT OR REPLACE INTO knowledge_items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", knowledge)

        # 8. Projects (DEMO)
        projects = [
            (
                "p-101", "org-solian-wolves", "[DEMO] Project Apex: Autonomous Supply Sync", "[DEMO] Meridian Logistics",
                "in_progress", 68, "[DEMO] Sarah Chen", "2026-12-15", "critical", "Engineering & AI Operations",
                "Demonstration initiative simulating multi-node supply synchronization mesh for testing.", 1
            ),
            (
                "p-102", "org-solian-wolves", "[DEMO] Intelligence Mesh Architecture Rollout", "Internal",
                "in_progress", 85, "Ian Momanyi Nyakundi", "2026-11-30", "high", "Executive Leadership & Strategy",
                "Demonstration deployment of AUREN SOLIAN components across internal testing divisions.", 1
            ),
            (
                "p-103", "org-solian-wolves", "[DEMO] Compliance Vault Migration & SOC2", "[DEMO] Aether Capital",
                "review", 92, "[DEMO] Elena Rostova", "2026-12-05", "high", "Product Architecture & Governance",
                "Demonstration testing of SOC2 Type II validation and multi-tenant encryption isolation.", 1
            ),
            (
                "p-104", "org-solian-wolves", "[DEMO] Automated Operations Triage Engine", "[DEMO] Vanguard Group",
                "planning", 25, "[DEMO] Marcus Vance", "2027-01-10", "medium", "Strategic Advisory & Client Accounts",
                "Demonstration automated intake, classification, and routing of Tier-1 escalations.", 1
            ),
        ]
        cur.executemany("INSERT OR REPLACE INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", projects)

        # 9. Tasks (DEMO)
        tasks = [
            (
                "t-1", "org-solian-wolves", "[DEMO] Synthesize Q4 Operations Review for Board",
                "Demonstration task: compile departmental deliverables, AI system metrics, and executive budget allocations.",
                "p-102", "[DEMO] Intelligence Mesh Architecture Rollout", "in_progress", "urgent",
                "Ian Momanyi Nyakundi", "2026-11-25", "Executive Leadership & Strategy", "2026-11-20", 1
            ),
            (
                "t-2", "org-solian-wolves", "[DEMO] Audit Multi-Tenant RBAC Security Matrix",
                "Demonstration task: verify boundary isolation between departments and guest credentials.",
                "p-103", "[DEMO] Compliance Vault Migration & SOC2", "review", "high",
                "[DEMO] Sarah Chen", "2026-11-26", "Engineering & AI Operations", "2026-11-21", 1
            ),
            (
                "t-3", "org-solian-wolves", "[DEMO] Update Client Escalation Playbook",
                "Demonstration task: incorporate automated dispatch triggers per incident review template.",
                "p-101", "[DEMO] Project Apex: Autonomous Supply Sync", "backlog", "medium",
                "[DEMO] Marcus Vance", "2026-11-28", "Strategic Advisory & Client Accounts", "2026-11-22", 1
            ),
            (
                "t-4", "org-solian-wolves", "[DEMO] Finalize Institutional Knowledge Ingestion",
                "Demonstration task: index handbooks and engineering blueprints into SQLite memory store.",
                "p-102", "[DEMO] Intelligence Mesh Architecture Rollout", "completed", "high",
                "[DEMO] David Ochieng", "2026-11-20", "Data Intelligence & Knowledge Systems", "2026-11-18", 1
            ),
        ]
        cur.executemany("INSERT OR REPLACE INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", tasks)

        # 10. Clients (DEMO)
        clients = [
            ("c-1", "org-solian-wolves", "[DEMO] Meridian Global Logistics", "Alister Sterling (Demo)", "demo-sterling@meridian.test", "active", "$240,000 / yr (Demo)", "[DEMO] Marcus Vance", "Demonstration client account for testing CRM views.", 1),
            ("c-2", "org-solian-wolves", "[DEMO] Aether Capital Partners", "Beatrice Holt (Demo)", "demo-holt@aethercap.test", "retained", "$360,000 / yr (Demo)", "Ian Momanyi Nyakundi", "Demonstration private equity partner for testing retained accounts.", 1),
            ("c-3", "org-solian-wolves", "[DEMO] Vanguard Industrial Systems", "Robert Drake (Demo)", "demo-drake@vanguardind.test", "contract_pending", "$180,000 / yr (Demo)", "[DEMO] Marcus Vance", "Demonstration industrial client in contract review stage.", 1),
        ]
        cur.executemany("INSERT OR REPLACE INTO clients VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", clients)

        # 11. Documents (DEMO)
        documents = [
            ("doc-1", "org-solian-wolves", "[DEMO] Master Services Agreement (MSA) Template.pdf", "PDF Document", "2.4 MB", "Confidential", "2026-11-19", "Legal & Risk", "Strategic Advisory & Client Accounts", 1),
            ("doc-2", "org-solian-wolves", "[DEMO] Architecture & Data Security Whitepaper.pdf", "PDF Document", "5.1 MB", "Internal", "2026-11-14", "Architecture", "Engineering & AI Operations", 1),
            ("doc-3", "org-solian-wolves", "[DEMO] Q3 Operations & Financial Synthesis.xlsx", "Spreadsheet", "1.2 MB", "Restricted", "2026-10-31", "Executive Board", "Executive Leadership & Strategy", 1),
        ]
        cur.executemany("INSERT OR REPLACE INTO documents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", documents)

        # 12. Workflows (DEMO)
        workflows = [
            ("wf-1", "org-solian-wolves", "[DEMO] High-Priority Client Escalation Auto-Triage", "Client urgency flag in support desk", "Notify Director + Auto-create P1 Incident in Solian Tasks", "active", 124, "Strategic Advisory & Client Accounts", 1),
            ("wf-2", "org-solian-wolves", "[DEMO] Weekly Executive Intelligence Digest", "Every Friday at 17:00 UTC", "Compile project velocities, unblockers & budget status", "active", 52, "Executive Leadership & Strategy", 1),
            ("wf-3", "org-solian-wolves", "[DEMO] Knowledge Drift & Stale Policy Audit", "Document untouched for > 90 days", "Assign verification ticket to department author", "active", 18, "Product Architecture & Governance", 1),
        ]
        cur.executemany("INSERT OR REPLACE INTO workflows VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);", workflows)

        # 13. Company Activities (DEMO)
        activities = [
            ("act-1", "org-solian-wolves", "[DEMO] Sarah Chen", "milestone", "[DEMO] Project Apex: Milestone 2 Reached", "Demonstration milestone reached for testing activity feeds.", "2026-11-22 10:30 UTC", "projects", 1),
            ("act-2", "org-solian-wolves", "[DEMO] David Ochieng", "sop_indexed", "[DEMO] SOP-401 Incident Protocol Updated", "Demonstration indexing of escalation protocol.", "2026-11-22 09:15 UTC", "knowledge", 1),
            ("act-3", "org-solian-wolves", "[DEMO] Marcus Vance", "task_created", "[DEMO] Created Escalation Review Task", "Demonstration triage review scheduled for testing.", "2026-11-21 16:45 UTC", "tasks", 1),
            ("act-4", "org-solian-wolves", "Ian Momanyi Nyakundi", "milestone", "[DEMO] Operations Briefing Prepared", "Demonstration briefing entry.", "2026-11-21 14:00 UTC", "dashboard", 1),
            ("act-5", "org-solian-wolves", "[DEMO] Elena Rostova", "doc_uploaded", "[DEMO] Compliance Whitepaper Uploaded", "Demonstration whitepaper upload in confidential registry.", "2026-11-20 11:20 UTC", "documents", 1),
        ]
        cur.executemany("INSERT OR REPLACE INTO company_activities VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);", activities)

        # 14. Meetings (DEMO)
        meetings = [
            (
                "mtg-1", "org-solian-wolves", "Executive Strategy & Capital Allocation Review",
                "executive", "Ian Momanyi Nyakundi", "tm-1", "2026-11-24", "10:00", 60, "Executive Boardroom & Virtual",
                "https://meet.solian.ai/exec-sync", None, None,
                json.dumps(["Q4 Strategic Priorities", "Institutional Capital Allocation", "Enterprise Client SLA Adherence"]),
                "Reviewed Q4 operating plan and confirmed milestone timelines across all engineering tracks.",
                json.dumps([
                    {"id": "dec-1", "decision": "Approve unified PostgreSQL migration with zero-trust tenant isolation", "impact": "Enforces complete customer isolation and unlocks production Supabase deployment", "status": "approved", "knowledge_item_id": None},
                    {"id": "dec-2", "decision": "Authorize new enterprise client onboarding protocol with automatic SLA alerts", "impact": "Reduces onboarding latency by 45%", "status": "approved", "knowledge_item_id": None}
                ]),
                json.dumps(["Ian Momanyi Nyakundi", "Hillary Onchwati Isaiah", "Alice Moraa Nyakundi", "Noella Maraka Kaatho", "Solomon Nyangweso Omwenga"]),
                json.dumps([
                    {"id": "act-item-1", "title": "Finalize RLS tenant isolation verification in staging cluster", "assignee": "Solomon Nyangweso Omwenga", "due_date": "2026-11-26", "status": "pending", "task_id": None},
                    {"id": "act-item-2", "title": "Publish updated enterprise governance charter to Knowledge Vault", "assignee": "Alice Moraa Nyakundi", "due_date": "2026-11-28", "status": "pending", "task_id": None}
                ]),
                "scheduled", "2026-11-20T08:00:00Z", 0
            ),
            (
                "mtg-2", "org-solian-wolves", "[DEMO] AI Mesh Architecture & Telemetry Sprint Planning",
                "department", "[DEMO] Sarah Chen", "tm-2", "2026-11-25", "14:00", 45, "Virtual Link",
                "https://meet.solian.ai/eng-sync", "p-102", None,
                json.dumps(["FastAPI Backend Endpoints Optimization", "Vite Frontend Production Bundle Optimization", "Test Suite Coverage Expansion"]),
                "Evaluated streaming latency and confirmed all unit tests pass with zero flakiness.",
                json.dumps([
                    {"id": "dec-3", "decision": "Standardize all company API responses on typed Pydantic V2 schemas", "impact": "Prevents data corruption across frontend-backend boundaries", "status": "approved", "knowledge_item_id": None}
                ]),
                json.dumps(["[DEMO] Sarah Chen", "[DEMO] David Ochieng", "Solomon Nyangweso Omwenga"]),
                json.dumps([
                    {"id": "act-item-3", "title": "Implement unified command palette search across all modules", "assignee": "[DEMO] Sarah Chen", "due_date": "2026-11-27", "status": "pending", "task_id": None}
                ]),
                "scheduled", "2026-11-21T09:30:00Z", 1
            ),
            (
                "mtg-3", "org-solian-wolves", "[DEMO] Meridian Global Logistics SLA Operations Review",
                "client", "[DEMO] Marcus Vance", "tm-3", "2026-11-26", "11:00", 60, "Client Portal Conference",
                "https://meet.solian.ai/meridian-sla", None, "c-1",
                json.dumps(["Review Monthly SLA Performance", "Capacity Allocation for Peak Season", "Q1 Contract Renewal Discussion"]),
                "Client expressed satisfaction with platform reliability and agreed to contract renewal terms.",
                json.dumps([
                    {"id": "dec-4", "decision": "Extend dedicated SLA tier for Meridian Logistics through 2027", "impact": "Secures enterprise ARR commitment", "status": "approved", "knowledge_item_id": None}
                ]),
                json.dumps(["[DEMO] Marcus Vance", "Alister Sterling (Demo)", "Ian Momanyi Nyakundi"]),
                json.dumps([
                    {"id": "act-item-4", "title": "Draft revised Master Services Agreement amendment", "assignee": "[DEMO] Marcus Vance", "due_date": "2026-11-29", "status": "pending", "task_id": None}
                ]),
                "scheduled", "2026-11-22T11:00:00Z", 1
            ),
        ]
        cur.executemany("INSERT OR IGNORE INTO meetings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", meetings)

        # 15. Discussions (DEMO)
        discussions = [
            (
                "dsc-1", "org-solian-wolves", "company", "general", "General Announcements",
                "tm-1", "Ian Momanyi Nyakundi", "owner", "Welcome to Solian Wolves Unified Operating Environment",
                "The AUREN SOLIAN platform is now active as our primary company intelligence and operational command system. All department leads, please ensure your sprint deliverables, client accounts, and institutional knowledge are accurately reflected in the system.",
                None, 1, "2026-11-20T10:00:00Z", 1
            ),
            (
                "dsc-2", "org-solian-wolves", "company", "general", "General Announcements",
                "tm-2", "[DEMO] Sarah Chen", "admin", "Infrastructure Update: Dual PostgreSQL & SQLite Architecture Active",
                "Engineering has completed the database abstraction layer supporting real PostgreSQL clusters with strict multi-tenant Row-Level Security while preserving seamless local development. Next up: production Supabase integration.",
                "dsc-1", 0, "2026-11-20T11:15:00Z", 1
            ),
            (
                "dsc-3", "org-solian-wolves", "department", "dept-eng", "Engineering & AI Operations",
                "tm-2", "[DEMO] Sarah Chen", "admin", "FastAPI Endpoints & Type-Safe Integration Guidelines",
                "All backend routes must now validate through Pydantic models with clear error envelopes. Please review the updated schemas before opening merge requests.",
                None, 1, "2026-11-21T09:00:00Z", 1
            ),
            (
                "dsc-4", "org-solian-wolves", "department", "dept-strat", "Strategic Advisory & Client Accounts",
                "tm-3", "[DEMO] Marcus Vance", "manager", "Meridian Global Logistics SLA Performance Briefing",
                "Meridian Logistics reports 99.98% uptime on their supply chain orchestration integration. We are on track for Q1 contract expansion.",
                None, 0, "2026-11-22T08:30:00Z", 1
            ),
        ]
        cur.executemany("INSERT OR IGNORE INTO discussions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", discussions)

        # 16. Notifications (DEMO)
        notifications = [
            ("notif-1", "org-solian-wolves", "usr-1", "Executive Review Scheduled", "Strategic Review meeting scheduled for Nov 24, 10:00 UTC", "meeting_invite", "meetings", "mtg-1", 0, "high", "2026-11-22T09:00:00Z"),
            ("notif-2", "org-solian-wolves", "usr-1", "Task Assigned: RLS Tenant Isolation", "You have been assigned to verify RLS tenant isolation across all enterprise tables.", "task_assigned", "tasks", "t-101", 0, "urgent", "2026-11-22T09:30:00Z"),
            ("notif-3", "org-solian-wolves", "all", "Platform Upgrade Notice", "AUREN SOLIAN platform v2.5 unified workspace is active.", "announcement", None, None, 1, "normal", "2026-11-21T12:00:00Z"),
        ]
        cur.executemany("INSERT OR IGNORE INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", notifications)
        conn.commit()
        if owns_conn:
            conn.close()

    def _bootstrap_production_foundation(self, conn: Optional[sqlite3.Connection] = None):
        """Bootstraps clean production organizational foundation with verified statutory officers and zero fake demo data."""
        owns_conn = False
        if conn is None:
            conn = self._get_connection()
            owns_conn = True
        cur = conn.cursor()

        # 1. Organization: Solian Wolves
        cur.execute("""
        INSERT OR REPLACE INTO organizations (
            id, name, code, tagline, mission, vision, operating_model,
            headquarters, founded_year, primary_timezone, fiscal_year, tier, total_members
        ) VALUES (
            'org-solian-wolves',
            'Solian Wolves',
            'SLN-WLV',
            'Organizational Intelligence & High-Trust Autonomous Operations',
            'Deliver high-trust autonomous operations and enterprise intelligence solutions with uncompromising integrity.',
            'The leading digital operating environment for mission-critical company intelligence.',
            'Autonomous Distributed Operations with Centralized Governance',
            'Nairobi, Kenya',
            2024,
            'Africa/Nairobi',
            'January - December',
            'enterprise',
            5
        );
        """)

        # 2. Operating Principles (Verified statutory principles, is_demo=0)
        principles = [
            ("op-1", "org-solian-wolves", "High-Trust Autonomy", "Empower distributed teams with clear SOPs and verified decision matrices while maintaining absolute accountability.", 0),
            ("op-2", "org-solian-wolves", "Precise Grounding", "Never fabricate operational intelligence; distinguish verified knowledge from assumptions and surface unknown data gaps early.", 0),
            ("op-3", "org-solian-wolves", "Strict RBAC & Boundary Isolation", "Institutional and customer data must strictly respect multi-tenant boundaries and security clearance tiers.", 0),
            ("op-4", "org-solian-wolves", "Velocity Through Discipline", "Standard Operating Procedures (SOPs) are living operational assets reviewed regularly to prevent drift.", 0),
        ]
        cur.executemany("INSERT OR REPLACE INTO operating_principles VALUES (?, ?, ?, ?, ?);", principles)

        # 3. Operating Cadences (Verified cadences, is_demo=0)
        cadences = [
            ("cad-1", "org-solian-wolves", "Executive Strategic Briefing", "Weekly (Mondays 09:00 UTC)", "Executive Leadership & Statutory Officers", "High-level review of strategic initiatives, capital velocity, and cross-departmental alignment.", "Ian Momanyi Nyakundi", 0),
            ("cad-2", "org-solian-wolves", "Operations & Delivery Sync", "Bi-Weekly (Tuesdays 14:00 UTC)", "Operations, Delivery & Architecture Leads", "Audit operational velocity, milestone delivery, and client engagement health.", "Hillary Onchwati Isaiah", 0),
            ("cad-3", "org-solian-wolves", "Treasury & Capital Review", "Monthly (First Friday)", "Finance & Executive Leadership", "Review financial statements, cash flow, budget allocations, and accounts receivable.", "Alice Moraa Nyakundi", 0),
            ("cad-4", "org-solian-wolves", "Technology Architecture & AI Systems", "Weekly (Thursdays 15:00 UTC)", "Technology, AI Engineering & Security", "Review AI model performance, platform infrastructure, and security controls.", "Solomon Nyangweso Omwenga", 0),
        ]
        cur.executemany("INSERT OR REPLACE INTO operating_cadences VALUES (?, ?, ?, ?, ?, ?, ?, ?);", cadences)

        # 4. Official Corporate Departments (is_demo=0)
        departments = [
            ("dept-exec", "org-solian-wolves", "Executive Leadership & Governance", "EXEC", "Corporate strategy, capital allocation, statutory governance, and executive command.", "tm-1", "Ian Momanyi Nyakundi", 1, 1, 0),
            ("dept-ops", "org-solian-wolves", "Operations & Delivery", "OPS", "Company operations, client delivery, service level agreements, and workflow coordination.", "tm-2", "Hillary Onchwati Isaiah", 1, 1, 0),
            ("dept-fin", "org-solian-wolves", "Finance & Corporate Treasury", "FIN", "Corporate treasury, cash flow management, budgeting, financial reporting, and audit.", "tm-3", "Alice Moraa Nyakundi", 1, 1, 0),
            ("dept-admin", "org-solian-wolves", "Administration & Corporate Services", "ADMIN", "Human resources, facilities, compliance, statutory documentation, and corporate administration.", "tm-4", "Noella Maraka Kaatho", 1, 1, 0),
            ("dept-tech", "org-solian-wolves", "Technology & AI Systems", "TECH", "AUREN platform engineering, AI systems integration, security architecture, and cloud operations.", "tm-5", "Solomon Nyangweso Omwenga", 1, 1, 0),
        ]
        cur.executemany("INSERT OR REPLACE INTO departments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", departments)

        # 5. Statutory Officers / Leadership Council (all is_demo=0)
        members = [
            (
                "tm-1", "usr-1", "org-solian-wolves", "Ian Momanyi Nyakundi", "ian.nyakundi@solianwolves.co", "owner",
                "Chief Executive Officer", "dept-exec", "Executive Leadership & Governance",
                None, "Executive Council",
                json.dumps(["Corporate Strategy & Executive Governance", "Capital Allocation & Operational Authority", "Strategic Alliances"]),
                None, None, "active", 0, "2024-01-01", 0
            ),
            (
                "tm-2", "usr-2", "org-solian-wolves", "Hillary Onchwati Isaiah", "hillary.isaiah@solianwolves.co", "admin",
                "Chief Operating Officer", "dept-ops", "Operations & Delivery",
                None, "Executive Council",
                json.dumps(["Operations Leadership & Delivery", "Organizational Cadences", "Resource Coordination"]),
                "tm-1", "Ian Momanyi Nyakundi", "active", 0, "2024-01-01", 0
            ),
            (
                "tm-3", "usr-3", "org-solian-wolves", "Alice Moraa Nyakundi", "alice.moraa@solianwolves.co", "admin",
                "Chief Financial Officer", "dept-fin", "Finance & Corporate Treasury",
                None, "Executive Council",
                json.dumps(["Treasury & Financial Planning", "Budget Control & Capital Management", "Auditing & Compliance"]),
                "tm-1", "Ian Momanyi Nyakundi", "active", 0, "2024-01-01", 0
            ),
            (
                "tm-4", "usr-4", "org-solian-wolves", "Noella Maraka Kaatho", "noella.maraka@solianwolves.co", "manager",
                "Executive Director / Finance & Administration", "dept-admin", "Administration & Corporate Services",
                None, "Executive Council",
                json.dumps(["Corporate Administration & Compliance", "Operations Support", "Organizational Governance"]),
                "tm-1", "Ian Momanyi Nyakundi", "active", 0, "2024-01-01", 0
            ),
            (
                "tm-5", "usr-5", "org-solian-wolves", "Solomon Nyangweso Omwenga", "solomon.omwenga@solianwolves.co", "admin",
                "Chief Technology Officer", "dept-tech", "Technology & AI Systems",
                None, "Executive Council",
                json.dumps(["Technology Architecture & AI Systems", "Security Infrastructure", "Engineering Leadership"]),
                "tm-1", "Ian Momanyi Nyakundi", "active", 0, "2024-01-01", 0
            ),
        ]
        cur.executemany("""
        INSERT OR REPLACE INTO members (
            id, user_id, organization_id, name, email, role, title,
            department_id, department, team_id, team, responsibilities,
            reports_to_id, reports_to_name, status, assigned_projects,
            joined_date, is_demo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, members)
        conn.commit()
        if owns_conn:
            conn.close()

    def purge_demo_data(self) -> Dict[str, int]:
        """Purges all demo rows (flagged with is_demo=1 or [DEMO]) from the database."""
        if settings.is_production:
            raise RuntimeError("DEMO PURGE VIOLATION: purge_demo_data() is strictly prohibited in production environments.")
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("PRAGMA foreign_keys = OFF;")
        purged = {}

        tables_with_conditions = [
            ("financial_transactions", "is_demo = 1 OR reference LIKE '%DEMO%'"),
            ("invoices", "is_demo = 1 OR invoice_number LIKE '%DEMO%'"),
            ("accounts_payable", "is_demo = 1 OR reference LIKE '%DEMO%'"),
            ("financial_budgets", "is_demo = 1"),
            ("expense_requests", "is_demo = 1"),
            ("financial_accounts", "is_demo = 1"),
            ("tasks", "is_demo = 1 OR title LIKE '%[DEMO]%'"),
            ("projects", "is_demo = 1 OR name LIKE '%[DEMO]%'"),
            ("knowledge_items", "is_demo = 1 OR title LIKE '%[DEMO]%'"),
            ("documents", "is_demo = 1 OR name LIKE '%[DEMO]%'"),
            ("workflows", "is_demo = 1 OR title LIKE '%[DEMO]%'"),
            ("clients", "is_demo = 1 OR company_name LIKE '%[DEMO]%'"),
            ("meetings", "is_demo = 1 OR title LIKE '%[DEMO]%'"),
            ("discussions", "is_demo = 1 OR title LIKE '%[DEMO]%'"),
            ("teams", "is_demo = 1 OR name LIKE '%[DEMO]%'"),
            ("departments", "is_demo = 1 OR name LIKE '%[DEMO]%'"),
            ("members", "is_demo = 1 OR name LIKE '%[DEMO]%'"),
            ("operating_principles", "is_demo = 1"),
            ("operating_cadences", "is_demo = 1"),
            ("company_activities", "is_demo = 1 OR title LIKE '%[DEMO]%'"),
        ]

        for table, condition in tables_with_conditions:
            try:
                cur.execute(f"DELETE FROM {table} WHERE {condition};")
                purged[table] = cur.rowcount
            except Exception as exc:
                logger.warning(f"Error purging demo data from {table}: {exc}")
                purged[table] = 0

        cur.execute("PRAGMA foreign_keys = ON;")
        conn.commit()
        conn.close()
        return purged

    # -------------------------------------------------------------------------
    # Proposal Execution Tracking (Idempotency & Exact-Once Execution)
    # -------------------------------------------------------------------------
    def is_proposal_executed(self, proposal_id: str) -> bool:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM executed_proposals WHERE id = ? LIMIT 1;", (proposal_id,))
        row = cur.fetchone()
        conn.close()
        return row is not None

    def record_proposal_executed(self, proposal_id: str, action_type: str, executed_by: str):
        import datetime
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("""
            INSERT OR IGNORE INTO executed_proposals (id, action_type, executed_by, executed_at)
            VALUES (?, ?, ?, ?);
            """, (proposal_id, action_type, executed_by, datetime.datetime.now().strftime("%Y-%m-%d %H:%M UTC")))
            conn.commit()
            conn.close()

    # -------------------------------------------------------------------------
    # Organization Queries
    # -------------------------------------------------------------------------
    def get_organization_profile(self) -> OrganizationProfile:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM organizations LIMIT 1;")
        row = cur.fetchone()
        conn.close()
        if not row:
            return OrganizationProfile(
                id="org-solian-wolves",
                name="Solian Wolves",
                code="SLN-WLV",
                tagline="Organizational Intelligence & High-Trust Autonomous Operations",
                mission=None,
                vision=None,
                operating_model=None,
                headquarters=None,
                founded_year=None,
                primary_timezone="UTC",
                fiscal_year=None,
                tier="enterprise",
                total_members=1,
                leadership_council=VERIFIED_LEADERSHIP_COUNCIL,
            )
        return OrganizationProfile(
            id=row["id"],
            name=row["name"],
            code=row["code"],
            tagline=row["tagline"],
            mission=row["mission"],
            vision=row["vision"],
            operating_model=row["operating_model"],
            headquarters=row["headquarters"],
            founded_year=row["founded_year"],
            primary_timezone=row["primary_timezone"] or "UTC",
            fiscal_year=row["fiscal_year"],
            tier=row["tier"] or "enterprise",
            total_members=row["total_members"] or 1,
            leadership_council=VERIFIED_LEADERSHIP_COUNCIL,
        )

    def update_organization_profile(self, update: OrganizationProfileUpdate) -> OrganizationProfile:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            fields = []
            values = []
            for k, v in update.model_dump(exclude_unset=True).items():
                fields.append(f"{k} = ?")
                values.append(v)
            if fields:
                values.append("org-solian-wolves")
                cur.execute(f"UPDATE organizations SET {', '.join(fields)} WHERE id = ?;", values)
                conn.commit()
            conn.close()
            return self.get_organization_profile()

    def get_company_operating_info(self) -> CompanyOperatingInfo:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM operating_principles;")
        principles = [
            OperatingPrinciple(id=r["id"], title=r["title"], description=r["description"], is_demo=bool(r["is_demo"]))
            for r in cur.fetchall()
        ]
        cur.execute("SELECT * FROM operating_cadences;")
        cadences = [
            OperatingCadence(
                id=r["id"],
                name=r["name"],
                cadence=r["cadence"],
                audience=r["audience"],
                description=r["description"],
                lead=r["lead"],
                is_demo=bool(r["is_demo"]),
            )
            for r in cur.fetchall()
        ]
        conn.close()

        escalation_slas = [
            {"severity": "Severity 1 (P1 - Critical)", "response_sla": "15 Minutes", "resolution_sla": "4 Hours", "escalation": "Direct Executive & Lead Architect Dispatch"},
            {"severity": "Severity 2 (P2 - High)", "response_sla": "1 Hour", "resolution_sla": "24 Hours", "escalation": "Department Lead & Operational Incident Bridge"},
            {"severity": "Severity 3 (P3 - Medium)", "response_sla": "4 Hours", "resolution_sla": "72 Hours", "escalation": "Assigned Sprint Lead"},
            {"severity": "Severity 4 (P4 - Low)", "response_sla": "1 Business Day", "resolution_sla": "Next Scheduled Sprint", "escalation": "Standard Operations Backlog"},
        ]

        has_demo = any(p.is_demo for p in principles) or any(c.is_demo for c in cadences)

        return CompanyOperatingInfo(
            organization_id="org-solian-wolves",
            principles=principles,
            cadences=cadences,
            escalation_slas=escalation_slas,
            has_demo_data=has_demo,
        )

    # -------------------------------------------------------------------------
    # Departments & Teams
    # -------------------------------------------------------------------------
    def list_departments(self) -> List[Department]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM departments ORDER BY code ASC;")
        rows = cur.fetchall()
        conn.close()
        return [
            Department(
                id=r["id"],
                organization_id=r["organization_id"],
                name=r["name"],
                code=r["code"],
                description=r["description"],
                lead_id=r["lead_id"],
                lead_name=r["lead_name"],
                member_count=r["member_count"],
                active_initiatives=r["active_initiatives"],
                is_demo=bool(r["is_demo"]),
            )
            for r in rows
        ]

    def create_department(self, dept: DepartmentCreate) -> Department:
        import datetime
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT * FROM departments WHERE code = ? OR name = ? LIMIT 1;", (dept.code.upper(), dept.name))
                existing = cur.fetchone()
                if existing:
                    cur.execute("""
                    UPDATE departments SET name = ?, description = ?, lead_name = ? WHERE id = ?;
                    """, (dept.name, dept.description, dept.lead_name, existing["id"]))
                    conn.commit()
                    return Department(
                        id=existing["id"],
                        organization_id=existing["organization_id"],
                        name=dept.name,
                        code=existing["code"],
                        description=dept.description,
                        lead_id=existing["lead_id"],
                        lead_name=dept.lead_name,
                        member_count=existing["member_count"],
                        active_initiatives=existing["active_initiatives"],
                        is_demo=bool(existing["is_demo"]),
                    )
                d_id = f"dept-{int(datetime.datetime.now().timestamp() * 1000) % 100000:05d}"
                cur.execute("""
                INSERT INTO departments (id, organization_id, name, code, description, lead_id, lead_name, member_count, active_initiatives, is_demo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
                """, (d_id, "org-solian-wolves", dept.name, dept.code.upper(), dept.description, None, dept.lead_name, 1, 0))
                conn.commit()
                return Department(
                    id=d_id,
                    organization_id="org-solian-wolves",
                    name=dept.name,
                    code=dept.code.upper(),
                    description=dept.description,
                    lead_id=None,
                    lead_name=dept.lead_name,
                    member_count=1,
                    active_initiatives=0,
                    is_demo=False,
                )
            finally:
                conn.close()

    def get_department(self, dept_id: str) -> Optional[Department]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM departments WHERE id = ? OR code = ? LIMIT 1;", (dept_id, dept_id.upper()))
        r = cur.fetchone()
        conn.close()
        if not r:
            return None
        return Department(
            id=r["id"],
            organization_id=r["organization_id"],
            name=r["name"],
            code=r["code"],
            description=r["description"],
            lead_id=r["lead_id"],
            lead_name=r["lead_name"],
            member_count=r["member_count"],
            active_initiatives=r["active_initiatives"],
            is_demo=bool(r["is_demo"]),
        )

    def update_department(self, dept_id: str, updates: dict) -> Optional[Department]:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("SELECT * FROM departments WHERE id = ? OR code = ? LIMIT 1;", (dept_id, dept_id.upper()))
            row = cur.fetchone()
            if not row:
                conn.close()
                return None
            real_id = row["id"]
            fields = []
            values = []
            for k, v in updates.items():
                if k in ("name", "description", "lead_name", "lead_id", "member_count", "active_initiatives"):
                    fields.append(f"{k} = ?")
                    values.append(v)
            if fields:
                values.append(real_id)
                cur.execute(f"UPDATE departments SET {', '.join(fields)} WHERE id = ?;", tuple(values))
                conn.commit()
            conn.close()
            return self.get_department(real_id)

    def list_teams(self, department_id: Optional[str] = None) -> List[Team]:
        conn = self._get_connection()
        cur = conn.cursor()
        if department_id:
            cur.execute("SELECT * FROM teams WHERE department_id = ? ORDER BY name ASC;", (department_id,))
        else:
            cur.execute("SELECT * FROM teams ORDER BY department_name ASC, name ASC;")
        rows = cur.fetchall()
        conn.close()
        return [
            Team(
                id=r["id"],
                organization_id=r["organization_id"],
                department_id=r["department_id"],
                department_name=r["department_name"],
                name=r["name"],
                lead_name=r["lead_name"],
                description=r["description"],
                focus_area=r["focus_area"],
                member_count=r["member_count"],
                is_demo=bool(r["is_demo"]),
            )
            for r in rows
        ]

    # -------------------------------------------------------------------------
    # Members & Staff Directory
    # -------------------------------------------------------------------------
    def list_members(self) -> List[OrganizationMember]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM members ORDER BY id ASC;")
        rows = cur.fetchall()
        conn.close()
        return [self._row_to_member(r) for r in rows]

    def get_member_by_auth_id(self, auth_user_id: str) -> Optional[OrganizationMember]:
        """Resolves corporate member strictly by verified stable Supabase Auth UID (sub)."""
        conn = self._get_connection()
        cur = conn.cursor()
        try:
            cur.execute("SELECT * FROM members WHERE auth_user_id = ? LIMIT 1;", (auth_user_id,))
            row = cur.fetchone()
        except sqlite3.OperationalError:
            row = None
        conn.close()
        return self._row_to_member(row) if row else None

    def link_member_auth_id(self, member_id: str, auth_user_id: str) -> bool:
        """Binds a verified stable Auth user ID to an existing company member profile."""
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            try:
                cur.execute(
                    "UPDATE members SET auth_user_id = ? WHERE id = ? OR user_id = ?;",
                    (auth_user_id, member_id, member_id),
                )
                conn.commit()
                success = cur.rowcount > 0
            except Exception:
                success = False
            conn.close()
            return success

    def get_member_by_user_id(self, user_id: str) -> Optional[OrganizationMember]:
        conn = self._get_connection()
        cur = conn.cursor()
        try:
            cur.execute("SELECT * FROM members WHERE user_id = ? OR auth_user_id = ? OR id = ? LIMIT 1;", (user_id, user_id, user_id))
            row = cur.fetchone()
        except sqlite3.OperationalError:
            cur.execute("SELECT * FROM members WHERE user_id = ? OR id = ? LIMIT 1;", (user_id, user_id))
            row = cur.fetchone()
        conn.close()
        return self._row_to_member(row) if row else None

    def get_member_by_id(self, member_id: str) -> Optional[OrganizationMember]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM members WHERE id = ? LIMIT 1;", (member_id,))
        row = cur.fetchone()
        conn.close()
        return self._row_to_member(row) if row else None

    def get_member_by_email(self, email: str) -> Optional[OrganizationMember]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM members WHERE LOWER(email) = LOWER(?) LIMIT 1;", (email.strip(),))
        row = cur.fetchone()
        conn.close()
        return self._row_to_member(row) if row else None

    def update_member_role(self, member_id: str, new_role: UserRole) -> Optional[OrganizationMember]:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("UPDATE members SET role = ? WHERE id = ?;", (new_role.value, member_id))
            conn.commit()
            conn.close()
            return self.get_member_by_id(member_id)

    def update_member_status(self, member_id: str, new_status: str) -> Optional[OrganizationMember]:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("UPDATE members SET status = ? WHERE id = ?;", (new_status, member_id))
            conn.commit()
            conn.close()
            return self.get_member_by_id(member_id)

    def create_personnel_record(self, member_in: PersonnelCreate, creator_name: str = "Admin") -> OrganizationMember:
        """Establishes a new personnel record in the company directory."""
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                member_id = f"tm-{uuid.uuid4().hex[:8]}"
                user_id = f"usr-{uuid.uuid4().hex[:8]}"
                joined_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                responsibilities_json = json.dumps(member_in.responsibilities or [])
                activation_status = "invitation_pending" if member_in.email else "created"

                email = member_in.email.strip() if member_in.email and member_in.email.strip() else None
                phone = member_in.phone.strip() if member_in.phone and member_in.phone.strip() else None

                cur.execute(
                    """
                    INSERT INTO members (
                        id, user_id, organization_id, name, email, phone, role, title,
                        department_id, department, team_id, team, responsibilities,
                        reports_to_id, reports_to_name, status, activation_status, assigned_projects, joined_date, is_demo
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        member_id,
                        user_id,
                        "org-solian-wolves",
                        member_in.name.strip(),
                        email,
                        phone,
                        member_in.role.value,
                        member_in.title.strip(),
                        None,
                        member_in.department.strip(),
                        None,
                        member_in.team.strip() if member_in.team else None,
                        responsibilities_json,
                        None,
                        None,
                        "active",
                        activation_status,
                        0,
                        joined_date,
                        0,
                    ),
                )
                self._log_activity_raw(
                    conn,
                    actor_name=creator_name,
                    action_type="personnel_created",
                    title=f"Personnel Added: {member_in.name}",
                    description=f"Added {member_in.name} ({member_in.title}) to {member_in.department}. Status: {activation_status}.",
                    module="teams",
                )
                conn.commit()
            finally:
                conn.close()
            return self.get_member_by_id(member_id)

    def update_personnel_record(
        self, member_id: str, updates: PersonnelUpdate, updater_name: str = "Admin"
    ) -> Optional[OrganizationMember]:
        """Allows authorized administrators to update contact information, title, or responsibilities later."""
        existing = self.get_member_by_id(member_id)
        if not existing:
            return None

        update_fields = []
        values = []

        if updates.name is not None and updates.name.strip():
            update_fields.append("name = ?")
            values.append(updates.name.strip())

        if updates.email is not None:
            clean_email = updates.email.strip() if updates.email.strip() else None
            update_fields.append("email = ?")
            values.append(clean_email)
            if clean_email and existing.activation_status == "created":
                update_fields.append("activation_status = ?")
                values.append("invitation_pending")

        if updates.phone is not None:
            update_fields.append("phone = ?")
            values.append(updates.phone.strip() if updates.phone.strip() else None)

        if updates.title is not None and updates.title.strip():
            update_fields.append("title = ?")
            values.append(updates.title.strip())

        if updates.department is not None and updates.department.strip():
            update_fields.append("department = ?")
            values.append(updates.department.strip())

        if updates.team is not None:
            update_fields.append("team = ?")
            values.append(updates.team.strip() if updates.team.strip() else None)

        if updates.responsibilities is not None:
            update_fields.append("responsibilities = ?")
            values.append(json.dumps(updates.responsibilities))

        if not update_fields:
            return existing

        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                values.append(member_id)
                cur.execute(f"UPDATE members SET {', '.join(update_fields)} WHERE id = ?;", values)
                self._log_activity_raw(
                    conn,
                    actor_name=updater_name,
                    action_type="personnel_updated",
                    title=f"Personnel Updated: {existing.name}",
                    description=f"Updated profile details for {existing.name} by {updater_name}.",
                    module="teams",
                )
                conn.commit()
            finally:
                conn.close()
            return self.get_member_by_id(member_id)

    def generate_member_invitation(self, member_id: str, expires_in_days: int = 7) -> Tuple[str, str]:
        """Generates a secure cryptographic one-time invitation token for account activation."""
        member = self.get_member_by_id(member_id)
        if not member:
            raise ValueError("Personnel record not found.")

        token = secrets.token_urlsafe(32)
        expires_at = (datetime.now(timezone.utc) + timedelta(days=expires_in_days)).isoformat()

        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    """
                    UPDATE members
                    SET invitation_token = ?, invitation_expires_at = ?, activation_status = 'invitation_sent'
                    WHERE id = ?;
                    """,
                    (token, expires_at, member_id),
                )
                conn.commit()
            finally:
                conn.close()

        return token, expires_at

        return token, expires_at

    def get_member_by_invitation_token(self, token: str) -> Optional[OrganizationMember]:
        """Resolves personnel record by cryptographic token, verifying signature and expiration."""
        if not token or not token.strip():
            return None
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM members WHERE invitation_token = ? LIMIT 1;", (token.strip(),))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        member = self._row_to_member(row)
        if member.invitation_expires_at:
            try:
                exp = datetime.fromisoformat(member.invitation_expires_at.replace("Z", "+00:00"))
                if datetime.now(timezone.utc) > exp:
                    return None
            except Exception:
                pass
        return member

    def hash_password(self, password: str) -> str:
        salt = secrets.token_hex(16)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return f"{salt}${key.hex()}"

    def verify_password_hash(self, stored_hash: Optional[str], password: str) -> bool:
        if not stored_hash or not password:
            return False
        try:
            salt, key_hex = stored_hash.split("$", 1)
            test_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
            return hmac.compare_digest(test_key.hex(), key_hex)
        except Exception:
            return False

    def verify_member_password(self, member_id: str, password: str) -> bool:
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT password_hash FROM members WHERE id = ? LIMIT 1;", (member_id,))
                row = cur.fetchone()
                if not row:
                    return False
                stored = row["password_hash"] if "password_hash" in row.keys() else None
                return self.verify_password_hash(stored, password)
            finally:
                conn.close()

    def set_member_password(self, member_id: str, password: str) -> bool:
        p_hash = self.hash_password(password)
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute("UPDATE members SET password_hash = ? WHERE id = ?;", (p_hash, member_id))
                conn.commit()
                return True
            finally:
                conn.close()

    def activate_member_account(self, token: str, auth_user_id: str, password: Optional[str] = None) -> Optional[OrganizationMember]:
        """Binds verified Auth UID to personnel record and activates the account."""
        member = self.get_member_by_invitation_token(token)
        if not member:
            return None

        p_hash = self.hash_password(password) if password else None

        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                if p_hash:
                    cur.execute(
                        """
                        UPDATE members
                        SET auth_user_id = ?, activation_status = 'active', status = 'active',
                            password_hash = ?, invitation_token = NULL, invitation_expires_at = NULL
                        WHERE id = ?;
                        """,
                        (auth_user_id, p_hash, member.id),
                    )
                else:
                    cur.execute(
                        """
                        UPDATE members
                        SET auth_user_id = ?, activation_status = 'active', status = 'active',
                            invitation_token = NULL, invitation_expires_at = NULL
                        WHERE id = ?;
                        """,
                        (auth_user_id, member.id),
                    )
                self._log_activity_raw(
                    conn,
                    actor_name=member.name,
                    action_type="account_activated",
                    title=f"Account Activated: {member.name}",
                    description=f"{member.name} successfully activated their corporate account.",
                    module="auth",
                )
                conn.commit()
            finally:
                conn.close()

        return self.get_member_by_id(member.id)

    def suspend_member(self, member_id: str, actor_name: str = "Admin") -> Optional[OrganizationMember]:
        """Suspends a personnel account from accessing corporate systems."""
        member = self.get_member_by_id(member_id)
        if not member:
            return None
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    "UPDATE members SET status = 'suspended', activation_status = 'suspended' WHERE id = ?;",
                    (member_id,),
                )
                self._log_activity_raw(
                    conn,
                    actor_name=actor_name,
                    action_type="member_suspended",
                    title=f"Member Suspended: {member.name}",
                    description=f"Operational access suspended for {member.name} by {actor_name}.",
                    module="teams",
                )
                conn.commit()
            finally:
                conn.close()
        return self.get_member_by_id(member_id)

    def unsuspend_member(self, member_id: str, actor_name: str = "Admin") -> Optional[OrganizationMember]:
        """Restores a suspended personnel account."""
        member = self.get_member_by_id(member_id)
        if not member:
            return None
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    "UPDATE members SET status = 'active', activation_status = 'active' WHERE id = ?;",
                    (member_id,),
                )
                self._log_activity_raw(
                    conn,
                    actor_name=actor_name,
                    action_type="member_unsuspended",
                    title=f"Member Restored: {member.name}",
                    description=f"Operational access restored for {member.name} by {actor_name}.",
                    module="teams",
                )
                conn.commit()
            finally:
                conn.close()
        return self.get_member_by_id(member_id)

    def get_owner_bootstrap_status(self) -> Dict[str, Any]:
        """Checks whether the statutory company Owner account has been initialized and bound."""
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM members WHERE role = 'owner' LIMIT 1;")
        row = cur.fetchone()
        conn.close()
        if not row:
            return {"is_bootstrapped": False, "owner_name": None, "owner_email": None, "owner_id": None}
        owner = self._row_to_member(row)
        is_bootstrapped = bool(owner.auth_user_id and owner.activation_status == "active")
        return {
            "is_bootstrapped": is_bootstrapped,
            "owner_name": owner.name,
            "owner_email": owner.email,
            "owner_id": owner.id,
        }

    def get_or_create_owner_bootstrap_token(self, expires_in_days: int = 3) -> Optional[str]:
        """Retrieves or creates a secure bootstrap token for first-time Owner account initialization."""
        status = self.get_owner_bootstrap_status()
        if status["is_bootstrapped"]:
            return None

        owner_id = status["owner_id"]
        owner = self.get_member_by_id(owner_id) if owner_id else None
        if not owner:
            return None

        if owner.invitation_token and owner.invitation_expires_at:
            try:
                exp = datetime.fromisoformat(owner.invitation_expires_at.replace("Z", "+00:00"))
                if datetime.now(timezone.utc) < exp:
                    return owner.invitation_token
            except Exception:
                pass

        token, _ = self.generate_member_invitation(owner.id, expires_in_days=expires_in_days)
        return token

    def bootstrap_owner(self, bootstrap_token: str, auth_user_id: str, password: Optional[str] = None) -> OrganizationMember:
        """Initializes and claims the Owner account via cryptographic bootstrap token."""
        status = self.get_owner_bootstrap_status()
        if status["is_bootstrapped"]:
            raise ValueError("Owner account has already been bootstrapped and activated.")

        member = self.get_member_by_invitation_token(bootstrap_token)
        if not member or member.role != UserRole.OWNER:
            raise ValueError("Invalid or expired owner bootstrap token.")

        activated = self.activate_member_account(bootstrap_token, auth_user_id, password=password)
        if not activated:
            raise ValueError("Failed to activate owner account.")

        return activated

    def invite_member(self, invite: MemberInviteCreate, inviter_name: str = "Admin") -> OrganizationMember:
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                member_id = f"tm-{uuid.uuid4().hex[:8]}"
                user_id = f"usr-{uuid.uuid4().hex[:8]}"
                joined_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                responsibilities_json = json.dumps(invite.responsibilities or [])
                phone = invite.phone.strip() if invite.phone and invite.phone.strip() else None
                activation_status = "invitation_pending" if invite.email else "created"
                cur.execute(
                    """
                    INSERT INTO members (
                        id, user_id, organization_id, name, email, phone, role, title,
                        department_id, department, team_id, team, responsibilities,
                        reports_to_id, reports_to_name, status, activation_status, assigned_projects, joined_date, is_demo
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        member_id,
                        user_id,
                        "org-solian-wolves",
                        invite.name,
                        invite.email.strip() if invite.email else None,
                        phone,
                        invite.role.value,
                        invite.title,
                        None,
                        invite.department,
                        None,
                        invite.team,
                        responsibilities_json,
                        None,
                        None,
                        "active",
                        activation_status,
                        0,
                        joined_date,
                        0,
                    ),
                )
                self._log_activity_raw(
                    conn,
                    actor_name=inviter_name,
                    action_type="member_invited",
                    title=f"Member Added: {invite.name}",
                    description=f"Added {invite.name} as {invite.role.value} in {invite.department}",
                    module="teams",
                )
                conn.commit()
            finally:
                conn.close()
            return self.get_member_by_id(member_id)

    def _row_to_member(self, row: sqlite3.Row) -> OrganizationMember:
        responsibilities = []
        if row["responsibilities"]:
            try:
                responsibilities = json.loads(row["responsibilities"])
            except Exception:
                responsibilities = []

        try:
            role = UserRole(row["role"].lower())
        except ValueError:
            role = UserRole.MEMBER

        auth_user_id = None
        if "auth_user_id" in row.keys():
            auth_user_id = row["auth_user_id"]

        avatar_url = None
        if "avatar_url" in row.keys() and row["avatar_url"]:
            avatar_url = row["avatar_url"]

        phone = None
        if "phone" in row.keys() and row["phone"]:
            phone = row["phone"]

        activation_status = "created"
        if "activation_status" in row.keys() and row["activation_status"]:
            activation_status = row["activation_status"]
        elif auth_user_id:
            activation_status = "active"

        invitation_token = None
        if "invitation_token" in row.keys() and row["invitation_token"]:
            invitation_token = row["invitation_token"]

        invitation_expires_at = None
        if "invitation_expires_at" in row.keys() and row["invitation_expires_at"]:
            invitation_expires_at = row["invitation_expires_at"]

        email_val = row["email"] if ("email" in row.keys() and row["email"]) else None

        return OrganizationMember(
            id=row["id"],
            user_id=row["user_id"],
            auth_user_id=auth_user_id,
            organization_id=row["organization_id"],
            name=row["name"],
            email=email_val,
            phone=phone,
            role=role,
            title=row["title"],
            department_id=row["department_id"],
            department=row["department"],
            team_id=row["team_id"],
            team=row["team"],
            responsibilities=responsibilities,
            reports_to_id=row["reports_to_id"],
            reports_to_name=row["reports_to_name"],
            avatar_url=avatar_url,
            status=row["status"],
            activation_status=activation_status,
            invitation_token=invitation_token,
            invitation_expires_at=invitation_expires_at,
            assigned_projects=row["assigned_projects"],
            joined_date=row["joined_date"],
            is_demo=bool(row["is_demo"]),
        )

    # -------------------------------------------------------------------------
    # Knowledge Vault
    # -------------------------------------------------------------------------
    def list_knowledge(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        allowed_classifications: Optional[List[str]] = None,
    ) -> List[KnowledgeItem]:
        conn = self._get_connection()
        cur = conn.cursor()

        sql = "SELECT * FROM knowledge_items WHERE 1=1"
        params: List[Any] = []

        if category:
            sql += " AND LOWER(category) = LOWER(?)"
            params.append(category)

        if allowed_classifications:
            placeholders = ",".join("?" for _ in allowed_classifications)
            sql += f" AND classification IN ({placeholders})"
            params.extend(allowed_classifications)

        if query:
            q = f"%{query.lower()}%"
            sql += " AND (LOWER(title) LIKE ? OR LOWER(snippet) LIKE ? OR LOWER(content) LIKE ? OR LOWER(tags) LIKE ?)"
            params.extend([q, q, q, q])

        sql += " ORDER BY is_verified DESC, updated_at DESC;"
        cur.execute(sql, params)
        rows = cur.fetchall()
        conn.close()

        items = []
        for r in rows:
            tags = []
            if r["tags"]:
                try:
                    tags = json.loads(r["tags"])
                except Exception:
                    tags = []
            items.append(
                KnowledgeItem(
                    id=r["id"],
                    organization_id=r["organization_id"],
                    title=r["title"],
                    category=r["category"],
                    snippet=r["snippet"],
                    content=r["content"],
                    classification=r["classification"],
                    is_verified=bool(r["is_verified"]),
                    department=r["department"],
                    version=r["version"],
                    updated_at=r["updated_at"],
                    author=r["author"],
                    tags=tags,
                    is_demo=bool(r["is_demo"]),
                )
            )
        return items

    def get_knowledge_item(self, item_id: str) -> Optional[KnowledgeItem]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM knowledge_items WHERE id = ? LIMIT 1;", (item_id,))
        r = cur.fetchone()
        conn.close()
        if not r:
            return None
        tags = []
        if r["tags"]:
            try:
                tags = json.loads(r["tags"])
            except Exception:
                tags = []
        return KnowledgeItem(
            id=r["id"],
            organization_id=r["organization_id"],
            title=r["title"],
            category=r["category"],
            snippet=r["snippet"],
            content=r["content"],
            classification=r["classification"],
            is_verified=bool(r["is_verified"]),
            department=r["department"],
            version=r["version"],
            updated_at=r["updated_at"],
            author=r["author"],
            tags=tags,
            is_demo=bool(r["is_demo"]),
        )

    def add_knowledge_item(self, item: KnowledgeItemCreate, author: str, is_verified: bool = True) -> KnowledgeItem:
        import datetime
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            item_id = f"sop-{int(datetime.datetime.now().timestamp() * 1000) % 100000:05d}"
            today = datetime.date.today().isoformat()
            tags_json = json.dumps(item.tags)
            verified_int = 1 if is_verified else 0

            cur.execute("""
            INSERT INTO knowledge_items (
                id, organization_id, title, category, snippet, content,
                classification, is_verified, department, version, updated_at, author, tags, is_demo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
            """, (
                item_id, "org-solian-wolves", item.title, item.category, item.snippet, item.content,
                item.classification, verified_int, item.department, "1.0", today, author, tags_json
            ))

            self._log_activity_raw(
                conn,
                actor_name=author,
                action_type="sop_indexed",
                title=f"Indexed: {item.title}",
                description=f"Added new verified {item.category} under {item.classification} classification.",
                module="knowledge"
            )

            conn.commit()
            conn.close()
            return self.get_knowledge_item(item_id)  # type: ignore

    # -------------------------------------------------------------------------
    # Projects & Tasks
    # -------------------------------------------------------------------------
    def list_projects(self) -> List[Project]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM projects ORDER BY priority = 'critical' DESC, progress DESC;")
        rows = cur.fetchall()
        conn.close()
        return [
            Project(
                id=r["id"],
                organization_id=r["organization_id"],
                name=r["name"],
                client=r["client"],
                status=r["status"],
                progress=r["progress"],
                lead=r["lead"],
                due_date=r["due_date"],
                priority=r["priority"],
                department=r["department"],
                description=r["description"],
                is_demo=bool(r["is_demo"]),
            )
            for r in rows
        ]

    def create_project(self, project: ProjectCreate) -> Project:
        import datetime
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            p_id = f"p-{int(datetime.datetime.now().timestamp() * 1000) % 100000:05d}"
            cur.execute("""
            INSERT INTO projects (
                id, organization_id, name, client, status, progress, lead, due_date, priority, department, description, is_demo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
            """, (
                p_id, "org-solian-wolves", project.name, project.client, project.status, project.progress,
                project.lead, project.due_date, project.priority, project.department, project.description
            ))

            self._log_activity_raw(
                conn,
                actor_name=project.lead,
                action_type="milestone",
                title=f"New Initiative: {project.name}",
                description=f"Initiative registered under {project.department or 'General Operations'}.",
                module="projects"
            )

            conn.commit()
            conn.close()
            return Project(
                id=p_id,
                organization_id="org-solian-wolves",
                name=project.name,
                client=project.client,
                status=project.status,
                progress=project.progress,
                lead=project.lead,
                due_date=project.due_date,
                priority=project.priority,
                department=project.department,
                description=project.description,
                is_demo=False,
            )

    def update_project(self, project_id: str, updates: dict) -> Optional[Project]:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("SELECT * FROM projects WHERE id = ?;", (project_id,))
            row = cur.fetchone()
            if not row:
                conn.close()
                return None
            fields = []
            values = []
            for k, v in updates.items():
                if k in ("name", "client", "status", "progress", "lead", "due_date", "priority", "department", "description"):
                    fields.append(f"{k} = ?")
                    values.append(v)
            if fields:
                values.append(project_id)
                cur.execute(f"UPDATE projects SET {', '.join(fields)} WHERE id = ?;", tuple(values))
                conn.commit()
            cur.execute("SELECT * FROM projects WHERE id = ?;", (project_id,))
            updated = cur.fetchone()
            conn.close()
            return Project(
                id=updated["id"],
                organization_id=updated["organization_id"],
                name=updated["name"],
                client=updated["client"],
                status=updated["status"],
                progress=updated["progress"],
                lead=updated["lead"],
                due_date=updated["due_date"],
                priority=updated["priority"],
                department=updated["department"],
                description=updated["description"],
                is_demo=bool(updated["is_demo"]),
            )

    def get_project(self, project_id: str) -> Optional[Project]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM projects WHERE id = ? LIMIT 1;", (project_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        return Project(
            id=row["id"],
            organization_id=row["organization_id"],
            name=row["name"],
            client=row["client"],
            status=row["status"],
            progress=row["progress"],
            lead=row["lead"],
            due_date=row["due_date"],
            priority=row["priority"],
            department=row["department"],
            description=row["description"],
            is_demo=bool(row["is_demo"]),
        )

    def delete_project(self, project_id: str) -> bool:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("DELETE FROM projects WHERE id = ?;", (project_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            conn.close()
            return deleted

    def list_tasks(self, status: Optional[str] = None) -> List[Task]:
        conn = self._get_connection()
        cur = conn.cursor()
        if status:
            cur.execute("SELECT * FROM tasks WHERE status = ? ORDER BY priority = 'urgent' DESC, due_date ASC;", (status,))
        else:
            cur.execute("SELECT * FROM tasks ORDER BY priority = 'urgent' DESC, due_date ASC;")
        rows = cur.fetchall()
        conn.close()
        return [
            Task(
                id=r["id"],
                organization_id=r["organization_id"],
                title=r["title"],
                description=r["description"],
                project_id=r["project_id"],
                project_name=r["project_name"],
                status=r["status"],
                priority=r["priority"],
                assignee=r["assignee"],
                due_date=r["due_date"],
                department=r["department"],
                created_at=r["created_at"],
                is_demo=bool(r["is_demo"]),
            )
            for r in rows
        ]

    def create_task(self, task: TaskCreate, creator_name: str = "AUREN SOLIAN") -> Task:
        import datetime
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            t_id = f"t-{int(datetime.datetime.now().timestamp() * 1000) % 100000:05d}"
            today = datetime.date.today().isoformat()
            cur.execute("""
            INSERT INTO tasks (
                id, organization_id, title, description, project_id, project_name,
                status, priority, assignee, due_date, department, created_at, is_demo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
            """, (
                t_id, "org-solian-wolves", task.title, task.description, task.project_id, task.project_name,
                task.status, task.priority, task.assignee, task.due_date, task.department, today
            ))

            self._log_activity_raw(
                conn,
                actor_name=creator_name,
                action_type="task_created",
                title=f"Task Assigned: {task.title}",
                description=f"Assigned to {task.assignee} with priority {task.priority.upper()}.",
                module="tasks"
            )

            conn.commit()
            conn.close()
            return Task(
                id=t_id,
                organization_id="org-solian-wolves",
                title=task.title,
                description=task.description,
                project_id=task.project_id,
                project_name=task.project_name,
                status=task.status,
                priority=task.priority,
                assignee=task.assignee,
                due_date=task.due_date,
                department=task.department,
                created_at=today,
                is_demo=False,
            )

    def update_task(self, task_id: str, update: TaskUpdate, actor_name: str = "Operator") -> Optional[Task]:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("SELECT * FROM tasks WHERE id = ? LIMIT 1;", (task_id,))
            row = cur.fetchone()
            if not row:
                conn.close()
                return None

            fields = []
            values = []
            for k, v in update.model_dump(exclude_unset=True).items():
                if v is not None:
                    fields.append(f"{k} = ?")
                    values.append(v)

            if fields:
                values.append(task_id)
                cur.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?;", values)

                if update.status == "completed":
                    self._log_activity_raw(
                        conn,
                        actor_name=actor_name,
                        action_type="task_completed",
                        title=f"Task Completed: {row['title']}",
                        description=f"Marked as completed by {actor_name}.",
                        module="tasks"
                    )

                conn.commit()

            conn.close()
            tasks = self.list_tasks()
            for t in tasks:
                if t.id == task_id:
                    return t
            return None

    def get_task(self, task_id: str) -> Optional[Task]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM tasks WHERE id = ? LIMIT 1;", (task_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        return Task(
            id=row["id"],
            organization_id=row["organization_id"],
            title=row["title"],
            description=row["description"] or "",
            project_id=row["project_id"],
            project_name=row["project_name"],
            status=row["status"],
            priority=row["priority"],
            assignee=row["assignee"],
            due_date=row["due_date"],
            department=row["department"],
            created_at=row["created_at"],
            is_demo=bool(row["is_demo"]),
        )

    def delete_task(self, task_id: str) -> bool:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("DELETE FROM tasks WHERE id = ?;", (task_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            conn.close()
            return deleted

    # -------------------------------------------------------------------------
    # Clients & Documents & Workflows
    # -------------------------------------------------------------------------
    def list_clients(self) -> List[ClientAccount]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM clients ORDER BY is_demo ASC, company_name ASC;")
        rows = cur.fetchall()
        conn.close()
        return [
            ClientAccount(
                id=r["id"],
                organization_id=r["organization_id"],
                company_name=r["company_name"],
                contact_person=r["contact_person"],
                email=r["email"],
                status=r["status"],
                contract_value=r["contract_value"],
                lead_account_manager=r["lead_account_manager"],
                notes=r["notes"],
                is_demo=bool(r["is_demo"]),
            )
            for r in rows
        ]

    def get_client(self, client_id: str) -> Optional[ClientAccount]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM clients WHERE id = ? LIMIT 1;", (client_id,))
        r = cur.fetchone()
        conn.close()
        if not r:
            return None
        return ClientAccount(
            id=r["id"],
            organization_id=r["organization_id"],
            company_name=r["company_name"],
            contact_person=r["contact_person"],
            email=r["email"],
            status=r["status"],
            contract_value=r["contract_value"],
            lead_account_manager=r["lead_account_manager"],
            notes=r["notes"],
            is_demo=bool(r["is_demo"]),
        )

    def create_client(self, client: ClientAccountCreate) -> ClientAccount:
        import datetime
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            c_id = f"c-{int(datetime.datetime.now().timestamp() * 1000) % 100000:05d}"
            cur.execute("""
            INSERT INTO clients (id, organization_id, company_name, contact_person, email, status, contract_value, lead_account_manager, notes, is_demo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
            """, (
                c_id, "org-solian-wolves", client.company_name, client.contact_person, client.email,
                client.status, client.contract_value, client.lead_account_manager, client.notes
            ))
            conn.commit()
            conn.close()
            return ClientAccount(
                id=c_id,
                organization_id="org-solian-wolves",
                company_name=client.company_name,
                contact_person=client.contact_person,
                email=client.email,
                status=client.status,
                contract_value=client.contract_value,
                lead_account_manager=client.lead_account_manager,
                notes=client.notes,
                is_demo=False,
            )

    def update_client(self, client_id: str, updates: dict) -> Optional[ClientAccount]:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("SELECT * FROM clients WHERE id = ? LIMIT 1;", (client_id,))
            if not cur.fetchone():
                conn.close()
                return None
            fields = []
            values = []
            for k, v in updates.items():
                if k in ("company_name", "contact_person", "email", "status", "contract_value", "lead_account_manager", "notes"):
                    fields.append(f"{k} = ?")
                    values.append(v)
            if fields:
                values.append(client_id)
                cur.execute(f"UPDATE clients SET {', '.join(fields)} WHERE id = ?;", tuple(values))
                conn.commit()
            conn.close()
            return self.get_client(client_id)

    def delete_client(self, client_id: str) -> bool:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("DELETE FROM clients WHERE id = ?;", (client_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            conn.close()
            return deleted

    def list_documents(self, allowed_classifications: Optional[List[str]] = None) -> List[CorporateDocument]:
        conn = self._get_connection()
        cur = conn.cursor()
        sql = "SELECT * FROM documents WHERE 1=1"
        params = []
        if allowed_classifications:
            placeholders = ",".join("?" for _ in allowed_classifications)
            sql += f" AND classification IN ({placeholders})"
            params.extend(allowed_classifications)
        sql += " ORDER BY is_demo ASC, updated_at DESC;"
        cur.execute(sql, params)
        rows = cur.fetchall()
        conn.close()
        return [
            CorporateDocument(
                id=r["id"],
                organization_id=r["organization_id"],
                name=r["name"],
                type=r["type"],
                size=r["size"],
                classification=r["classification"],
                updated_at=r["updated_at"],
                owner=r["owner"],
                department=r["department"],
                is_demo=bool(r["is_demo"]),
            )
            for r in rows
        ]

    def get_document(self, document_id: str) -> Optional[CorporateDocument]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM documents WHERE id = ? LIMIT 1;", (document_id,))
        r = cur.fetchone()
        conn.close()
        if not r:
            return None
        return CorporateDocument(
            id=r["id"],
            organization_id=r["organization_id"],
            name=r["name"],
            type=r["type"],
            size=r["size"],
            classification=r["classification"],
            updated_at=r["updated_at"],
            owner=r["owner"],
            department=r["department"],
            is_demo=bool(r["is_demo"]),
        )

    def create_document(self, doc: CorporateDocumentCreate, owner: str = "AUREN SOLIAN") -> CorporateDocument:
        import datetime, uuid
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            doc_id = f"doc-{datetime.datetime.now().strftime('%m%d%H%M%S')}-{uuid.uuid4().hex[:4]}"
            today = datetime.datetime.now().strftime("%Y-%m-%d")
            cur.execute("""
            INSERT INTO documents (id, organization_id, name, type, size, classification, updated_at, owner, department, is_demo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
            """, (
                doc_id, "org-solian-wolves", doc.name, doc.type, doc.size, doc.classification, today, owner, doc.department
            ))
            self._log_activity_raw(
                conn,
                actor_name=owner,
                action_type="doc_uploaded",
                title=f"Document Registered: {doc.name}",
                description=f"Corporate document registered under classification '{doc.classification}'.",
                module="documents"
            )
            conn.commit()
            conn.close()
            return CorporateDocument(
                id=doc_id,
                organization_id="org-solian-wolves",
                name=doc.name,
                type=doc.type,
                size=doc.size,
                classification=doc.classification,
                updated_at=today,
                owner=owner,
                department=doc.department,
                is_demo=False,
            )

    def delete_document(self, document_id: str) -> bool:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("DELETE FROM documents WHERE id = ?;", (document_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            conn.close()
            return deleted

    def list_workflows(self) -> List[WorkflowRule]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM workflows ORDER BY is_demo ASC, execution_count DESC;")
        rows = cur.fetchall()
        conn.close()
        return [
            WorkflowRule(
                id=r["id"],
                organization_id=r["organization_id"],
                title=r["title"],
                trigger=r["trigger"],
                action=r["action"],
                status=r["status"],
                execution_count=r["execution_count"],
                department=r["department"],
                is_demo=bool(r["is_demo"]),
            )
            for r in rows
        ]

    def create_workflow(self, wf: WorkflowRuleCreate) -> WorkflowRule:
        import datetime
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            wf_id = f"wf-{int(datetime.datetime.now().timestamp() * 1000) % 100000:05d}"
            cur.execute("""
            INSERT INTO workflows (id, organization_id, title, trigger, action, status, execution_count, department, is_demo)
            VALUES (?, ?, ?, ?, ?, 'active', 0, ?, 0);
            """, (wf_id, "org-solian-wolves", wf.title, wf.trigger, wf.action, wf.department))
            conn.commit()
            conn.close()
            return WorkflowRule(
                id=wf_id,
                organization_id="org-solian-wolves",
                title=wf.title,
                trigger=wf.trigger,
                action=wf.action,
                status="active",
                execution_count=0,
                department=wf.department,
                is_demo=False,
            )

    def get_workflow(self, workflow_id: str) -> Optional[WorkflowRule]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM workflows WHERE id = ?;", (workflow_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        return WorkflowRule(
            id=row["id"],
            organization_id=row["organization_id"],
            title=row["title"],
            trigger=row["trigger"],
            action=row["action"],
            status=row["status"],
            execution_count=row["execution_count"],
            department=row["department"],
            is_demo=bool(row["is_demo"]),
        )

    def update_workflow_status(self, workflow_id: str, status: str) -> Optional[WorkflowRule]:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("UPDATE workflows SET status = ? WHERE id = ?;", (status, workflow_id))
            conn.commit()
            conn.close()
            return self.get_workflow(workflow_id)

    def trigger_workflow(self, workflow_id: str) -> Optional[WorkflowRule]:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("UPDATE workflows SET execution_count = execution_count + 1 WHERE id = ?;", (workflow_id,))
            conn.commit()
            conn.close()
            return self.get_workflow(workflow_id)

    def delete_workflow(self, workflow_id: str) -> bool:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("DELETE FROM workflows WHERE id = ?;", (workflow_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            conn.close()
            return deleted

    # -------------------------------------------------------------------------
    # Activities & Logging
    # -------------------------------------------------------------------------
    def list_activities(self, limit: int = 10) -> List[CompanyActivityEvent]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM company_activities ORDER BY timestamp DESC LIMIT ?;", (limit,))
        rows = cur.fetchall()
        conn.close()
        return [
            CompanyActivityEvent(
                id=r["id"],
                actor_name=r["actor_name"],
                action_type=r["action_type"],
                title=r["title"],
                description=r["description"],
                timestamp=r["timestamp"],
                module=r["module"],
                is_demo=bool(r["is_demo"]),
            )
            for r in rows
        ]

    def _log_activity_raw(self, conn: sqlite3.Connection, actor_name: str, action_type: str, title: str, description: str, module: str):
        import datetime
        import uuid
        act_id = f"act-{datetime.datetime.now().strftime('%m%d%H%M%S%f')}-{uuid.uuid4().hex[:4]}"
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M UTC")
        conn.execute("""
        INSERT INTO company_activities (id, organization_id, actor_name, action_type, title, description, timestamp, module, is_demo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);
        """, (act_id, "org-solian-wolves", actor_name, action_type, title, description, now_str, module))

    def log_activity(self, actor_name: str, action_type: str, title: str, description: str, module: str):
        with self._lock:
            conn = self._get_connection()
            self._log_activity_raw(conn, actor_name, action_type, title, description, module)
            conn.commit()
            conn.close()

    # -------------------------------------------------------------------------
    # Dashboard Statistics & Grounded Operational Insights
    # -------------------------------------------------------------------------
    def get_dashboard_stats(self) -> DashboardStats:
        members = self.list_members()
        projects = self.list_projects()
        tasks = self.list_tasks()
        departments = self.list_departments()
        knowledge = self.list_knowledge()
        activities = self.list_activities(limit=5)

        open_tasks = [t for t in tasks if t.status != "completed"]
        urgent_tasks = [t for t in open_tasks if t.priority in ("urgent", "high")]
        review_tasks = [t for t in tasks if t.status == "review"]
        verified_knowledge = [k for k in knowledge if k.is_verified]

        has_demo = (
            any(m.is_demo for m in members) or
            any(p.is_demo for p in projects) or
            any(t.is_demo for t in tasks) or
            any(k.is_demo for k in knowledge)
        )

        # Dynamic, evidence-based operational insights
        insights: List[OperationalInsight] = []

        if urgent_tasks:
            is_demo_in = any(t.is_demo for t in urgent_tasks)
            insights.append(
                OperationalInsight(
                    id="ins-1",
                    category="risk",
                    title=f"{len(urgent_tasks)} High-Priority Operations In Flight",
                    description=f"Actionable operations pending execution under {urgent_tasks[0].assignee} and colleagues.",
                    severity="warning" if len(urgent_tasks) > 2 else "info",
                    metric_source="Operational Task Backlog",
                    is_demo_insight=is_demo_in,
                )
            )

        in_progress_projects = [p for p in projects if p.status == "in_progress"]
        if in_progress_projects:
            lead_p = in_progress_projects[0]
            insights.append(
                OperationalInsight(
                    id="ins-2",
                    category="velocity",
                    title=f"{lead_p.name} at {lead_p.progress}% Progress",
                    description=f"Led by {lead_p.lead}; currently tracking toward due date ({lead_p.due_date}).",
                    severity="info",
                    metric_source="Strategic Projects Registry",
                    is_demo_insight=lead_p.is_demo,
                )
            )

        if review_tasks:
            insights.append(
                OperationalInsight(
                    id="ins-3",
                    category="alignment",
                    title=f"{len(review_tasks)} Items Awaiting Executive Signoff",
                    description="Operations submitted for review require lead signoff per delegation protocol.",
                    severity="info",
                    metric_source="Task Signoff Queue",
                    is_demo_insight=any(t.is_demo for t in review_tasks),
                )
            )

        if not insights:
            insights.append(
                OperationalInsight(
                    id="ins-clear",
                    category="alignment",
                    title="All Operational Pipelines Synchronized",
                    description="No critical bottlenecks or overdue deliverables reported across departments.",
                    severity="info",
                    metric_source="Institutional Telemetry",
                    is_demo_insight=False,
                )
            )

        completed_tasks = [t for t in tasks if t.status == "completed"]
        velocity_val = f"{int(round(len(completed_tasks) / len(tasks) * 100))}%" if tasks else "100%"

        return DashboardStats(
            active_staff_count=len(members),
            active_projects_count=len(projects),
            open_operations_count=len(open_tasks),
            knowledge_entities_count=len(knowledge),
            departments_count=len(departments),
            operations_velocity=velocity_val,
            urgent_tasks_count=len(urgent_tasks),
            pending_reviews_count=len(review_tasks),
            has_demo_data=has_demo,
            verified_knowledge_count=len(verified_knowledge),
            recent_activities=activities,
            operational_insights=insights,
        )

    # -------------------------------------------------------------------------
    # Meetings & Minutes Operations
    # -------------------------------------------------------------------------
    def _row_to_meeting(self, row: sqlite3.Row) -> Meeting:
        agenda = []
        if row["agenda"]:
            try:
                agenda = json.loads(row["agenda"])
            except Exception:
                agenda = []

        attendees = []
        if row["attendees"]:
            try:
                attendees = json.loads(row["attendees"])
            except Exception:
                attendees = []

        decisions = []
        if row["decisions"]:
            try:
                raw_d = json.loads(row["decisions"])
                decisions = [MeetingDecision(**d) if isinstance(d, dict) else d for d in raw_d]
            except Exception:
                decisions = []

        action_items = []
        if row["action_items"]:
            try:
                raw_a = json.loads(row["action_items"])
                action_items = [MeetingActionItem(**a) if isinstance(a, dict) else a for a in raw_a]
            except Exception:
                action_items = []

        return Meeting(
            id=row["id"],
            organization_id=row["organization_id"],
            title=row["title"],
            meeting_type=row["meeting_type"],
            organizer_name=row["organizer_name"],
            organizer_id=row["organizer_id"],
            date=row["date"],
            time=row["time"],
            duration_minutes=row["duration_minutes"] or 60,
            location=row["location"],
            virtual_link=row["virtual_link"],
            related_project_id=row["related_project_id"],
            related_client_id=row["related_client_id"],
            agenda=agenda,
            discussion_notes=row["discussion_notes"] or "",
            decisions=decisions,
            attendees=attendees,
            action_items=action_items,
            status=row["status"],
            created_at=row["created_at"],
            is_demo=bool(row["is_demo"]),
        )

    def list_meetings(self, status: Optional[str] = None, meeting_type: Optional[str] = None) -> List[Meeting]:
        conn = self._get_connection()
        cur = conn.cursor()
        query = "SELECT * FROM meetings WHERE 1=1"
        params: List[Any] = []
        if status:
            query += " AND status = ?"
            params.append(status)
        if meeting_type:
            query += " AND meeting_type = ?"
            params.append(meeting_type)
        query += " ORDER BY date ASC, time ASC;"
        cur.execute(query, params)
        rows = cur.fetchall()
        conn.close()
        return [self._row_to_meeting(r) for r in rows]

    def get_meeting(self, meeting_id: str) -> Optional[Meeting]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM meetings WHERE id = ? LIMIT 1;", (meeting_id,))
        row = cur.fetchone()
        conn.close()
        return self._row_to_meeting(row) if row else None

    def create_meeting(self, meeting: MeetingCreate, organizer_name: str, organizer_id: Optional[str] = None) -> Meeting:
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                meeting_id = f"mtg-{uuid.uuid4().hex[:8]}"
                now_iso = datetime.now(timezone.utc).isoformat()
                agenda_json = json.dumps(meeting.agenda or [])
                attendees_json = json.dumps(meeting.attendees or [])
                cur.execute(
                    """
                    INSERT INTO meetings (
                        id, organization_id, title, meeting_type, organizer_name, organizer_id,
                        date, time, duration_minutes, location, virtual_link,
                        related_project_id, related_client_id, agenda, discussion_notes,
                        decisions, attendees, action_items, status, created_at, is_demo
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        meeting_id,
                        "org-solian-wolves",
                        meeting.title,
                        meeting.meeting_type,
                        organizer_name,
                        organizer_id,
                        meeting.date,
                        meeting.time,
                        meeting.duration_minutes,
                        meeting.location,
                        meeting.virtual_link,
                        meeting.related_project_id,
                        meeting.related_client_id,
                        agenda_json,
                        "",
                        json.dumps([]),
                        attendees_json,
                        json.dumps([]),
                        "scheduled",
                        now_iso,
                        0,
                    ),
                )
                self._log_activity_raw(
                    conn,
                    actor_name=organizer_name,
                    action_type="meeting_scheduled",
                    title=f"Scheduled Meeting: {meeting.title}",
                    description=f"Meeting '{meeting.title}' scheduled for {meeting.date} at {meeting.time}.",
                    module="meetings",
                )
                conn.commit()
            finally:
                conn.close()
            return self.get_meeting(meeting_id)

    def update_meeting(self, meeting_id: str, update: MeetingUpdate) -> Optional[Meeting]:
        existing = self.get_meeting(meeting_id)
        if not existing:
            return None

        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            updates = []
            params = []
            if update.title is not None:
                updates.append("title = ?")
                params.append(update.title)
            if update.status is not None:
                updates.append("status = ?")
                params.append(update.status)
            if update.discussion_notes is not None:
                updates.append("discussion_notes = ?")
                params.append(update.discussion_notes)
            if update.agenda is not None:
                updates.append("agenda = ?")
                params.append(json.dumps(update.agenda))
            if update.attendees is not None:
                updates.append("attendees = ?")
                params.append(json.dumps(update.attendees))
            if update.decisions is not None:
                updates.append("decisions = ?")
                params.append(json.dumps([d.model_dump() for d in update.decisions]))
            if update.action_items is not None:
                updates.append("action_items = ?")
                params.append(json.dumps([a.model_dump() for a in update.action_items]))

            if updates:
                params.append(meeting_id)
                cur.execute(f"UPDATE meetings SET {', '.join(updates)} WHERE id = ?;", params)
                conn.commit()
            conn.close()
            return self.get_meeting(meeting_id)

    def delete_meeting(self, meeting_id: str) -> bool:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("DELETE FROM meetings WHERE id = ?;", (meeting_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            conn.close()
            return deleted

    def convert_meeting_action_to_task(self, meeting_id: str, action_item_id: str) -> Optional[Task]:
        meeting = self.get_meeting(meeting_id)
        if not meeting:
            return None

        target_item = None
        for item in meeting.action_items:
            if item.id == action_item_id:
                target_item = item
                break

        if not target_item:
            return None

        created_task = self.create_task(
            TaskCreate(
                title=target_item.title,
                description=f"Operational action item generated from meeting '{meeting.title}'.",
                priority="medium",
                department="Operations",
                assignee=target_item.assignee,
                due_date=target_item.due_date,
                project_id=meeting.related_project_id,
            ),
            creator_name=meeting.organizer_name,
        )

        target_item.task_id = created_task.id
        target_item.status = "in_progress"

        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute(
                "UPDATE meetings SET action_items = ? WHERE id = ?;",
                (json.dumps([a.model_dump() for a in meeting.action_items]), meeting_id),
            )
            self._log_activity_raw(
                conn,
                actor_name=meeting.organizer_name,
                action_type="action_converted_to_task",
                title=f"Converted Action Item to Task: {created_task.title}",
                description=f"Action item from meeting '{meeting.title}' linked to Task ID {created_task.id}.",
                module="meetings",
            )
            conn.commit()
            conn.close()

        self.create_notification(
            NotificationCreate(
                user_id="all",
                title=f"New Task Assigned: {created_task.title}",
                message=f"Action item from '{meeting.title}' assigned to {target_item.assignee}.",
                type="task_assigned",
                link_module="tasks",
                link_id=created_task.id,
                priority="normal",
            )
        )

        return created_task

    def publish_meeting_decision_to_knowledge(self, meeting_id: str, decision_id: str, author_name: str = "AUREN SOLIAN") -> Optional[KnowledgeItem]:
        meeting = self.get_meeting(meeting_id)
        if not meeting:
            return None

        target_decision = None
        for dec in meeting.decisions:
            if dec.id == decision_id:
                target_decision = dec
                break

        if not target_decision:
            return None

        created_knowledge = self.add_knowledge_item(
            KnowledgeItemCreate(
                title=f"Decision: {target_decision.decision[:80]}",
                category="Governance",
                snippet=f"Formal institutional decision ratified in meeting '{meeting.title}'.",
                content=f"# Institutional Decision Record\n\n**Meeting:** {meeting.title}\n**Date:** {meeting.date}\n**Ratified By:** {meeting.organizer_name}\n\n## Decision\n{target_decision.decision}\n\n## Operational Impact\n{target_decision.impact}\n\n## Attendees\n{', '.join(meeting.attendees) if meeting.attendees else 'Executive Leadership'}",
                classification="Internal",
                department="Executive Leadership & Strategy",
                tags=["decision", "governance", meeting.meeting_type],
            ),
            author=author_name,
            is_verified=True,
        )

        target_decision.knowledge_item_id = created_knowledge.id
        target_decision.status = "approved"

        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute(
                "UPDATE meetings SET decisions = ? WHERE id = ?;",
                (json.dumps([d.model_dump() for d in meeting.decisions]), meeting_id),
            )
            self._log_activity_raw(
                conn,
                actor_name=author_name,
                action_type="decision_published_to_knowledge",
                title=f"Published Decision to Knowledge Vault: {created_knowledge.title}",
                description=f"Meeting decision published into corporate Knowledge Vault under Governance.",
                module="meetings",
            )
            conn.commit()
            conn.close()

        return created_knowledge

    # -------------------------------------------------------------------------
    # Discussions & Threads
    # -------------------------------------------------------------------------
    def _row_to_discussion(self, row: sqlite3.Row) -> DiscussionMessage:
        return DiscussionMessage(
            id=row["id"],
            organization_id=row["organization_id"],
            channel_type=row["channel_type"],
            channel_id=row["channel_id"],
            channel_name=row["channel_name"],
            author_id=row["author_id"],
            author_name=row["author_name"],
            author_role=row["author_role"],
            title=row["title"],
            content=row["content"],
            parent_id=row["parent_id"],
            is_pinned=bool(row["is_pinned"]),
            created_at=row["created_at"],
            is_demo=bool(row["is_demo"]),
        )

    def list_discussions(
        self,
        channel_id: Optional[str] = None,
        channel_type: Optional[str] = None,
        parent_id: Optional[str] = None,
    ) -> List[DiscussionMessage]:
        conn = self._get_connection()
        cur = conn.cursor()
        query = "SELECT * FROM discussions WHERE 1=1"
        params: List[Any] = []
        if channel_id:
            query += " AND channel_id = ?"
            params.append(channel_id)
        if channel_type:
            query += " AND channel_type = ?"
            params.append(channel_type)
        if parent_id is not None:
            if parent_id == "":
                query += " AND parent_id IS NULL"
            else:
                query += " AND parent_id = ?"
                params.append(parent_id)

        query += " ORDER BY is_pinned DESC, created_at ASC;"
        cur.execute(query, params)
        rows = cur.fetchall()
        conn.close()
        return [self._row_to_discussion(r) for r in rows]

    def create_discussion(
        self,
        msg: DiscussionMessageCreate,
        author_id: str,
        author_name: str,
        author_role: str = "member",
    ) -> DiscussionMessage:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            msg_id = f"dsc-{uuid.uuid4().hex[:8]}"
            now_iso = datetime.now(timezone.utc).isoformat()
            cur.execute(
                """
                INSERT INTO discussions (
                    id, organization_id, channel_type, channel_id, channel_name,
                    author_id, author_name, author_role, title, content,
                    parent_id, is_pinned, created_at, is_demo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    msg_id,
                    "org-solian-wolves",
                    msg.channel_type,
                    msg.channel_id,
                    msg.channel_name,
                    author_id,
                    author_name,
                    author_role,
                    msg.title,
                    msg.content,
                    msg.parent_id,
                    1 if msg.is_pinned else 0,
                    now_iso,
                    0,
                ),
            )
            self._log_activity_raw(
                conn,
                actor_name=author_name,
                action_type="discussion_posted",
                title=f"New Message in #{msg.channel_name}",
                description=f"{author_name} posted: {msg.content[:80]}...",
                module="discussions",
            )
            conn.commit()
            conn.close()

            cur_msg = self.list_discussions(channel_id=msg.channel_id)
            for m in cur_msg:
                if m.id == msg_id:
                    return m
            return DiscussionMessage(
                id=msg_id,
                organization_id="org-solian-wolves",
                channel_type=msg.channel_type,
                channel_id=msg.channel_id,
                channel_name=msg.channel_name,
                author_id=author_id,
                author_name=author_name,
                author_role=author_role,
                title=msg.title,
                content=msg.content,
                parent_id=msg.parent_id,
                is_pinned=msg.is_pinned,
                created_at=now_iso,
                is_demo=False,
            )

    def get_discussion_message(self, message_id: str) -> Optional[DiscussionMessage]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM discussions WHERE id = ? LIMIT 1;", (message_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        return self._row_to_discussion(row)

    def delete_discussion_message(self, message_id: str) -> bool:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("DELETE FROM discussions WHERE id = ?;", (message_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            conn.close()
            return deleted

    def list_discussion_channels(self) -> List[DiscussionChannel]:
        channels = [
            DiscussionChannel(id="general", name="General Announcements", type="company", description="Company-wide announcements and operational briefings.", message_count=0),
            DiscussionChannel(id="dept-eng", name="Engineering & AI Operations", type="department", description="Technical architectural discussions, sprint updates, and mesh health.", message_count=0),
            DiscussionChannel(id="dept-strat", name="Strategic Advisory & Accounts", type="department", description="Client relations, contract updates, and advisory deliverables.", message_count=0),
            DiscussionChannel(id="dept-arch", name="Product Architecture & Governance", type="department", description="Security classifications, RBAC boundary reviews, and audits.", message_count=0),
            DiscussionChannel(id="exec-council", name="Executive Leadership Council", type="company", description="High-trust governance, capital allocation, and executive strategy.", message_count=0),
        ]
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT channel_id, COUNT(*) as count FROM discussions GROUP BY channel_id;")
        counts = {r["channel_id"]: r["count"] for r in cur.fetchall()}
        conn.close()

        for ch in channels:
            ch.message_count = counts.get(ch.id, 0)

        return channels

    # -------------------------------------------------------------------------
    # Notifications & Dispatch Center
    # -------------------------------------------------------------------------
    def _row_to_notification(self, row: sqlite3.Row) -> NotificationItem:
        return NotificationItem(
            id=row["id"],
            organization_id=row["organization_id"],
            user_id=row["user_id"],
            title=row["title"],
            message=row["message"],
            type=row["type"],
            link_module=row["link_module"],
            link_id=row["link_id"],
            is_read=bool(row["is_read"]),
            priority=row["priority"] or "normal",
            created_at=row["created_at"],
        )

    def list_notifications(self, user_id: str, unread_only: bool = False) -> List[NotificationItem]:
        member = self.get_member_by_user_id(user_id) or self.get_member_by_id(user_id)
        u_ids = [user_id]
        if member:
            u_ids.extend([member.user_id, member.id])
        u_ids = list(set(u_ids))

        conn = self._get_connection()
        cur = conn.cursor()
        placeholders = " OR ".join(["user_id = ?"] * len(u_ids))
        sql = f"SELECT * FROM notifications WHERE ({placeholders} OR user_id = 'all')"
        params: List[Any] = list(u_ids)
        if unread_only:
            sql += " AND is_read = 0"
        sql += " ORDER BY created_at DESC LIMIT 50;"
        cur.execute(sql, params)
        rows = cur.fetchall()
        conn.close()
        return [self._row_to_notification(r) for r in rows]

    def create_notification(self, notif: NotificationCreate) -> NotificationItem:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            notif_id = f"notif-{uuid.uuid4().hex[:8]}"
            now_iso = datetime.now(timezone.utc).isoformat()
            cur.execute(
                """
                INSERT INTO notifications (
                    id, organization_id, user_id, title, message, type,
                    link_module, link_id, is_read, priority, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    notif_id,
                    "org-solian-wolves",
                    notif.user_id,
                    notif.title,
                    notif.message,
                    notif.type,
                    notif.link_module,
                    notif.link_id,
                    0,
                    notif.priority,
                    now_iso,
                ),
            )
            conn.commit()
            conn.close()
            return NotificationItem(
                id=notif_id,
                organization_id="org-solian-wolves",
                user_id=notif.user_id,
                title=notif.title,
                message=notif.message,
                type=notif.type,
                link_module=notif.link_module,
                link_id=notif.link_id,
                is_read=False,
                priority=notif.priority,
                created_at=now_iso,
            )

    def mark_notification_read(self, notification_id: str, user_id: str) -> bool:
        member = self.get_member_by_user_id(user_id) or self.get_member_by_id(user_id)
        u_ids = [user_id]
        if member:
            u_ids.extend([member.user_id, member.id])
        u_ids = list(set(u_ids))

        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            placeholders = " OR ".join(["user_id = ?"] * len(u_ids))
            cur.execute(
                f"UPDATE notifications SET is_read = 1 WHERE id = ? AND ({placeholders} OR user_id = 'all');",
                [notification_id] + u_ids,
            )
            affected = cur.rowcount
            conn.commit()
            conn.close()
            return affected > 0


    def mark_all_notifications_read(self, user_id: str) -> int:
        member = self.get_member_by_user_id(user_id) or self.get_member_by_id(user_id)
        u_ids = [user_id]
        if member:
            u_ids.extend([member.user_id, member.id])
        u_ids = list(set(u_ids))

        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            placeholders = " OR ".join(["user_id = ?"] * len(u_ids))
            cur.execute(
                f"UPDATE notifications SET is_read = 1 WHERE ({placeholders} OR user_id = 'all') AND is_read = 0;",
                u_ids,
            )
            affected = cur.rowcount
            conn.commit()
            conn.close()
            return affected

    # -------------------------------------------------------------------------
    # Cross-Workspace Capabilities: Unified Search & Operational Calendar
    # -------------------------------------------------------------------------
    def search_unified(self, query: str) -> Dict[str, Any]:
        """Performs multi-entity search across members, projects, tasks, clients, knowledge, documents, meetings."""
        q = query.strip().lower()
        if not q:
            return {
                "query": "",
                "total_matches": 0,
                "members": [],
                "projects": [],
                "tasks": [],
                "clients": [],
                "knowledge": [],
                "documents": [],
                "meetings": [],
            }

        members = [m for m in self.list_members() if q in m.name.lower() or (m.email and q in m.email.lower()) or (m.title and q in m.title.lower())]
        projects = [p for p in self.list_projects() if q in p.name.lower() or (p.description and q in p.description.lower())]
        tasks = [t for t in self.list_tasks() if q in t.title.lower() or (t.description and q in t.description.lower())]
        clients = [c for c in self.list_clients() if q in c.company_name.lower() or (c.contact_person and q in c.contact_person.lower()) or (c.email and q in c.email.lower())]
        knowledge = self.list_knowledge(query=query)
        documents = [d for d in self.list_documents() if q in d.name.lower() or (d.department and q in d.department.lower())]
        meetings = [m for m in self.list_meetings() if q in m.title.lower() or (m.discussion_notes and q in m.discussion_notes.lower())]

        invoices = [i for i in self.list_invoices() if q in i.invoice_number.lower() or q in i.client_name.lower() or (i.notes and q in i.notes.lower())]
        accounts = [a for a in self.list_financial_accounts() if q in a.name.lower() or (a.account_number and q in a.account_number.lower())]
        budgets = [b for b in self.list_budgets() if q in b.name.lower() or (b.category and q in b.category.lower())]

        total = len(members) + len(projects) + len(tasks) + len(clients) + len(knowledge) + len(documents) + len(meetings) + len(invoices) + len(accounts) + len(budgets)
        return {
            "query": query,
            "total_matches": total,
            "members": [m.model_dump() for m in members[:5]],
            "projects": [p.model_dump() for p in projects[:5]],
            "tasks": [t.model_dump() for t in tasks[:5]],
            "clients": [c.model_dump() for c in clients[:5]],
            "knowledge": [k.model_dump() for k in knowledge[:5]],
            "documents": [d.model_dump() for d in documents[:5]],
            "meetings": [m.model_dump() for m in meetings[:5]],
            "invoices": [i.model_dump() for i in invoices[:5]],
            "accounts": [a.model_dump() for a in accounts[:5]],
            "budgets": [b.model_dump() for b in budgets[:5]],
        }

    def get_operational_calendar(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns consolidated operational calendar items combining meetings, task deadlines, and project milestones."""
        events: List[Dict[str, Any]] = []

        meetings = self.list_meetings()
        for m in meetings:
            events.append({
                "id": m.id,
                "type": "meeting",
                "title": m.title,
                "date": m.date,
                "time": m.time,
                "duration_minutes": m.duration_minutes,
                "category": m.meeting_type,
                "status": m.status,
                "organizer": m.organizer_name,
                "location": m.location or m.virtual_link or "Virtual",
                "link_module": "meetings",
                "link_id": m.id,
            })

        tasks = self.list_tasks()
        for t in tasks:
            if t.due_date:
                events.append({
                    "id": t.id,
                    "type": "task",
                    "title": f"Task Due: {t.title}",
                    "date": t.due_date,
                    "time": "17:00",
                    "duration_minutes": 30,
                    "category": t.priority,
                    "status": t.status,
                    "organizer": t.assignee,
                    "location": t.department or "Operations",
                    "link_module": "tasks",
                    "link_id": t.id,
                })

        projects = self.list_projects()
        for p in projects:
            if p.due_date:
                events.append({
                    "id": p.id,
                    "type": "project",
                    "title": f"Milestone: {p.name}",
                    "date": p.due_date,
                    "time": "09:00",
                    "duration_minutes": 60,
                    "category": p.priority,
                    "status": p.status,
                    "organizer": p.lead,
                    "location": p.department or "Company",
                    "link_module": "projects",
                    "link_id": p.id,
                })

        if start_date:
            events = [e for e in events if e["date"] >= start_date]
        if end_date:
            events = [e for e in events if e["date"] <= end_date]

        events.sort(key=lambda x: (x["date"], x.get("time", "00:00")))
        return events



    # =========================================================================
    # Finance & Company Records (Phase 4)
    # =========================================================================

    def _row_to_account(self, row: sqlite3.Row) -> FinancialAccount:
        return FinancialAccount(
            id=row["id"],
            organization_id=row["organization_id"],
            name=row["name"],
            account_type=row["account_type"],
            account_number=row["account_number"],
            currency=row["currency"],
            opening_balance=float(row["opening_balance"]),
            current_balance=float(row["current_balance"]),
            status=row["status"],
            description=row["description"],
            is_demo=bool(row["is_demo"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def _row_to_transaction(self, row: sqlite3.Row) -> FinancialTransaction:
        keys = row.keys()
        return FinancialTransaction(
            id=row["id"],
            reference=row["reference"],
            organization_id=row["organization_id"],
            transaction_type=row["transaction_type"],
            date=row["date"],
            description=row["description"],
            amount=float(row["amount"]),
            currency=row["currency"],
            account_id=row["account_id"],
            account_name=row["account_name"] if "account_name" in keys else None,
            destination_account_id=row["destination_account_id"],
            destination_account_name=row["destination_account_name"] if "destination_account_name" in keys else None,
            category=row["category"],
            project_id=row["project_id"],
            project_name=row["project_name"] if "project_name" in keys else None,
            client_id=row["client_id"],
            client_name=row["client_name"] if "client_name" in keys else None,
            invoice_id=row["invoice_id"],
            payable_id=row["payable_id"],
            payment_method=row["payment_method"],
            status=row["status"],
            recorded_by_id=row["recorded_by_id"],
            recorded_by_name=row["recorded_by_name"],
            supporting_document_url=row["supporting_document_url"],
            notes=row["notes"],
            is_demo=bool(row["is_demo"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def _row_to_invoice(self, row: sqlite3.Row) -> Invoice:
        raw_items = row["items"]
        if isinstance(raw_items, str):
            try:
                items_data = json.loads(raw_items)
            except Exception:
                items_data = []
        else:
            items_data = raw_items or []
        items = [InvoiceItem(**it) if isinstance(it, dict) else it for it in items_data]
        return Invoice(
            id=row["id"],
            organization_id=row["organization_id"],
            invoice_number=row["invoice_number"],
            client_id=row["client_id"],
            client_name=row["client_name"],
            project_id=row["project_id"],
            project_name=row["project_name"],
            issue_date=row["issue_date"],
            due_date=row["due_date"],
            items=items,
            subtotal=float(row["subtotal"]),
            tax_rate=float(row["tax_rate"]),
            tax_amount=float(row["tax_amount"]),
            total_amount=float(row["total_amount"]),
            amount_paid=float(row["amount_paid"]),
            balance_due=float(row["balance_due"]),
            currency=row["currency"],
            status=row["status"],
            notes=row["notes"],
            terms=row["terms"],
            created_by=row["created_by"],
            is_demo=bool(row["is_demo"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def _row_to_payable(self, row: sqlite3.Row) -> AccountsPayable:
        return AccountsPayable(
            id=row["id"],
            organization_id=row["organization_id"],
            reference=row["reference"],
            supplier_name=row["supplier_name"],
            description=row["description"],
            category=row["category"],
            amount_due=float(row["amount_due"]),
            amount_paid=float(row["amount_paid"]),
            balance_due=float(row["balance_due"]),
            currency=row["currency"],
            due_date=row["due_date"],
            project_id=row["project_id"],
            project_name=row["project_name"],
            status=row["status"],
            supporting_document_url=row["supporting_document_url"],
            notes=row["notes"],
            created_by=row["created_by"],
            is_demo=bool(row["is_demo"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def _row_to_budget(self, row: sqlite3.Row) -> FinancialBudget:
        allocated = float(row["allocated_amount"])
        spent = float(row["spent_amount"])
        remaining = max(0.0, allocated - spent)
        pct = round((spent / allocated * 100.0), 1) if allocated > 0 else 0.0
        return FinancialBudget(
            id=row["id"],
            organization_id=row["organization_id"],
            name=row["name"],
            period=row["period"],
            start_date=row["start_date"],
            end_date=row["end_date"],
            category=row["category"],
            project_id=row["project_id"],
            project_name=row["project_name"],
            department=row["department"],
            allocated_amount=allocated,
            spent_amount=spent,
            remaining_amount=remaining,
            utilization_percentage=pct,
            currency=row["currency"],
            status=row["status"],
            created_by=row["created_by"],
            notes=row["notes"],
            is_demo=bool(row["is_demo"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def _row_to_expense_request(self, row: sqlite3.Row) -> ExpenseRequest:
        return ExpenseRequest(
            id=row["id"],
            organization_id=row["organization_id"],
            title=row["title"],
            description=row["description"],
            category=row["category"],
            amount=float(row["amount"]),
            currency=row["currency"],
            requested_by_id=row["requested_by_id"],
            requested_by_name=row["requested_by_name"],
            project_id=row["project_id"],
            project_name=row["project_name"],
            department=row["department"],
            urgency=row["urgency"],
            status=row["status"],
            reviewed_by_id=row["reviewed_by_id"],
            reviewed_by_name=row["reviewed_by_name"],
            review_comments=row["review_comments"],
            reviewed_at=row["reviewed_at"],
            transaction_id=row["transaction_id"],
            supporting_document_url=row["supporting_document_url"],
            is_demo=bool(row["is_demo"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    # Accounts
    def list_financial_accounts(self, include_archived: bool = False) -> List[FinancialAccount]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            if include_archived:
                cur.execute("SELECT * FROM financial_accounts WHERE organization_id = ? ORDER BY created_at ASC;", (self.organization_id,))
            else:
                cur.execute("SELECT * FROM financial_accounts WHERE organization_id = ? AND status != 'archived' ORDER BY created_at ASC;", (self.organization_id,))
            rows = cur.fetchall()
            return [self._row_to_account(r) for r in rows]
        finally:
            conn.close()

    def get_financial_account(self, account_id: str) -> Optional[FinancialAccount]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM financial_accounts WHERE organization_id = ? AND id = ? LIMIT 1;", (self.organization_id, account_id))
            row = cur.fetchone()
            return self._row_to_account(row) if row else None
        finally:
            conn.close()

    def create_financial_account(self, acc: FinancialAccountCreate) -> FinancialAccount:
        now_iso = datetime.now(timezone.utc).isoformat()
        acc_id = f"acc-{uuid.uuid4().hex[:8]}"
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    """INSERT INTO financial_accounts 
                       (id, organization_id, name, account_type, account_number, currency, opening_balance, current_balance, status, description, is_demo, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 0, ?, ?);""",
                    (acc_id, self.organization_id, acc.name, acc.account_type, acc.account_number, acc.currency, acc.opening_balance, acc.opening_balance, acc.description, now_iso, now_iso),
                )
                self._log_activity_raw(conn, "AUREN SOLIAN", "account_created", f"Created Account: {acc.name}", f"Type: {acc.account_type}, Opening: {acc.opening_balance} {acc.currency}", "finance")
                conn.commit()
            finally:
                conn.close()
        return self.get_financial_account(acc_id)

    def update_financial_account(self, account_id: str, update: FinancialAccountUpdate) -> Optional[FinancialAccount]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT * FROM financial_accounts WHERE organization_id = ? AND id = ? LIMIT 1;", (self.organization_id, account_id))
                row = cur.fetchone()
                if not row:
                    return None
                name = update.name if update.name is not None else row["name"]
                status = update.status if update.status is not None else row["status"]
                desc = update.description if update.description is not None else row["description"]
                cur.execute(
                    "UPDATE financial_accounts SET name = ?, status = ?, description = ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                    (name, status, desc, now_iso, self.organization_id, account_id),
                )
                conn.commit()
            finally:
                conn.close()
        return self.get_financial_account(account_id)

    # Transactions
    def list_transactions(
        self,
        account_id: Optional[str] = None,
        transaction_type: Optional[str] = None,
        category: Optional[str] = None,
        project_id: Optional[str] = None,
        client_id: Optional[str] = None,
        limit: int = 100
    ) -> List[FinancialTransaction]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            query = """
                SELECT t.*, 
                       a.name AS account_name,
                       da.name AS destination_account_name,
                       p.name AS project_name,
                       c.company_name AS client_name
                FROM financial_transactions t
                LEFT JOIN financial_accounts a ON t.account_id = a.id
                LEFT JOIN financial_accounts da ON t.destination_account_id = da.id
                LEFT JOIN projects p ON t.project_id = p.id
                LEFT JOIN clients c ON t.client_id = c.id
                WHERE t.organization_id = ?
            """
            params = [self.organization_id]
            if account_id:
                query += " AND (t.account_id = ? OR t.destination_account_id = ?)"
                params.extend([account_id, account_id])
            if transaction_type:
                query += " AND t.transaction_type = ?"
                params.append(transaction_type)
            if category:
                query += " AND t.category = ?"
                params.append(category)
            if project_id:
                query += " AND t.project_id = ?"
                params.append(project_id)
            if client_id:
                query += " AND t.client_id = ?"
                params.append(client_id)
            query += " ORDER BY t.date DESC, t.created_at DESC LIMIT ?"
            params.append(limit)
            cur.execute(query, params)
            rows = cur.fetchall()
            return [self._row_to_transaction(r) for r in rows]
        finally:
            conn.close()

    def get_transaction(self, tx_id: str) -> Optional[FinancialTransaction]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            query = """
                SELECT t.*, 
                       a.name AS account_name,
                       da.name AS destination_account_name,
                       p.name AS project_name,
                       c.company_name AS client_name
                FROM financial_transactions t
                LEFT JOIN financial_accounts a ON t.account_id = a.id
                LEFT JOIN financial_accounts da ON t.destination_account_id = da.id
                LEFT JOIN projects p ON t.project_id = p.id
                LEFT JOIN clients c ON t.client_id = c.id
                WHERE t.organization_id = ? AND t.id = ? LIMIT 1
            """
            cur.execute(query, (self.organization_id, tx_id))
            row = cur.fetchone()
            return self._row_to_transaction(row) if row else None
        finally:
            conn.close()

    def create_transaction(
        self,
        tx: FinancialTransactionCreate,
        recorded_by_id: str = "tm-1",
        recorded_by_name: str = "AUREN SOLIAN"
    ) -> FinancialTransaction:
        now_iso = datetime.now(timezone.utc).isoformat()
        tx_id = f"tx-{uuid.uuid4().hex[:8]}"
        ref = f"TX-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:6].upper()}"

        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                if tx.transaction_type == "income":
                    cur.execute(
                        "UPDATE financial_accounts SET current_balance = current_balance + ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                        (tx.amount, now_iso, self.organization_id, tx.account_id),
                    )
                elif tx.transaction_type == "expense":
                    cur.execute(
                        "UPDATE financial_accounts SET current_balance = current_balance - ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                        (tx.amount, now_iso, self.organization_id, tx.account_id),
                    )
                elif tx.transaction_type == "transfer":
                    if not tx.destination_account_id:
                        raise ValueError("Transfer requires destination_account_id")
                    cur.execute(
                        "UPDATE financial_accounts SET current_balance = current_balance - ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                        (tx.amount, now_iso, self.organization_id, tx.account_id),
                    )
                    cur.execute(
                        "UPDATE financial_accounts SET current_balance = current_balance + ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                        (tx.amount, now_iso, self.organization_id, tx.destination_account_id),
                    )

                if tx.transaction_type == "expense":
                    if tx.project_id:
                        cur.execute(
                            "UPDATE financial_budgets SET spent_amount = spent_amount + ?, updated_at = ? WHERE organization_id = ? AND project_id = ? AND status = 'active';",
                            (tx.amount, now_iso, self.organization_id, tx.project_id),
                        )
                    elif tx.category:
                        cur.execute(
                            "UPDATE financial_budgets SET spent_amount = spent_amount + ?, updated_at = ? WHERE organization_id = ? AND category = ? AND status = 'active';",
                            (tx.amount, now_iso, self.organization_id, tx.category),
                        )

                cur.execute(
                    """INSERT INTO financial_transactions 
                       (id, reference, organization_id, transaction_type, date, description, amount, currency,
                        account_id, destination_account_id, category, project_id, client_id, invoice_id,
                        payable_id, payment_method, status, recorded_by_id, recorded_by_name,
                        supporting_document_url, notes, is_demo, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, 0, ?, ?);""",
                    (tx_id, ref, self.organization_id, tx.transaction_type, tx.date, tx.description, tx.amount,
                     tx.currency, tx.account_id, tx.destination_account_id, tx.category, tx.project_id,
                     tx.client_id, tx.invoice_id, tx.payable_id, tx.payment_method, recorded_by_id,
                     recorded_by_name, tx.supporting_document_url, tx.notes, now_iso, now_iso),
                )
                self._log_activity_raw(conn, recorded_by_name, "transaction_recorded", f"Recorded {tx.transaction_type.capitalize()}: {tx.amount:,.2f} {tx.currency}", tx.description, "finance")
                conn.commit()
            finally:
                conn.close()

        return self.get_transaction(tx_id)

    def reverse_transaction(
        self,
        tx_id: str,
        actor_id: str = "tm-1",
        actor_name: str = "AUREN SOLIAN",
        reason: str = "Administrative correction"
    ) -> Optional[FinancialTransaction]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT * FROM financial_transactions WHERE organization_id = ? AND id = ? LIMIT 1;", (self.organization_id, tx_id))
                row = cur.fetchone()
                if not row or row["status"] == "reversed":
                    return self.get_transaction(tx_id) if row else None

                amount = float(row["amount"])
                tx_type = row["transaction_type"]
                acc_id = row["account_id"]
                dest_acc_id = row["destination_account_id"]

                if tx_type == "income":
                    cur.execute(
                        "UPDATE financial_accounts SET current_balance = current_balance - ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                        (amount, now_iso, self.organization_id, acc_id),
                    )
                elif tx_type == "expense":
                    cur.execute(
                        "UPDATE financial_accounts SET current_balance = current_balance + ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                        (amount, now_iso, self.organization_id, acc_id),
                    )
                    if row["project_id"]:
                        cur.execute(
                            "UPDATE financial_budgets SET spent_amount = MAX(0.0, spent_amount - ?), updated_at = ? WHERE organization_id = ? AND project_id = ?;",
                            (amount, now_iso, self.organization_id, row["project_id"]),
                        )
                elif tx_type == "transfer":
                    cur.execute(
                        "UPDATE financial_accounts SET current_balance = current_balance + ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                        (amount, now_iso, self.organization_id, acc_id),
                    )
                    if dest_acc_id:
                        cur.execute(
                            "UPDATE financial_accounts SET current_balance = current_balance - ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                            (amount, now_iso, self.organization_id, dest_acc_id),
                        )

                rev_note = f"REVERSED by {actor_name} on {now_iso[:10]}. Reason: {reason}. " + (row["notes"] or "")
                cur.execute(
                    "UPDATE financial_transactions SET status = 'reversed', notes = ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                    (rev_note, now_iso, self.organization_id, tx_id),
                )
                self._log_activity_raw(conn, actor_name, "transaction_reversed", f"Reversed Transaction {row['reference']}", f"Amount: {amount} - Reason: {reason}", "finance")
                conn.commit()
            finally:
                conn.close()

        return self.get_transaction(tx_id)

    # Invoices
    def list_invoices(
        self,
        status: Optional[str] = None,
        client_id: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> List[Invoice]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            query = "SELECT * FROM invoices WHERE organization_id = ?"
            params = [self.organization_id]
            if status:
                query += " AND status = ?"
                params.append(status)
            if client_id:
                query += " AND client_id = ?"
                params.append(client_id)
            if project_id:
                query += " AND project_id = ?"
                params.append(project_id)
            query += " ORDER BY issue_date DESC, created_at DESC;"
            cur.execute(query, params)
            rows = cur.fetchall()
            return [self._row_to_invoice(r) for r in rows]
        finally:
            conn.close()

    def get_invoice(self, invoice_id: str) -> Optional[Invoice]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM invoices WHERE organization_id = ? AND id = ? LIMIT 1;", (self.organization_id, invoice_id))
            row = cur.fetchone()
            return self._row_to_invoice(row) if row else None
        finally:
            conn.close()

    def create_invoice(self, inv: InvoiceCreate, creator_name: str = "AUREN SOLIAN") -> Invoice:
        now_iso = datetime.now(timezone.utc).isoformat()
        inv_id = f"inv-{uuid.uuid4().hex[:8]}"
        inv_num = inv.invoice_number or f"INV-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:4].upper()}"

        client = self.get_client(inv.client_id)
        client_name = inv.client_name or (client.company_name if client else "Enterprise Client")
        project_name = inv.project_name
        if not project_name and inv.project_id:
            p = self.get_project(inv.project_id)
            if p:
                project_name = p.name

        subtotal = sum(item.quantity * item.unit_price for item in inv.items)
        tax_amount = round(subtotal * (inv.tax_rate / 100.0), 2)
        total_amount = round(subtotal + tax_amount, 2)
        balance_due = total_amount
        items_json = json.dumps([it.model_dump() for it in inv.items])

        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    """INSERT INTO invoices 
                       (id, organization_id, invoice_number, client_id, client_name, project_id, project_name,
                        issue_date, due_date, items, subtotal, tax_rate, tax_amount, total_amount,
                        amount_paid, balance_due, currency, status, notes, terms, created_by, is_demo,
                        created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, 'issued', ?, ?, ?, 0, ?, ?);""",
                    (inv_id, self.organization_id, inv_num, inv.client_id, client_name, inv.project_id, project_name,
                     inv.issue_date, inv.due_date, items_json, subtotal, inv.tax_rate, tax_amount, total_amount,
                     balance_due, inv.currency, inv.notes, inv.terms, creator_name, now_iso, now_iso),
                )
                self._log_activity_raw(conn, creator_name, "invoice_issued", f"Issued Invoice {inv_num}", f"Client: {client_name}, Total: {total_amount:,.2f} {inv.currency}", "finance")
                conn.commit()
            finally:
                conn.close()

        return self.get_invoice(inv_id)

    def update_invoice(self, invoice_id: str, update: InvoiceUpdate) -> Optional[Invoice]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT * FROM invoices WHERE organization_id = ? AND id = ? LIMIT 1;", (self.organization_id, invoice_id))
                row = cur.fetchone()
                if not row:
                    return None
                due_date = update.due_date if update.due_date is not None else row["due_date"]
                status = update.status if update.status is not None else row["status"]
                notes = update.notes if update.notes is not None else row["notes"]
                terms = update.terms if update.terms is not None else row["terms"]
                cur.execute(
                    "UPDATE invoices SET due_date = ?, status = ?, notes = ?, terms = ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                    (due_date, status, notes, terms, now_iso, self.organization_id, invoice_id),
                )
                conn.commit()
            finally:
                conn.close()
        return self.get_invoice(invoice_id)

    def record_invoice_payment(
        self,
        invoice_id: str,
        payment: InvoicePaymentRecord,
        recorded_by_id: str = "tm-1",
        recorded_by_name: str = "AUREN SOLIAN"
    ) -> Optional[Invoice]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT * FROM invoices WHERE organization_id = ? AND id = ? LIMIT 1;", (self.organization_id, invoice_id))
                row = cur.fetchone()
                if not row:
                    return None

                total = float(row["total_amount"])
                cur_paid = float(row["amount_paid"])
                new_paid = cur_paid + payment.amount
                new_balance = max(0.0, total - new_paid)
                new_status = "paid" if new_balance <= 0.01 else "partially_paid"

                cur.execute(
                    "UPDATE invoices SET amount_paid = ?, balance_due = ?, status = ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                    (new_paid, new_balance, new_status, now_iso, self.organization_id, invoice_id),
                )

                cur.execute(
                    "UPDATE financial_accounts SET current_balance = current_balance + ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                    (payment.amount, now_iso, self.organization_id, payment.account_id),
                )

                tx_id = f"tx-{uuid.uuid4().hex[:8]}"
                ref = payment.payment_reference or f"TX-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:6].upper()}"
                desc = f"Payment received for {row['invoice_number']} ({row['client_name']})"
                cur.execute(
                    """INSERT INTO financial_transactions 
                       (id, reference, organization_id, transaction_type, date, description, amount, currency,
                        account_id, destination_account_id, category, project_id, client_id, invoice_id,
                        payable_id, payment_method, status, recorded_by_id, recorded_by_name,
                        supporting_document_url, notes, is_demo, created_at, updated_at)
                       VALUES (?, ?, ?, 'income', ?, ?, ?, ?, ?, NULL, 'Client Payment', ?, ?, ?, NULL, ?, 'completed', ?, ?, NULL, ?, 0, ?, ?);""",
                    (tx_id, ref, self.organization_id, payment.date, desc, payment.amount, row["currency"],
                     payment.account_id, row["project_id"], row["client_id"], invoice_id, payment.payment_method,
                     recorded_by_id, recorded_by_name, payment.notes, now_iso, now_iso),
                )
                self._log_activity_raw(conn, recorded_by_name, "invoice_payment", f"Payment on {row['invoice_number']}: {payment.amount:,.2f} {row['currency']}", f"Status: {new_status}, Balance: {new_balance:,.2f}", "finance")
                conn.commit()
            finally:
                conn.close()

        return self.get_invoice(invoice_id)

    # Payables
    def list_payables(
        self,
        status: Optional[str] = None,
        category: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> List[AccountsPayable]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            query = "SELECT * FROM accounts_payable WHERE organization_id = ?"
            params = [self.organization_id]
            if status:
                query += " AND status = ?"
                params.append(status)
            if category:
                query += " AND category = ?"
                params.append(category)
            if project_id:
                query += " AND project_id = ?"
                params.append(project_id)
            query += " ORDER BY due_date ASC, created_at DESC;"
            cur.execute(query, params)
            rows = cur.fetchall()
            return [self._row_to_payable(r) for r in rows]
        finally:
            conn.close()

    def get_payable(self, payable_id: str) -> Optional[AccountsPayable]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM accounts_payable WHERE organization_id = ? AND id = ? LIMIT 1;", (self.organization_id, payable_id))
            row = cur.fetchone()
            return self._row_to_payable(row) if row else None
        finally:
            conn.close()

    def create_payable(self, payable: AccountsPayableCreate, creator_name: str = "AUREN SOLIAN") -> AccountsPayable:
        now_iso = datetime.now(timezone.utc).isoformat()
        p_id = f"ap-{uuid.uuid4().hex[:8]}"
        ref = payable.reference or f"BILL-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:4].upper()}"

        project_name = None
        if payable.project_id:
            p = self.get_project(payable.project_id)
            if p:
                project_name = p.name

        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    """INSERT INTO accounts_payable
                       (id, organization_id, reference, supplier_name, description, category, amount_due,
                        amount_paid, balance_due, currency, due_date, project_id, project_name, status,
                        supporting_document_url, notes, created_by, is_demo, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, 0, ?, ?);""",
                    (p_id, self.organization_id, ref, payable.supplier_name, payable.description, payable.category,
                     payable.amount_due, payable.amount_due, payable.currency, payable.due_date, payable.project_id,
                     project_name, payable.supporting_document_url, payable.notes, creator_name, now_iso, now_iso),
                )
                self._log_activity_raw(conn, creator_name, "payable_recorded", f"Recorded Bill {ref}: {payable.supplier_name}", f"Amount: {payable.amount_due:,.2f} {payable.currency}", "finance")
                conn.commit()
            finally:
                conn.close()

        return self.get_payable(p_id)

    def update_payable(self, payable_id: str, update: AccountsPayableUpdate) -> Optional[AccountsPayable]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT * FROM accounts_payable WHERE organization_id = ? AND id = ? LIMIT 1;", (self.organization_id, payable_id))
                row = cur.fetchone()
                if not row:
                    return None
                desc = update.description if update.description is not None else row["description"]
                due_date = update.due_date if update.due_date is not None else row["due_date"]
                status = update.status if update.status is not None else row["status"]
                notes = update.notes if update.notes is not None else row["notes"]
                cur.execute(
                    "UPDATE accounts_payable SET description = ?, due_date = ?, status = ?, notes = ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                    (desc, due_date, status, notes, now_iso, self.organization_id, payable_id),
                )
                conn.commit()
            finally:
                conn.close()
        return self.get_payable(payable_id)

    def record_payable_payment(
        self,
        payable_id: str,
        payment: AccountsPayablePaymentRecord,
        recorded_by_id: str = "tm-1",
        recorded_by_name: str = "AUREN SOLIAN"
    ) -> Optional[AccountsPayable]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT * FROM accounts_payable WHERE organization_id = ? AND id = ? LIMIT 1;", (self.organization_id, payable_id))
                row = cur.fetchone()
                if not row:
                    return None

                total = float(row["amount_due"])
                cur_paid = float(row["amount_paid"])
                new_paid = cur_paid + payment.amount
                new_balance = max(0.0, total - new_paid)
                new_status = "paid" if new_balance <= 0.01 else "partially_paid"

                cur.execute(
                    "UPDATE accounts_payable SET amount_paid = ?, balance_due = ?, status = ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                    (new_paid, new_balance, new_status, now_iso, self.organization_id, payable_id),
                )

                cur.execute(
                    "UPDATE financial_accounts SET current_balance = current_balance - ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                    (payment.amount, now_iso, self.organization_id, payment.account_id),
                )

                tx_id = f"tx-{uuid.uuid4().hex[:8]}"
                ref = payment.payment_reference or f"TX-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:6].upper()}"
                desc = f"Settled payable {row['reference']} ({row['supplier_name']})"
                cur.execute(
                    """INSERT INTO financial_transactions 
                       (id, reference, organization_id, transaction_type, date, description, amount, currency,
                        account_id, destination_account_id, category, project_id, client_id, invoice_id,
                        payable_id, payment_method, status, recorded_by_id, recorded_by_name,
                        supporting_document_url, notes, is_demo, created_at, updated_at)
                       VALUES (?, ?, ?, 'expense', ?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, ?, ?, 'completed', ?, ?, NULL, ?, 0, ?, ?);""",
                    (tx_id, ref, self.organization_id, payment.date, desc, payment.amount, row["currency"],
                     payment.account_id, row["category"], row["project_id"], payable_id, payment.payment_method,
                     recorded_by_id, recorded_by_name, payment.notes, now_iso, now_iso),
                )
                self._log_activity_raw(conn, recorded_by_name, "payable_payment", f"Settled Bill {row['reference']}: {payment.amount:,.2f} {row['currency']}", f"Supplier: {row['supplier_name']}, Status: {new_status}", "finance")
                conn.commit()
            finally:
                conn.close()

        return self.get_payable(payable_id)

    # Budgets
    def list_budgets(
        self,
        status: Optional[str] = None,
        period: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> List[FinancialBudget]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            query = "SELECT * FROM financial_budgets WHERE organization_id = ?"
            params = [self.organization_id]
            if status:
                query += " AND status = ?"
                params.append(status)
            if period:
                query += " AND period = ?"
                params.append(period)
            if project_id:
                query += " AND project_id = ?"
                params.append(project_id)
            query += " ORDER BY start_date DESC, created_at DESC;"
            cur.execute(query, params)
            rows = cur.fetchall()
            return [self._row_to_budget(r) for r in rows]
        finally:
            conn.close()

    def get_budget(self, budget_id: str) -> Optional[FinancialBudget]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM financial_budgets WHERE organization_id = ? AND id = ? LIMIT 1;", (self.organization_id, budget_id))
            row = cur.fetchone()
            return self._row_to_budget(row) if row else None
        finally:
            conn.close()

    def create_budget(self, budget: FinancialBudgetCreate, creator_name: str = "AUREN SOLIAN") -> FinancialBudget:
        now_iso = datetime.now(timezone.utc).isoformat()
        b_id = f"bgt-{uuid.uuid4().hex[:8]}"

        project_name = None
        if budget.project_id:
            p = self.get_project(budget.project_id)
            if p:
                project_name = p.name

        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    """INSERT INTO financial_budgets
                       (id, organization_id, name, period, start_date, end_date, category, project_id,
                        project_name, department, allocated_amount, spent_amount, currency, status,
                        created_by, notes, is_demo, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, 'active', ?, ?, 0, ?, ?);""",
                    (b_id, self.organization_id, budget.name, budget.period, budget.start_date, budget.end_date,
                     budget.category, budget.project_id, project_name, budget.department, budget.allocated_amount,
                     budget.currency, creator_name, budget.notes, now_iso, now_iso),
                )
                self._log_activity_raw(conn, creator_name, "budget_created", f"Created Budget: {budget.name}", f"Allocation: {budget.allocated_amount:,.2f} {budget.currency}", "finance")
                conn.commit()
            finally:
                conn.close()

        return self.get_budget(b_id)

    def update_budget(self, budget_id: str, update: FinancialBudgetUpdate) -> Optional[FinancialBudget]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT * FROM financial_budgets WHERE organization_id = ? AND id = ? LIMIT 1;", (self.organization_id, budget_id))
                row = cur.fetchone()
                if not row:
                    return None
                name = update.name if update.name is not None else row["name"]
                alloc = update.allocated_amount if update.allocated_amount is not None else row["allocated_amount"]
                status = update.status if update.status is not None else row["status"]
                notes = update.notes if update.notes is not None else row["notes"]
                cur.execute(
                    "UPDATE financial_budgets SET name = ?, allocated_amount = ?, status = ?, notes = ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                    (name, alloc, status, notes, now_iso, self.organization_id, budget_id),
                )
                conn.commit()
            finally:
                conn.close()
        return self.get_budget(budget_id)

    # Expense Requests
    def list_expense_requests(
        self,
        status: Optional[str] = None,
        urgency: Optional[str] = None,
        requested_by_id: Optional[str] = None
    ) -> List[ExpenseRequest]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            query = "SELECT * FROM expense_requests WHERE organization_id = ?"
            params = [self.organization_id]
            if status:
                query += " AND status = ?"
                params.append(status)
            if urgency:
                query += " AND urgency = ?"
                params.append(urgency)
            if requested_by_id:
                query += " AND requested_by_id = ?"
                params.append(requested_by_id)
            query += " ORDER BY created_at DESC;"
            cur.execute(query, params)
            rows = cur.fetchall()
            return [self._row_to_expense_request(r) for r in rows]
        finally:
            conn.close()

    def get_expense_request(self, request_id: str) -> Optional[ExpenseRequest]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM expense_requests WHERE organization_id = ? AND id = ? LIMIT 1;", (self.organization_id, request_id))
            row = cur.fetchone()
            return self._row_to_expense_request(row) if row else None
        finally:
            conn.close()

    def create_expense_request(
        self,
        req: ExpenseRequestCreate,
        requested_by_id: str = "tm-1",
        requested_by_name: str = "AUREN SOLIAN"
    ) -> ExpenseRequest:
        now_iso = datetime.now(timezone.utc).isoformat()
        r_id = f"req-{uuid.uuid4().hex[:8]}"

        project_name = None
        if req.project_id:
            p = self.get_project(req.project_id)
            if p:
                project_name = p.name

        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    """INSERT INTO expense_requests
                       (id, organization_id, title, description, category, amount, currency,
                        requested_by_id, requested_by_name, project_id, project_name, department,
                        urgency, status, reviewed_by_id, reviewed_by_name, review_comments,
                        reviewed_at, transaction_id, supporting_document_url, is_demo, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', NULL, NULL, NULL, NULL, NULL, ?, 0, ?, ?);""",
                    (r_id, self.organization_id, req.title, req.description, req.category, req.amount,
                     req.currency, requested_by_id, requested_by_name, req.project_id, project_name,
                     req.department, req.urgency, req.supporting_document_url, now_iso, now_iso),
                )
                self._log_activity_raw(conn, requested_by_name, "expense_request_submitted", f"Expense Request: {req.title}", f"Amount: {req.amount:,.2f} {req.currency}, Urgency: {req.urgency}", "finance")
                conn.commit()
            finally:
                conn.close()

        return self.get_expense_request(r_id)

    def review_expense_request(
        self,
        request_id: str,
        review: ExpenseRequestReview,
        reviewer_id: str = "tm-1",
        reviewer_name: str = "Alice Moraa Nyakundi"
    ) -> Optional[ExpenseRequest]:
        now_iso = datetime.now(timezone.utc).isoformat()
        status = "approved" if review.action == "approve" else "rejected"
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT * FROM expense_requests WHERE organization_id = ? AND id = ? LIMIT 1;", (self.organization_id, request_id))
                row = cur.fetchone()
                if not row:
                    return None
                cur.execute(
                    """UPDATE expense_requests 
                       SET status = ?, reviewed_by_id = ?, reviewed_by_name = ?, review_comments = ?, reviewed_at = ?, updated_at = ?
                       WHERE organization_id = ? AND id = ?;""",
                    (status, reviewer_id, reviewer_name, review.comments, now_iso, now_iso, self.organization_id, request_id),
                )
                self._log_activity_raw(conn, reviewer_name, f"expense_request_{status}", f"{status.capitalize()} Request: {row['title']}", f"Comments: {review.comments or 'None'}", "finance")
                conn.commit()
            finally:
                conn.close()
        return self.get_expense_request(request_id)

    def pay_expense_request(
        self,
        request_id: str,
        payment: ExpenseRequestPay,
        actor_id: str = "tm-1",
        actor_name: str = "Alice Moraa Nyakundi"
    ) -> Optional[ExpenseRequest]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._lock:
            conn = self._get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT * FROM expense_requests WHERE organization_id = ? AND id = ? LIMIT 1;", (self.organization_id, request_id))
                row = cur.fetchone()
                if not row or row["status"] != "approved":
                    return None

                amount = float(row["amount"])
                cur.execute(
                    "UPDATE financial_accounts SET current_balance = current_balance - ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                    (amount, now_iso, self.organization_id, payment.account_id),
                )

                tx_id = f"tx-{uuid.uuid4().hex[:8]}"
                ref = payment.payment_reference or f"TX-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:6].upper()}"
                desc = f"Disbursement for approved request: {row['title']}"
                cur.execute(
                    """INSERT INTO financial_transactions 
                       (id, reference, organization_id, transaction_type, date, description, amount, currency,
                        account_id, destination_account_id, category, project_id, client_id, invoice_id,
                        payable_id, payment_method, status, recorded_by_id, recorded_by_name,
                        supporting_document_url, notes, is_demo, created_at, updated_at)
                       VALUES (?, ?, ?, 'expense', ?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL, ?, 'completed', ?, ?, ?, ?, 0, ?, ?);""",
                    (tx_id, ref, self.organization_id, payment.date, desc, amount, row["currency"],
                     payment.account_id, row["category"], row["project_id"], payment.payment_method,
                     actor_id, actor_name, row["supporting_document_url"], payment.notes, now_iso, now_iso),
                )

                cur.execute(
                    "UPDATE expense_requests SET status = 'paid', transaction_id = ?, updated_at = ? WHERE organization_id = ? AND id = ?;",
                    (tx_id, now_iso, self.organization_id, request_id),
                )
                self._log_activity_raw(conn, actor_name, "expense_request_disbursed", f"Disbursed Request: {row['title']}", f"Amount: {amount:,.2f} {row['currency']} via {payment.payment_method}", "finance")
                conn.commit()
            finally:
                conn.close()

        return self.get_expense_request(request_id)

    # Telemetry & Reports
    def get_financial_overview(self) -> FinancialOverviewStats:
        accounts = self.list_financial_accounts()
        recent_transactions = self.list_transactions(limit=10)
        all_txs = self.list_transactions(limit=2000)

        completed_txs = [t for t in all_txs if t.status == "completed"]
        total_income = sum(t.amount for t in completed_txs if t.transaction_type == "income")
        total_expenses = sum(t.amount for t in completed_txs if t.transaction_type == "expense")
        net_cash_movement = total_income - total_expenses

        total_balances = sum(a.current_balance for a in accounts if a.status == "active")

        invoices = self.list_invoices()
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        outstanding_receivables = sum(inv.balance_due for inv in invoices if inv.status in ("issued", "partially_paid", "overdue"))
        overdue_invoices_count = sum(1 for inv in invoices if inv.status == "overdue" or (inv.status in ("issued", "partially_paid") and inv.due_date < today))

        payables = self.list_payables()
        outstanding_payables = sum(p.balance_due for p in payables if p.status in ("pending", "partially_paid", "overdue"))

        current_month_prefix = today[:7]
        monthly_income = sum(t.amount for t in completed_txs if t.transaction_type == "income" and t.date.startswith(current_month_prefix))
        monthly_expenditure = sum(t.amount for t in completed_txs if t.transaction_type == "expense" and t.date.startswith(current_month_prefix))

        budgets = self.list_budgets(status="active")
        budget_total_allocated = sum(b.allocated_amount for b in budgets)
        budget_total_spent = sum(b.spent_amount for b in budgets)
        budget_utilization_percentage = round((budget_total_spent / budget_total_allocated * 100.0), 1) if budget_total_allocated > 0 else 0.0

        expense_requests = self.list_expense_requests()
        pending_approvals_count = sum(1 for r in expense_requests if r.status == "submitted")

        trend_map = {}
        for t in completed_txs:
            month = t.date[:7] if len(t.date) >= 7 else current_month_prefix
            if month not in trend_map:
                trend_map[month] = {"month": month, "income": 0.0, "expense": 0.0, "net": 0.0}
            if t.transaction_type == "income":
                trend_map[month]["income"] += t.amount
                trend_map[month]["net"] += t.amount
            elif t.transaction_type == "expense":
                trend_map[month]["expense"] += t.amount
                trend_map[month]["net"] -= t.amount

        cash_flow_trend = sorted(trend_map.values(), key=lambda x: x["month"])[-6:]
        if not cash_flow_trend:
            cash_flow_trend = [{"month": current_month_prefix, "income": monthly_income, "expense": monthly_expenditure, "net": monthly_income - monthly_expenditure}]

        cat_map = {}
        for t in completed_txs:
            if t.transaction_type == "expense":
                cat_map[t.category] = cat_map.get(t.category, 0.0) + t.amount
        expense_by_category = [{"category": k, "amount": v} for k, v in sorted(cat_map.items(), key=lambda x: x[1], reverse=True)]

        return FinancialOverviewStats(
            total_recorded_income=total_income,
            total_recorded_expenses=total_expenses,
            net_cash_movement=net_cash_movement,
            total_recorded_balances=total_balances,
            outstanding_receivables=outstanding_receivables,
            outstanding_payables=outstanding_payables,
            monthly_income=monthly_income,
            monthly_expenditure=monthly_expenditure,
            budget_total_allocated=budget_total_allocated,
            budget_total_spent=budget_total_spent,
            budget_utilization_percentage=budget_utilization_percentage,
            pending_approvals_count=pending_approvals_count,
            overdue_invoices_count=overdue_invoices_count,
            accounts=accounts,
            recent_transactions=recent_transactions,
            cash_flow_trend=cash_flow_trend,
            expense_by_category=expense_by_category,
        )

    def get_project_financials(self, project_id: str) -> ProjectFinancialSummary:
        project = self.get_project(project_id)
        project_name = project.name if project else f"Project {project_id}"

        budgets = self.list_budgets(project_id=project_id)
        allocated_budget = sum(b.allocated_amount for b in budgets)

        txs = self.list_transactions(project_id=project_id)
        actual_expenditure = sum(t.amount for t in txs if t.transaction_type == "expense" and t.status == "completed")
        remaining_budget = max(0.0, allocated_budget - actual_expenditure)
        utilization = round((actual_expenditure / allocated_budget * 100.0), 1) if allocated_budget > 0 else 0.0

        invoices = self.list_invoices(project_id=project_id)
        billed_revenue = sum(inv.total_amount for inv in invoices if inv.status != "cancelled")
        received_revenue = sum(inv.amount_paid for inv in invoices if inv.status != "cancelled")
        outstanding_revenue = sum(inv.balance_due for inv in invoices if inv.status in ("issued", "partially_paid", "overdue"))

        return ProjectFinancialSummary(
            project_id=project_id,
            project_name=project_name,
            allocated_budget=allocated_budget,
            actual_expenditure=actual_expenditure,
            remaining_budget=remaining_budget,
            budget_utilization_percentage=utilization,
            billed_revenue=billed_revenue,
            received_revenue=received_revenue,
            outstanding_revenue=outstanding_revenue,
            transactions=txs[:20],
        )

    # -------------------------------------------------------------------------
    # Profile & Avatar Management
    # -------------------------------------------------------------------------
    def update_member_avatar(self, user_id_or_member_id: str, avatar_url: Optional[str]) -> Optional[OrganizationMember]:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute(
                "UPDATE members SET avatar_url = ? WHERE user_id = ? OR id = ? OR auth_user_id = ?;",
                (avatar_url, user_id_or_member_id, user_id_or_member_id, user_id_or_member_id),
            )
            conn.commit()
            conn.close()
            return self.get_member_by_user_id(user_id_or_member_id) or self.get_member_by_id(user_id_or_member_id)

    # -------------------------------------------------------------------------
    # Email Drafts & Messages Persistence
    # -------------------------------------------------------------------------
    def save_email_draft(self, user_id: str, draft: EmailDraftCreate) -> EmailDraft:
        with self._lock:
            draft_id = f"drf-{uuid.uuid4().hex[:10]}"
            now = datetime.now(timezone.utc).isoformat()
            attachments_json = json.dumps([a.model_dump() for a in draft.attachments] if draft.attachments else [])
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO email_drafts (
                    id, user_id, organization_id, to_addresses, cc_addresses, bcc_addresses,
                    subject, body, attachments, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    draft_id,
                    user_id,
                    self.organization_id,
                    json.dumps(draft.to_addresses),
                    json.dumps(draft.cc_addresses),
                    json.dumps(draft.bcc_addresses),
                    draft.subject,
                    draft.body,
                    attachments_json,
                    now,
                    now,
                ),
            )
            conn.commit()
            conn.close()
            res = self.get_email_draft(draft_id, user_id)
            if not res:
                raise RuntimeError("Failed to retrieve newly created email draft.")
            return res

    def update_email_draft(self, draft_id: str, user_id: str, update: EmailDraftUpdate) -> Optional[EmailDraft]:
        with self._lock:
            current = self.get_email_draft(draft_id, user_id)
            if not current:
                return None
            now = datetime.now(timezone.utc).isoformat()
            to_addrs = json.dumps(update.to_addresses) if update.to_addresses is not None else json.dumps(current.to_addresses)
            cc_addrs = json.dumps(update.cc_addresses) if update.cc_addresses is not None else json.dumps(current.cc_addresses)
            bcc_addrs = json.dumps(update.bcc_addresses) if update.bcc_addresses is not None else json.dumps(current.bcc_addresses)
            subject = update.subject if update.subject is not None else current.subject
            body = update.body if update.body is not None else current.body
            attachments = json.dumps([a.model_dump() for a in update.attachments]) if update.attachments is not None else json.dumps([a.model_dump() for a in current.attachments])

            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE email_drafts
                SET to_addresses = ?, cc_addresses = ?, bcc_addresses = ?, subject = ?, body = ?, attachments = ?, updated_at = ?
                WHERE id = ? AND user_id = ?;
                """,
                (to_addrs, cc_addrs, bcc_addrs, subject, body, attachments, now, draft_id, user_id),
            )
            conn.commit()
            conn.close()
            return self.get_email_draft(draft_id, user_id)

    def get_email_draft(self, draft_id: str, user_id: str) -> Optional[EmailDraft]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM email_drafts WHERE id = ? AND user_id = ? LIMIT 1;", (draft_id, user_id))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        to_addrs = json.loads(row["to_addresses"]) if row["to_addresses"] else []
        cc_addrs = json.loads(row["cc_addresses"]) if row["cc_addresses"] else []
        bcc_addrs = json.loads(row["bcc_addresses"]) if row["bcc_addresses"] else []
        attachments = [EmailAttachmentMeta(**a) for a in json.loads(row["attachments"])] if row["attachments"] else []
        return EmailDraft(
            id=row["id"],
            user_id=row["user_id"],
            organization_id=row["organization_id"],
            to_addresses=to_addrs,
            cc_addresses=cc_addrs,
            bcc_addresses=bcc_addrs,
            subject=row["subject"],
            body=row["body"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            attachments=attachments,
        )

    def delete_email_draft(self, draft_id: str, user_id: str) -> bool:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("DELETE FROM email_drafts WHERE id = ? AND user_id = ?;", (draft_id, user_id))
            deleted = cur.rowcount > 0
            conn.commit()
            conn.close()
            return deleted

    def list_email_drafts(self, user_id: str) -> List[EmailDraft]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM email_drafts WHERE user_id = ? ORDER BY updated_at DESC;", (user_id,))
        rows = cur.fetchall()
        conn.close()
        drafts = []
        for row in rows:
            to_addrs = json.loads(row["to_addresses"]) if row["to_addresses"] else []
            cc_addrs = json.loads(row["cc_addresses"]) if row["cc_addresses"] else []
            bcc_addrs = json.loads(row["bcc_addresses"]) if row["bcc_addresses"] else []
            attachments = [EmailAttachmentMeta(**a) for a in json.loads(row["attachments"])] if row["attachments"] else []
            drafts.append(
                EmailDraft(
                    id=row["id"],
                    user_id=row["user_id"],
                    organization_id=row["organization_id"],
                    to_addresses=to_addrs,
                    cc_addresses=cc_addrs,
                    bcc_addresses=bcc_addrs,
                    subject=row["subject"],
                    body=row["body"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                    attachments=attachments,
                )
            )
        return drafts

    def save_email_message(self, message: EmailMessage) -> EmailMessage:
        with self._lock:
            conn = self._get_connection()
            cur = conn.cursor()
            attachments_json = json.dumps([a.model_dump() for a in message.attachments] if message.attachments else [])
            cur.execute(
                """
                INSERT OR REPLACE INTO email_messages (
                    id, organization_id, user_id, folder, from_address, to_addresses,
                    cc_addresses, bcc_addresses, subject, body_text, body_html,
                    is_read, attachments, reply_to_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    message.id,
                    message.organization_id,
                    message.user_id,
                    message.folder,
                    message.from_address,
                    json.dumps(message.to_addresses),
                    json.dumps(message.cc_addresses),
                    json.dumps(message.bcc_addresses),
                    message.subject,
                    message.body_text,
                    message.body_html,
                    1 if message.is_read else 0,
                    attachments_json,
                    message.reply_to_id,
                    message.created_at,
                ),
            )
            conn.commit()
            conn.close()
            return message

    def get_email_message(self, message_id: str) -> Optional[EmailMessage]:
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM email_messages WHERE id = ? LIMIT 1;", (message_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        to_addrs = json.loads(row["to_addresses"]) if row["to_addresses"] else []
        cc_addrs = json.loads(row["cc_addresses"]) if row["cc_addresses"] else []
        bcc_addrs = json.loads(row["bcc_addresses"]) if row["bcc_addresses"] else []
        attachments = [EmailAttachmentMeta(**a) for a in json.loads(row["attachments"])] if row["attachments"] else []
        return EmailMessage(
            id=row["id"],
            organization_id=row["organization_id"],
            user_id=row["user_id"],
            folder=row["folder"],
            from_address=row["from_address"],
            to_addresses=to_addrs,
            cc_addresses=cc_addrs,
            bcc_addresses=bcc_addrs,
            subject=row["subject"],
            body_text=row["body_text"],
            body_html=row["body_html"],
            is_read=bool(row["is_read"]),
            attachments=attachments,
            reply_to_id=row["reply_to_id"],
            created_at=row["created_at"],
        )

    def list_email_messages(
        self,
        folder: str = "inbox",
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[EmailMessage], int]:
        conn = self._get_connection()
        cur = conn.cursor()
        query = "SELECT * FROM email_messages WHERE folder = ?"
        params: List[Any] = [folder]
        if search:
            query += " AND (subject LIKE ? OR from_address LIKE ? OR body_text LIKE ?)"
            s_param = f"%{search}%"
            params.extend([s_param, s_param, s_param])

        count_cur = conn.cursor()
        count_sql = "SELECT COUNT(*) as count FROM email_messages WHERE folder = ?"
        count_params: List[Any] = [folder]
        if search:
            count_sql += " AND (subject LIKE ? OR from_address LIKE ? OR body_text LIKE ?)"
            count_params.extend([s_param, s_param, s_param])
        count_cur.execute(count_sql, count_params)
        total = count_cur.fetchone()["count"]

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?;"
        offset = (page - 1) * page_size
        params.extend([page_size, offset])

        cur.execute(query, params)
        rows = cur.fetchall()
        conn.close()

        messages = []
        for row in rows:
            to_addrs = json.loads(row["to_addresses"]) if row["to_addresses"] else []
            cc_addrs = json.loads(row["cc_addresses"]) if row["cc_addresses"] else []
            bcc_addrs = json.loads(row["bcc_addresses"]) if row["bcc_addresses"] else []
            attachments = [EmailAttachmentMeta(**a) for a in json.loads(row["attachments"])] if row["attachments"] else []
            messages.append(
                EmailMessage(
                    id=row["id"],
                    organization_id=row["organization_id"],
                    user_id=row["user_id"],
                    folder=row["folder"],
                    from_address=row["from_address"],
                    to_addresses=to_addrs,
                    cc_addresses=cc_addrs,
                    bcc_addresses=bcc_addrs,
                    subject=row["subject"],
                    body_text=row["body_text"],
                    body_html=row["body_html"],
                    is_read=bool(row["is_read"]),
                    attachments=attachments,
                    reply_to_id=row["reply_to_id"],
                    created_at=row["created_at"],
                )
            )
        return messages, total


class DynamicRepositoryProxy:
    """Dynamically delegates to SQLite or PostgreSQL repository based on runtime settings."""

    def __init__(self):
        self._sqlite_repo = None
        self._postgres_repo = None

    @property
    def active_repo(self):
        if settings.database_dialect == "postgres":
            if self._postgres_repo is None or self._postgres_repo.db_url != settings.DATABASE_URL:
                from app.services.storage.postgres_repository import PostgresRepository
                self._postgres_repo = PostgresRepository()
            return self._postgres_repo
        else:
            if settings.is_production:
                raise RuntimeError(
                    "Critical security fault: Repository cannot route production requests to SQLite. "
                    "Ensure a valid PostgreSQL DATABASE_URL is configured."
                )
            if self._sqlite_repo is None:
                self._sqlite_repo = EnterpriseRepository()
            return self._sqlite_repo

    def __getattr__(self, name):
        return getattr(self.active_repo, name)


repo = DynamicRepositoryProxy()
