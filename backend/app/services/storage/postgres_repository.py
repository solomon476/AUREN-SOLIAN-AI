"""PostgreSQL repository for Solian Wolves Enterprise Organizational Intelligence.

Provides full PostgreSQL / Supabase storage compatibility matching the canonical schema.
Enforces multi-tenant organization boundary isolation and Row-Level Security (RLS).
"""
import json
import logging
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from app.core.config import settings
from app.core.security import UserRole
from app.db.connection import db_manager
from app.models.organization import (
    Department,
    DepartmentCreate,
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
    CorporateDocument,
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

from app.models.notifications import (
    NotificationItem,
    NotificationCreate,
)

logger = logging.getLogger("auren.storage.postgres")


class PostgresRepository:
    """Enterprise PostgreSQL repository implementation for production persistence."""

    def __init__(self, database_url: Optional[str] = None):
        self.db_url = database_url or settings.DATABASE_URL
        self.organization_id = settings.ORGANIZATION_ID

    def _get_connection(self):
        """Returns a PostgreSQL connection from DatabaseManager with RealDictCursor."""
        conn = db_manager.get_postgres_connection()
        return conn

    def _set_tenant_session(self, cur):
        """Sets the tenant isolation session variable for PostgreSQL RLS policies."""
        cur.execute("SET LOCAL app.current_org_id = %s;", (self.organization_id,))

    # =========================================================================
    # Executed Proposals (Chat Action Idempotency)
    # =========================================================================
    def is_proposal_executed(self, proposal_id: str) -> bool:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT 1 FROM executed_proposals WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, proposal_id))
            return cur.fetchone() is not None

    def record_proposal_executed(self, proposal_id: str, action_type: str, executed_by: str):
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            now_iso = datetime.now(timezone.utc).isoformat()
            cur.execute(
                "INSERT INTO executed_proposals (id, organization_id, action_type, executed_by, executed_at) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING;",
                (proposal_id, self.organization_id, action_type, executed_by, now_iso),
            )

    # =========================================================================
    # Organization Profile & Operating Info
    # =========================================================================
    def get_organization_profile(self) -> OrganizationProfile:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM organizations WHERE id = %s LIMIT 1;", (self.organization_id,))
            row = cur.fetchone()
            if not row:
                cur.execute("SELECT * FROM organizations LIMIT 1;")
                row = cur.fetchone()

            if row:
                return OrganizationProfile(
                    id=row["id"],
                    name=row["name"],
                    code=row["code"],
                    tagline=row["tagline"] or "",
                    mission=row["mission"],
                    vision=row["vision"],
                    operating_model=row["operating_model"],
                    headquarters=row["headquarters"],
                    founded_year=row["founded_year"],
                    primary_timezone=row["primary_timezone"] or "UTC",
                    fiscal_year=row["fiscal_year"],
                    tier=row["tier"] or "enterprise",
                    total_members=row["total_members"] or 1,
                    verified_leadership=VERIFIED_LEADERSHIP_COUNCIL,
                )

            # Fallback profile
            return OrganizationProfile(
                id=self.organization_id,
                name=settings.ORGANIZATION_NAME,
                code=settings.ORGANIZATION_CODE,
                tagline="Organizational Intelligence & High-Trust Autonomous Operations",
                primary_timezone="UTC",
                tier="enterprise",
                total_members=1,
                verified_leadership=VERIFIED_LEADERSHIP_COUNCIL,
            )

    def update_organization_profile(self, update: OrganizationProfileUpdate) -> OrganizationProfile:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            current = self.get_organization_profile()

            name = update.name if update.name is not None else current.name
            tagline = update.tagline if update.tagline is not None else current.tagline
            mission = update.mission if update.mission is not None else current.mission
            vision = update.vision if update.vision is not None else current.vision
            operating_model = update.operating_model if update.operating_model is not None else current.operating_model
            headquarters = update.headquarters if update.headquarters is not None else current.headquarters
            primary_timezone = update.primary_timezone if update.primary_timezone is not None else current.primary_timezone
            fiscal_year = update.fiscal_year if update.fiscal_year is not None else current.fiscal_year
            founded_year = update.founded_year if update.founded_year is not None else current.founded_year

            cur.execute("""
                UPDATE organizations SET
                    name = %s, tagline = %s, mission = %s, vision = %s,
                    operating_model = %s, headquarters = %s, primary_timezone = %s,
                    fiscal_year = %s, founded_year = %s, updated_at = NOW()
                WHERE id = %s;
            """, (name, tagline, mission, vision, operating_model, headquarters, primary_timezone, fiscal_year, founded_year, current.id))

            return self.get_organization_profile()

    def get_company_operating_info(self) -> CompanyOperatingInfo:
        profile = self.get_organization_profile()
        principles = self.list_operating_principles()
        cadences = self.list_operating_cadences()

        return CompanyOperatingInfo(
            organization_id=profile.id,
            name=profile.name,
            code=profile.code,
            tagline=profile.tagline,
            mission=profile.mission,
            vision=profile.vision,
            operating_model=profile.operating_model,
            headquarters=profile.headquarters,
            founded_year=profile.founded_year,
            primary_timezone=profile.primary_timezone,
            fiscal_year=profile.fiscal_year,
            tier=profile.tier,
            total_members=profile.total_members,
            operating_principles=principles,
            operating_cadences=cadences,
            verified_leadership=VERIFIED_LEADERSHIP_COUNCIL,
        )

    def list_operating_principles(self) -> List[OperatingPrinciple]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM operating_principles WHERE organization_id = %s ORDER BY id ASC;", (self.organization_id,))
            rows = cur.fetchall()
            return [
                OperatingPrinciple(
                    id=r["id"],
                    title=r["title"],
                    description=r["description"],
                    is_demo=bool(r["is_demo"]),
                )
                for r in rows
            ]

    def list_operating_cadences(self) -> List[OperatingCadence]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM operating_cadences WHERE organization_id = %s ORDER BY id ASC;", (self.organization_id,))
            rows = cur.fetchall()
            return [
                OperatingCadence(
                    id=r["id"],
                    name=r["name"],
                    cadence=r["cadence"],
                    audience=r["audience"],
                    description=r["description"],
                    lead=r["lead"],
                    is_demo=bool(r["is_demo"]),
                )
                for r in rows
            ]

    # =========================================================================
    # Departments & Teams
    # =========================================================================
    def list_departments(self) -> List[Department]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM departments WHERE organization_id = %s ORDER BY code ASC;", (self.organization_id,))
            rows = cur.fetchall()
            return [
                Department(
                    id=r["id"],
                    organization_id=r["organization_id"],
                    name=r["name"],
                    code=r["code"],
                    description=r["description"] or "",
                    lead_id=r["lead_id"],
                    lead_name=r["lead_name"],
                    member_count=r["member_count"] or 0,
                    active_initiatives=r["active_initiatives"] or 0,
                    is_demo=bool(r["is_demo"]),
                )
                for r in rows
            ]

    def create_department(self, dept: DepartmentCreate) -> Department:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            dept_id = f"dept-{dept.code.lower()}"
            cur.execute("""
                INSERT INTO departments (id, organization_id, name, code, description, lead_id, lead_name, member_count, active_initiatives, is_demo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    lead_name = EXCLUDED.lead_name;
            """, (dept_id, self.organization_id, dept.name, dept.code.upper(), dept.description, None, dept.lead_name, 0, 0, False))

            return Department(
                id=dept_id,
                organization_id=self.organization_id,
                name=dept.name,
                code=dept.code.upper(),
                description=dept.description,
                lead_id=None,
                lead_name=dept.lead_name,
                member_count=0,
                active_initiatives=0,
                is_demo=False,
            )

    def list_teams(self, department_id: Optional[str] = None) -> List[Team]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            if department_id:
                cur.execute("SELECT * FROM teams WHERE organization_id = %s AND department_id = %s ORDER BY name ASC;", (self.organization_id, department_id))
            else:
                cur.execute("SELECT * FROM teams WHERE organization_id = %s ORDER BY department_name ASC, name ASC;", (self.organization_id,))
            rows = cur.fetchall()
            return [
                Team(
                    id=r["id"],
                    organization_id=r["organization_id"],
                    department_id=r["department_id"],
                    department_name=r["department_name"],
                    name=r["name"],
                    lead_name=r["lead_name"],
                    description=r["description"] or "",
                    focus_area=r["focus_area"] or "",
                    member_count=r["member_count"] or 0,
                    is_demo=bool(r["is_demo"]),
                )
                for r in rows
            ]

    # =========================================================================
    # Members & Staff Directory
    # =========================================================================
    def list_members(self) -> List[OrganizationMember]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM members WHERE organization_id = %s ORDER BY id ASC;", (self.organization_id,))
            rows = cur.fetchall()
            return [self._row_to_member(r) for r in rows]

    def get_member_by_auth_id(self, auth_user_id: str) -> Optional[OrganizationMember]:
        """Resolves corporate member strictly by verified stable Supabase Auth UID (sub)."""
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM members WHERE organization_id = %s AND auth_user_id = %s LIMIT 1;", (self.organization_id, auth_user_id))
            row = cur.fetchone()
            return self._row_to_member(row) if row else None

    def link_member_auth_id(self, member_id: str, auth_user_id: str) -> bool:
        """Binds a verified stable Auth user ID to an existing company member profile."""
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute(
                "UPDATE members SET auth_user_id = %s WHERE organization_id = %s AND (id = %s OR user_id = %s);",
                (auth_user_id, self.organization_id, member_id, member_id),
            )
            return cur.rowcount > 0

    def get_member_by_user_id(self, user_id: str) -> Optional[OrganizationMember]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute(
                "SELECT * FROM members WHERE organization_id = %s AND (user_id = %s OR auth_user_id = %s OR id = %s) LIMIT 1;",
                (self.organization_id, user_id, user_id, user_id),
            )
            row = cur.fetchone()
            return self._row_to_member(row) if row else None

    def get_member_by_id(self, member_id: str) -> Optional[OrganizationMember]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM members WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, member_id))
            row = cur.fetchone()
            return self._row_to_member(row) if row else None

    def get_member_by_email(self, email: str) -> Optional[OrganizationMember]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM members WHERE organization_id = %s AND LOWER(email) = LOWER(%s) LIMIT 1;", (self.organization_id, email.strip()))
            row = cur.fetchone()
            return self._row_to_member(row) if row else None

    def update_member_role(self, member_id: str, new_role: UserRole) -> Optional[OrganizationMember]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("UPDATE members SET role = %s WHERE organization_id = %s AND id = %s;", (new_role.value, self.organization_id, member_id))
            return self.get_member_by_id(member_id)

    def update_member_status(self, member_id: str, new_status: str) -> Optional[OrganizationMember]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("UPDATE members SET status = %s WHERE organization_id = %s AND id = %s;", (new_status, self.organization_id, member_id))
            return self.get_member_by_id(member_id)

    def invite_member(self, invite: MemberInviteCreate, inviter_name: str = "Admin") -> OrganizationMember:
        member_id = f"tm-{uuid.uuid4().hex[:8]}"
        user_id = f"usr-{uuid.uuid4().hex[:8]}"
        joined_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        responsibilities_json = json.dumps(invite.responsibilities or [])

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute(
                """
                INSERT INTO members (
                    id, user_id, organization_id, name, email, role, title,
                    department_id, department, team_id, team, responsibilities,
                    reports_to_id, reports_to_name, status, assigned_projects, joined_date, is_demo
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                (
                    member_id,
                    user_id,
                    self.organization_id,
                    invite.name,
                    invite.email,
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
                    0,
                    joined_date,
                    False,
                ),
            )
            self._log_activity_raw(
                conn,
                actor_name=inviter_name,
                action_type="member_invited",
                title=f"Member Invited: {invite.name}",
                description=f"Invited {invite.name} ({invite.email}) as {invite.role.value} in {invite.department}",
                module="teams",
            )
            return self.get_member_by_id(member_id)

    def _row_to_member(self, row) -> OrganizationMember:
        responsibilities = []
        raw_resp = row["responsibilities"]
        if raw_resp:
            if isinstance(raw_resp, list):
                responsibilities = raw_resp
            elif isinstance(raw_resp, str):
                try:
                    responsibilities = json.loads(raw_resp)
                except Exception:
                    responsibilities = []

        try:
            role = UserRole(row["role"].lower())
        except ValueError:
            role = UserRole.MEMBER

        auth_user_id = None
        if "auth_user_id" in row:
            auth_user_id = row["auth_user_id"]

        return OrganizationMember(
            id=row["id"],
            user_id=row["user_id"],
            auth_user_id=auth_user_id,
            organization_id=row["organization_id"],
            name=row["name"],
            email=row["email"],
            role=role,
            title=row["title"],
            department_id=row["department_id"],
            department=row["department"],
            team_id=row["team_id"],
            team=row["team"],
            responsibilities=responsibilities,
            reports_to_id=row["reports_to_id"],
            reports_to_name=row["reports_to_name"],
            status=row["status"] or "active",
            assigned_projects=row["assigned_projects"] or 0,
            joined_date=str(row["joined_date"]),
            is_demo=bool(row["is_demo"]),
        )

    # =========================================================================
    # Corporate Knowledge Vault
    # =========================================================================
    def list_knowledge(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        allowed_classifications: Optional[List[str]] = None,
    ) -> List[KnowledgeItem]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            sql_query = "SELECT * FROM knowledge_items WHERE organization_id = %s"
            params = [self.organization_id]

            if category:
                sql_query += " AND category = %s"
                params.append(category)

            if query:
                sql_query += " AND (title ILIKE %s OR snippet ILIKE %s OR content ILIKE %s)"
                term = f"%{query}%"
                params.extend([term, term, term])

            if allowed_classifications:
                placeholders = ", ".join(["%s"] * len(allowed_classifications))
                sql_query += f" AND classification IN ({placeholders})"
                params.extend(allowed_classifications)

            sql_query += " ORDER BY is_verified DESC, updated_at DESC;"
            cur.execute(sql_query, params)
            rows = cur.fetchall()

            items = []
            for r in rows:
                tags = []
                raw_tags = r["tags"]
                if raw_tags:
                    tags = raw_tags if isinstance(raw_tags, list) else json.loads(raw_tags)
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
                        version=r["version"] or "1.0",
                        updated_at=str(r["updated_at"]),
                        author=r["author"],
                        tags=tags,
                        is_demo=bool(r["is_demo"]),
                    )
                )
            return items

    def get_knowledge_item(self, item_id: str) -> Optional[KnowledgeItem]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM knowledge_items WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, item_id))
            r = cur.fetchone()
            if not r:
                return None
            tags = []
            raw_tags = r["tags"]
            if raw_tags:
                tags = raw_tags if isinstance(raw_tags, list) else json.loads(raw_tags)
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
                version=r["version"] or "1.0",
                updated_at=str(r["updated_at"]),
                author=r["author"],
                tags=tags,
                is_demo=bool(r["is_demo"]),
            )

    def add_knowledge_item(self, item: KnowledgeItemCreate, author: str, is_verified: bool = True) -> KnowledgeItem:
        import uuid
        item_id = f"sop-{uuid.uuid4().hex[:8]}"
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)

            cur.execute("""
                INSERT INTO knowledge_items (
                    id, organization_id, title, category, snippet, content,
                    classification, is_verified, department, version, updated_at, author, tags, is_demo
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """, (
                item_id, self.organization_id, item.title, item.category, item.snippet, item.content,
                item.classification, is_verified, item.department, "1.0", now_str, author,
                json.dumps(item.tags), False,
            ))

        return self.get_knowledge_item(item_id)

    # =========================================================================
    # Projects & Operations
    # =========================================================================
    def list_projects(self) -> List[Project]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("""
                SELECT * FROM projects WHERE organization_id = %s
                ORDER BY (priority = 'critical') DESC, progress DESC;
            """, (self.organization_id,))
            rows = cur.fetchall()
            return [
                Project(
                    id=r["id"],
                    organization_id=r["organization_id"],
                    name=r["name"],
                    client=r["client"],
                    status=r["status"],
                    progress=r["progress"],
                    lead=r["lead"],
                    due_date=str(r["due_date"]),
                    priority=r["priority"],
                    department=r["department"],
                    description=r["description"],
                    is_demo=bool(r["is_demo"]),
                )
                for r in rows
            ]

    def create_project(self, project: ProjectCreate) -> Project:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            proj_id = f"prj-{datetime.now().strftime('%m%d%H%M%S%f')}"
            cur.execute("""
                INSERT INTO projects (
                    id, organization_id, name, client, status, progress, lead, due_date, priority, department, description, is_demo
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """, (
                proj_id, self.organization_id, project.name, project.client, project.status, project.progress,
                project.lead, project.due_date, project.priority, project.department, project.description, False,
            ))

            return Project(
                id=proj_id,
                organization_id=self.organization_id,
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
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM projects WHERE id = %s;", (project_id,))
            row = cur.fetchone()
            if not row:
                return None
            fields = []
            values = []
            for k, v in updates.items():
                if k in ("name", "client", "status", "progress", "lead", "due_date", "priority", "department", "description"):
                    fields.append(f"{k} = %s")
                    values.append(v)
            if fields:
                values.append(project_id)
                cur.execute(f"UPDATE projects SET {', '.join(fields)} WHERE id = %s;", tuple(values))
            cur.execute("SELECT * FROM projects WHERE id = %s;", (project_id,))
            updated = cur.fetchone()
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

    # =========================================================================
    # Tasks & Backlog
    # =========================================================================
    def list_tasks(self, status: Optional[str] = None) -> List[Task]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            if status:
                cur.execute("SELECT * FROM tasks WHERE organization_id = %s AND status = %s ORDER BY (priority = 'urgent') DESC, due_date ASC;", (self.organization_id, status))
            else:
                cur.execute("SELECT * FROM tasks WHERE organization_id = %s ORDER BY (priority = 'urgent') DESC, due_date ASC;", (self.organization_id,))
            rows = cur.fetchall()
            return [
                Task(
                    id=r["id"],
                    organization_id=r["organization_id"],
                    title=r["title"],
                    description=r["description"] or "",
                    project_id=r["project_id"],
                    project_name=r["project_name"],
                    status=r["status"],
                    priority=r["priority"],
                    assignee=r["assignee"],
                    due_date=str(r["due_date"]),
                    department=r["department"],
                    created_at=str(r["created_at"]),
                    is_demo=bool(r["is_demo"]),
                )
                for r in rows
            ]

    def create_task(self, task: TaskCreate, creator_name: str = "AUREN SOLIAN") -> Task:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            task_id = f"tsk-{datetime.now().strftime('%m%d%H%M%S%f')}"
            created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")

            cur.execute("""
                INSERT INTO tasks (
                    id, organization_id, title, description, project_id, project_name,
                    status, priority, assignee, due_date, department, created_at, is_demo
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """, (
                task_id, self.organization_id, task.title, task.description, task.project_id, task.project_name,
                task.status, task.priority, task.assignee, task.due_date, task.department, created_at, False,
            ))

            self._log_activity_raw(
                conn,
                actor_name=creator_name,
                action_type="task_created",
                title=f"Task Created: {task.title}",
                description=f"Assigned to {task.assignee} with priority {task.priority}.",
                module="tasks",
            )

            return Task(
                id=task_id,
                organization_id=self.organization_id,
                title=task.title,
                description=task.description,
                project_id=task.project_id,
                project_name=task.project_name,
                status=task.status,
                priority=task.priority,
                assignee=task.assignee,
                due_date=task.due_date,
                department=task.department,
                created_at=created_at,
                is_demo=False,
            )

    def update_task(self, task_id: str, update: TaskUpdate, actor_name: str = "Operator") -> Optional[Task]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM tasks WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, task_id))
            row = cur.fetchone()
            if not row:
                return None

            status = update.status if update.status is not None else row["status"]
            priority = update.priority if update.priority is not None else row["priority"]
            assignee = update.assignee if update.assignee is not None else row["assignee"]
            due_date = update.due_date if update.due_date is not None else row["due_date"]

            cur.execute("""
                UPDATE tasks SET status = %s, priority = %s, assignee = %s, due_date = %s, updated_at = NOW()
                WHERE organization_id = %s AND id = %s;
            """, (status, priority, assignee, due_date, self.organization_id, task_id))

            self._log_activity_raw(
                conn,
                actor_name=actor_name,
                action_type="task_updated",
                title=f"Task Updated: {row['title']}",
                description=f"Status changed to {status}.",
                module="tasks",
            )

            cur.execute("SELECT * FROM tasks WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, task_id))
            updated_row = cur.fetchone()
            return Task(
                id=updated_row["id"],
                organization_id=updated_row["organization_id"],
                title=updated_row["title"],
                description=updated_row["description"] or "",
                project_id=updated_row["project_id"],
                project_name=updated_row["project_name"],
                status=updated_row["status"],
                priority=updated_row["priority"],
                assignee=updated_row["assignee"],
                due_date=str(updated_row["due_date"]),
                department=updated_row["department"],
                created_at=str(updated_row["created_at"]),
                is_demo=bool(updated_row["is_demo"]),
            )

    # =========================================================================
    # Clients CRM
    # =========================================================================
    def list_clients(self) -> List[ClientAccount]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM clients WHERE organization_id = %s ORDER BY is_demo ASC, company_name ASC;", (self.organization_id,))
            rows = cur.fetchall()
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
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM clients WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, client_id))
            r = cur.fetchone()
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
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            client_id = f"cli-{datetime.now().strftime('%m%d%H%M')}"
            cur.execute("""
                INSERT INTO clients (id, organization_id, company_name, contact_person, email, status, contract_value, lead_account_manager, notes, is_demo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """, (
                client_id, self.organization_id, client.company_name, client.contact_person, client.email,
                client.status, client.contract_value, client.lead_account_manager, client.notes, False,
            ))

            return ClientAccount(
                id=client_id,
                organization_id=self.organization_id,
                company_name=client.company_name,
                contact_person=client.contact_person,
                email=client.email,
                status=client.status,
                contract_value=client.contract_value,
                lead_account_manager=client.lead_account_manager,
                notes=client.notes,
                is_demo=False,
            )

    # =========================================================================
    # Corporate Documents Registry
    # =========================================================================
    def list_documents(self, allowed_classifications: Optional[List[str]] = None) -> List[CorporateDocument]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            query = "SELECT * FROM documents WHERE organization_id = %s"
            params = [self.organization_id]

            if allowed_classifications:
                placeholders = ", ".join(["%s"] * len(allowed_classifications))
                query += f" AND classification IN ({placeholders})"
                params.extend(allowed_classifications)

            query += " ORDER BY is_demo ASC, updated_at DESC;"
            cur.execute(query, params)
            rows = cur.fetchall()
            return [
                CorporateDocument(
                    id=r["id"],
                    organization_id=r["organization_id"],
                    name=r["name"],
                    type=r["type"],
                    size=r["size"],
                    classification=r["classification"],
                    updated_at=str(r["updated_at"]),
                    owner=r["owner"],
                    department=r["department"],
                    is_demo=bool(r["is_demo"]),
                )
                for r in rows
            ]

    # =========================================================================
    # Workflows & Automation
    # =========================================================================
    def list_workflows(self) -> List[WorkflowRule]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM workflows WHERE organization_id = %s ORDER BY is_demo ASC, execution_count DESC;", (self.organization_id,))
            rows = cur.fetchall()
            return [
                WorkflowRule(
                    id=r["id"],
                    organization_id=r["organization_id"],
                    title=r["title"],
                    trigger=r["trigger"],
                    action=r["action"],
                    status=r["status"],
                    execution_count=r["execution_count"] or 0,
                    department=r["department"],
                    is_demo=bool(r["is_demo"]),
                )
                for r in rows
            ]

    def create_workflow(self, wf: WorkflowRuleCreate) -> WorkflowRule:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            wf_id = f"wf-{datetime.now().strftime('%m%d%H%M')}"
            cur.execute("""
                INSERT INTO workflows (id, organization_id, title, trigger, action, status, execution_count, department, is_demo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
            """, (wf_id, self.organization_id, wf.title, wf.trigger, wf.action, "active", 0, wf.department, False))

            return WorkflowRule(
                id=wf_id,
                organization_id=self.organization_id,
                title=wf.title,
                trigger=wf.trigger,
                action=wf.action,
                status="active",
                execution_count=0,
                department=wf.department,
                is_demo=False,
            )

    # =========================================================================
    # Activities & Dashboard
    # =========================================================================
    def list_activities(self, limit: int = 10) -> List[CompanyActivityEvent]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM company_activities WHERE organization_id = %s ORDER BY timestamp DESC LIMIT %s;", (self.organization_id, limit))
            rows = cur.fetchall()
            return [
                CompanyActivityEvent(
                    id=r["id"],
                    actor_name=r["actor_name"],
                    action_type=r["action_type"],
                    title=r["title"],
                    description=r["description"],
                    timestamp=str(r["timestamp"]),
                    module=r["module"],
                )
                for r in rows
            ]

    def _log_activity_raw(self, conn, actor_name: str, action_type: str, title: str, description: str, module: str):
        act_id = f"act-{datetime.now().strftime('%m%d%H%M%S%f')}"
        now_str = datetime.now(timezone.utc).isoformat()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO company_activities (id, organization_id, actor_name, action_type, title, description, timestamp, module, is_demo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (act_id, self.organization_id, actor_name, action_type, title, description, now_str, module, False))

    def log_activity(self, actor_name: str, action_type: str, title: str, description: str, module: str):
        with db_manager.connection() as conn:
            self._log_activity_raw(conn, actor_name, action_type, title, description, module)

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

        velocity_val = "+18.4%" if projects else "0%"

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

    # =========================================================================
    # Meetings & Governance Minutes Operations
    # =========================================================================
    def _row_to_meeting(self, row) -> Meeting:
        def _parse_field(val):
            if val is None:
                return []
            if isinstance(val, list):
                return val
            try:
                return json.loads(val)
            except Exception:
                return []

        agenda = _parse_field(row.get("agenda"))
        attendees = _parse_field(row.get("attendees"))
        raw_decisions = _parse_field(row.get("decisions"))
        decisions = [MeetingDecision(**d) if isinstance(d, dict) else d for d in raw_decisions]
        raw_actions = _parse_field(row.get("action_items"))
        action_items = [MeetingActionItem(**a) if isinstance(a, dict) else a for a in raw_actions]

        return Meeting(
            id=row["id"],
            organization_id=row["organization_id"],
            title=row["title"],
            meeting_type=row["meeting_type"],
            organizer_name=row["organizer_name"],
            organizer_id=row.get("organizer_id"),
            date=str(row["date"]),
            time=str(row["time"]),
            duration_minutes=row.get("duration_minutes") or 60,
            location=row.get("location"),
            virtual_link=row.get("virtual_link"),
            related_project_id=row.get("related_project_id"),
            related_client_id=row.get("related_client_id"),
            agenda=agenda,
            discussion_notes=row.get("discussion_notes") or "",
            decisions=decisions,
            attendees=attendees,
            action_items=action_items,
            status=row.get("status") or "scheduled",
            created_at=str(row.get("created_at") or ""),
            is_demo=bool(row.get("is_demo")),
        )

    def list_meetings(self, status: Optional[str] = None, meeting_type: Optional[str] = None) -> List[Meeting]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            query = "SELECT * FROM meetings WHERE organization_id = %s"
            params: List[Any] = [self.organization_id]
            if status:
                query += " AND status = %s"
                params.append(status)
            if meeting_type:
                query += " AND meeting_type = %s"
                params.append(meeting_type)
            query += " ORDER BY date ASC, time ASC;"
            cur.execute(query, params)
            rows = cur.fetchall()
            return [self._row_to_meeting(r) for r in rows]

    def get_meeting(self, meeting_id: str) -> Optional[Meeting]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM meetings WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, meeting_id))
            row = cur.fetchone()
            return self._row_to_meeting(row) if row else None

    def create_meeting(self, meeting: MeetingCreate, organizer_name: str, organizer_id: Optional[str] = None) -> Meeting:
        meeting_id = f"mtg-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        agenda_json = json.dumps(meeting.agenda or [])
        attendees_json = json.dumps(meeting.attendees or [])

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute(
                """
                INSERT INTO meetings (
                    id, organization_id, title, meeting_type, organizer_name, organizer_id,
                    date, time, duration_minutes, location, virtual_link,
                    related_project_id, related_client_id, agenda, discussion_notes,
                    decisions, attendees, action_items, status, created_at, is_demo
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                (
                    meeting_id,
                    self.organization_id,
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
                    False,
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
        return self.get_meeting(meeting_id)

    def update_meeting(self, meeting_id: str, update: MeetingUpdate) -> Optional[Meeting]:
        existing = self.get_meeting(meeting_id)
        if not existing:
            return None

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            updates = []
            params = []
            if update.title is not None:
                updates.append("title = %s")
                params.append(update.title)
            if update.status is not None:
                updates.append("status = %s")
                params.append(update.status)
            if update.discussion_notes is not None:
                updates.append("discussion_notes = %s")
                params.append(update.discussion_notes)
            if update.agenda is not None:
                updates.append("agenda = %s")
                params.append(json.dumps(update.agenda))
            if update.attendees is not None:
                updates.append("attendees = %s")
                params.append(json.dumps(update.attendees))
            if update.decisions is not None:
                updates.append("decisions = %s")
                params.append(json.dumps([d.model_dump() for d in update.decisions]))
            if update.action_items is not None:
                updates.append("action_items = %s")
                params.append(json.dumps([a.model_dump() for a in update.action_items]))

            if updates:
                params.extend([self.organization_id, meeting_id])
                cur.execute(f"UPDATE meetings SET {', '.join(updates)} WHERE organization_id = %s AND id = %s;", params)

        return self.get_meeting(meeting_id)

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

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute(
                "UPDATE meetings SET action_items = %s WHERE organization_id = %s AND id = %s;",
                (json.dumps([a.model_dump() for a in meeting.action_items]), self.organization_id, meeting_id),
            )
            self._log_activity_raw(
                conn,
                actor_name=meeting.organizer_name,
                action_type="action_converted_to_task",
                title=f"Converted Action Item to Task: {created_task.title}",
                description=f"Action item from meeting '{meeting.title}' linked to Task ID {created_task.id}.",
                module="meetings",
            )

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

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute(
                "UPDATE meetings SET decisions = %s WHERE organization_id = %s AND id = %s;",
                (json.dumps([d.model_dump() for d in meeting.decisions]), self.organization_id, meeting_id),
            )
            self._log_activity_raw(
                conn,
                actor_name=author_name,
                action_type="decision_published_to_knowledge",
                title=f"Published Decision to Knowledge Vault: {created_knowledge.title}",
                description=f"Meeting decision published into corporate Knowledge Vault under Governance.",
                module="meetings",
            )

        return created_knowledge

    # =========================================================================
    # Discussions & Threads
    # =========================================================================
    def _row_to_discussion(self, row) -> DiscussionMessage:
        return DiscussionMessage(
            id=row["id"],
            organization_id=row["organization_id"],
            channel_type=row["channel_type"],
            channel_id=row["channel_id"],
            channel_name=row["channel_name"],
            author_id=row["author_id"],
            author_name=row["author_name"],
            author_role=row["author_role"],
            title=row.get("title"),
            content=row["content"],
            parent_id=row.get("parent_id"),
            is_pinned=bool(row.get("is_pinned")),
            created_at=str(row["created_at"]),
            is_demo=bool(row.get("is_demo")),
        )

    def list_discussions(
        self,
        channel_id: Optional[str] = None,
        channel_type: Optional[str] = None,
        parent_id: Optional[str] = None,
    ) -> List[DiscussionMessage]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            query = "SELECT * FROM discussions WHERE organization_id = %s"
            params: List[Any] = [self.organization_id]
            if channel_id:
                query += " AND channel_id = %s"
                params.append(channel_id)
            if channel_type:
                query += " AND channel_type = %s"
                params.append(channel_type)
            if parent_id is not None:
                if parent_id == "":
                    query += " AND parent_id IS NULL"
                else:
                    query += " AND parent_id = %s"
                    params.append(parent_id)

            query += " ORDER BY is_pinned DESC, created_at ASC;"
            cur.execute(query, params)
            rows = cur.fetchall()
            return [self._row_to_discussion(r) for r in rows]

    def create_discussion(
        self,
        msg: DiscussionMessageCreate,
        author_id: str,
        author_name: str,
        author_role: str = "member",
    ) -> DiscussionMessage:
        msg_id = f"dsc-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute(
                """
                INSERT INTO discussions (
                    id, organization_id, channel_type, channel_id, channel_name,
                    author_id, author_name, author_role, title, content,
                    parent_id, is_pinned, created_at, is_demo
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                (
                    msg_id,
                    self.organization_id,
                    msg.channel_type,
                    msg.channel_id,
                    msg.channel_name,
                    author_id,
                    author_name,
                    author_role,
                    msg.title,
                    msg.content,
                    msg.parent_id,
                    msg.is_pinned,
                    now_iso,
                    False,
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

        cur_msg = self.list_discussions(channel_id=msg.channel_id)
        for m in cur_msg:
            if m.id == msg_id:
                return m
        return DiscussionMessage(
            id=msg_id,
            organization_id=self.organization_id,
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

    def list_discussion_channels(self) -> List[DiscussionChannel]:
        channels = [
            DiscussionChannel(id="general", name="General Announcements", type="company", description="Company-wide announcements and operational briefings.", message_count=0),
            DiscussionChannel(id="dept-eng", name="Engineering & AI Operations", type="department", description="Technical architectural discussions, sprint updates, and mesh health.", message_count=0),
            DiscussionChannel(id="dept-strat", name="Strategic Advisory & Accounts", type="department", description="Client relations, contract updates, and advisory deliverables.", message_count=0),
            DiscussionChannel(id="dept-arch", name="Product Architecture & Governance", type="department", description="Security classifications, RBAC boundary reviews, and audits.", message_count=0),
            DiscussionChannel(id="exec-council", name="Executive Leadership Council", type="company", description="High-trust governance, capital allocation, and executive strategy.", message_count=0),
        ]
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT channel_id, COUNT(*) as count FROM discussions WHERE organization_id = %s GROUP BY channel_id;", (self.organization_id,))
            counts = {r["channel_id"]: r["count"] for r in cur.fetchall()}

        for ch in channels:
            ch.message_count = counts.get(ch.id, 0)

        return channels

    # =========================================================================
    # Notifications & Dispatch Center
    # =========================================================================
    def _row_to_notification(self, row) -> NotificationItem:
        return NotificationItem(
            id=row["id"],
            organization_id=row["organization_id"],
            user_id=row["user_id"],
            title=row["title"],
            message=row["message"],
            type=row["type"],
            link_module=row.get("link_module"),
            link_id=row.get("link_id"),
            is_read=bool(row.get("is_read")),
            priority=row.get("priority") or "normal",
            created_at=str(row["created_at"]),
        )

    def list_notifications(self, user_id: str, unread_only: bool = False) -> List[NotificationItem]:
        member = self.get_member_by_user_id(user_id) or self.get_member_by_id(user_id)
        u_ids = [user_id]
        if member:
            u_ids.extend([member.user_id, member.id])
        u_ids = list(set(u_ids))

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            placeholders = " OR ".join(["user_id = %s"] * len(u_ids))
            sql = f"SELECT * FROM notifications WHERE organization_id = %s AND ({placeholders} OR user_id = 'all')"
            params: List[Any] = [self.organization_id] + list(u_ids)
            if unread_only:
                sql += " AND is_read = FALSE"
            sql += " ORDER BY created_at DESC LIMIT 50;"
            cur.execute(sql, params)
            rows = cur.fetchall()
            return [self._row_to_notification(r) for r in rows]

    def create_notification(self, notif: NotificationCreate) -> NotificationItem:
        notif_id = f"notif-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute(
                """
                INSERT INTO notifications (
                    id, organization_id, user_id, title, message, type,
                    link_module, link_id, is_read, priority, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                (
                    notif_id,
                    self.organization_id,
                    notif.user_id,
                    notif.title,
                    notif.message,
                    notif.type,
                    notif.link_module,
                    notif.link_id,
                    False,
                    notif.priority,
                    now_iso,
                ),
            )
        return NotificationItem(
            id=notif_id,
            organization_id=self.organization_id,
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

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            placeholders = " OR ".join(["user_id = %s"] * len(u_ids))
            cur.execute(
                f"UPDATE notifications SET is_read = TRUE WHERE organization_id = %s AND id = %s AND ({placeholders} OR user_id = 'all');",
                [self.organization_id, notification_id] + u_ids,
            )
            return cur.rowcount > 0

    def mark_all_notifications_read(self, user_id: str) -> int:
        member = self.get_member_by_user_id(user_id) or self.get_member_by_id(user_id)
        u_ids = [user_id]
        if member:
            u_ids.extend([member.user_id, member.id])
        u_ids = list(set(u_ids))

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            placeholders = " OR ".join(["user_id = %s"] * len(u_ids))
            cur.execute(
                f"UPDATE notifications SET is_read = TRUE WHERE organization_id = %s AND ({placeholders} OR user_id = 'all') AND is_read = FALSE;",
                [self.organization_id] + u_ids,
            )
            return cur.rowcount

    # =========================================================================
    # Cross-Workspace Capabilities: Unified Search & Operational Calendar
    # =========================================================================
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

        members = [m for m in self.list_members() if q in m.name.lower() or q in m.email.lower() or q in m.title.lower()]
        projects = [p for p in self.list_projects() if q in p.name.lower() or (p.description and q in p.description.lower())]
        tasks = [t for t in self.list_tasks() if q in t.title.lower() or (t.description and q in t.description.lower())]
        clients = [c for c in self.list_clients() if q in c.company_name.lower() or q in c.contact_person.lower() or q in c.email.lower()]
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

    def _row_to_account(self, row: dict) -> FinancialAccount:
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
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
        )

    def _row_to_transaction(self, row: dict) -> FinancialTransaction:
        return FinancialTransaction(
            id=row["id"],
            reference=row["reference"],
            organization_id=row["organization_id"],
            transaction_type=row["transaction_type"],
            date=str(row["date"]),
            description=row["description"],
            amount=float(row["amount"]),
            currency=row["currency"],
            account_id=row["account_id"],
            account_name=row.get("account_name"),
            destination_account_id=row.get("destination_account_id"),
            destination_account_name=row.get("destination_account_name"),
            category=row["category"],
            project_id=row.get("project_id"),
            project_name=row.get("project_name"),
            client_id=row.get("client_id"),
            client_name=row.get("client_name"),
            invoice_id=row.get("invoice_id"),
            payable_id=row.get("payable_id"),
            payment_method=row["payment_method"],
            status=row["status"],
            recorded_by_id=row["recorded_by_id"],
            recorded_by_name=row["recorded_by_name"],
            supporting_document_url=row.get("supporting_document_url"),
            notes=row.get("notes"),
            is_demo=bool(row["is_demo"]),
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
        )

    def _row_to_invoice(self, row: dict) -> Invoice:
        raw_items = row.get("items")
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
            project_id=row.get("project_id"),
            project_name=row.get("project_name"),
            issue_date=str(row["issue_date"]),
            due_date=str(row["due_date"]),
            items=items,
            subtotal=float(row["subtotal"]),
            tax_rate=float(row["tax_rate"]),
            tax_amount=float(row["tax_amount"]),
            total_amount=float(row["total_amount"]),
            amount_paid=float(row["amount_paid"]),
            balance_due=float(row["balance_due"]),
            currency=row["currency"],
            status=row["status"],
            notes=row.get("notes"),
            terms=row.get("terms"),
            created_by=row["created_by"],
            is_demo=bool(row["is_demo"]),
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
        )

    def _row_to_payable(self, row: dict) -> AccountsPayable:
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
            due_date=str(row["due_date"]),
            project_id=row.get("project_id"),
            project_name=row.get("project_name"),
            status=row["status"],
            supporting_document_url=row.get("supporting_document_url"),
            notes=row.get("notes"),
            created_by=row["created_by"],
            is_demo=bool(row["is_demo"]),
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
        )

    def _row_to_budget(self, row: dict) -> FinancialBudget:
        allocated = float(row["allocated_amount"])
        spent = float(row["spent_amount"])
        remaining = max(0.0, allocated - spent)
        pct = round((spent / allocated * 100.0), 1) if allocated > 0 else 0.0
        return FinancialBudget(
            id=row["id"],
            organization_id=row["organization_id"],
            name=row["name"],
            period=row["period"],
            start_date=str(row["start_date"]),
            end_date=str(row["end_date"]),
            category=row.get("category"),
            project_id=row.get("project_id"),
            project_name=row.get("project_name"),
            department=row.get("department"),
            allocated_amount=allocated,
            spent_amount=spent,
            remaining_amount=remaining,
            utilization_percentage=pct,
            currency=row["currency"],
            status=row["status"],
            created_by=row["created_by"],
            notes=row.get("notes"),
            is_demo=bool(row["is_demo"]),
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
        )

    def _row_to_expense_request(self, row: dict) -> ExpenseRequest:
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
            project_id=row.get("project_id"),
            project_name=row.get("project_name"),
            department=row.get("department"),
            urgency=row["urgency"],
            status=row["status"],
            reviewed_by_id=row.get("reviewed_by_id"),
            reviewed_by_name=row.get("reviewed_by_name"),
            review_comments=row.get("review_comments"),
            reviewed_at=str(row["reviewed_at"]) if row.get("reviewed_at") else None,
            transaction_id=row.get("transaction_id"),
            supporting_document_url=row.get("supporting_document_url"),
            is_demo=bool(row["is_demo"]),
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
        )

    # Accounts
    def list_financial_accounts(self, include_archived: bool = False) -> List[FinancialAccount]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            if include_archived:
                cur.execute("SELECT * FROM financial_accounts WHERE organization_id = %s ORDER BY created_at ASC;", (self.organization_id,))
            else:
                cur.execute("SELECT * FROM financial_accounts WHERE organization_id = %s AND status != 'archived' ORDER BY created_at ASC;", (self.organization_id,))
            rows = cur.fetchall()
            return [self._row_to_account(r) for r in rows]

    def get_financial_account(self, account_id: str) -> Optional[FinancialAccount]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM financial_accounts WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, account_id))
            row = cur.fetchone()
            return self._row_to_account(row) if row else None

    def create_financial_account(self, acc: FinancialAccountCreate) -> FinancialAccount:
        now_iso = datetime.now(timezone.utc).isoformat()
        acc_id = f"acc-{uuid.uuid4().hex[:8]}"
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute(
                """INSERT INTO financial_accounts 
                   (id, organization_id, name, account_type, account_number, currency, opening_balance, current_balance, status, description, is_demo, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'active', %s, FALSE, %s, %s);""",
                (acc_id, self.organization_id, acc.name, acc.account_type, acc.account_number, acc.currency, acc.opening_balance, acc.opening_balance, acc.description, now_iso, now_iso),
            )
            self._log_activity_raw(conn, "AUREN SOLIAN", "account_created", f"Created Account: {acc.name}", f"Type: {acc.account_type}, Opening: {acc.opening_balance} {acc.currency}", "finance")
        return self.get_financial_account(acc_id)

    def update_financial_account(self, account_id: str, update: FinancialAccountUpdate) -> Optional[FinancialAccount]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM financial_accounts WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, account_id))
            row = cur.fetchone()
            if not row:
                return None
            name = update.name if update.name is not None else row["name"]
            status = update.status if update.status is not None else row["status"]
            desc = update.description if update.description is not None else row["description"]
            cur.execute(
                "UPDATE financial_accounts SET name = %s, status = %s, description = %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                (name, status, desc, now_iso, self.organization_id, account_id),
            )
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
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
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
                WHERE t.organization_id = %s
            """
            params = [self.organization_id]
            if account_id:
                query += " AND (t.account_id = %s OR t.destination_account_id = %s)"
                params.extend([account_id, account_id])
            if transaction_type:
                query += " AND t.transaction_type = %s"
                params.append(transaction_type)
            if category:
                query += " AND t.category = %s"
                params.append(category)
            if project_id:
                query += " AND t.project_id = %s"
                params.append(project_id)
            if client_id:
                query += " AND t.client_id = %s"
                params.append(client_id)
            query += " ORDER BY t.date DESC, t.created_at DESC LIMIT %s"
            params.append(limit)
            cur.execute(query, params)
            rows = cur.fetchall()
            return [self._row_to_transaction(r) for r in rows]

    def get_transaction(self, tx_id: str) -> Optional[FinancialTransaction]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
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
                WHERE t.organization_id = %s AND t.id = %s LIMIT 1
            """
            cur.execute(query, (self.organization_id, tx_id))
            row = cur.fetchone()
            return self._row_to_transaction(row) if row else None

    def create_transaction(
        self,
        tx: FinancialTransactionCreate,
        recorded_by_id: str = "tm-1",
        recorded_by_name: str = "AUREN SOLIAN"
    ) -> FinancialTransaction:
        now_iso = datetime.now(timezone.utc).isoformat()
        tx_id = f"tx-{uuid.uuid4().hex[:8]}"
        ref = f"TX-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:6].upper()}"

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            # 1. Update source account balance
            if tx.transaction_type == "income":
                cur.execute(
                    "UPDATE financial_accounts SET current_balance = current_balance + %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                    (tx.amount, now_iso, self.organization_id, tx.account_id),
                )
            elif tx.transaction_type == "expense":
                cur.execute(
                    "UPDATE financial_accounts SET current_balance = current_balance - %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                    (tx.amount, now_iso, self.organization_id, tx.account_id),
                )
            elif tx.transaction_type == "transfer":
                if not tx.destination_account_id:
                    raise ValueError("Transfer requires destination_account_id")
                cur.execute(
                    "UPDATE financial_accounts SET current_balance = current_balance - %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                    (tx.amount, now_iso, self.organization_id, tx.account_id),
                )
                cur.execute(
                    "UPDATE financial_accounts SET current_balance = current_balance + %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                    (tx.amount, now_iso, self.organization_id, tx.destination_account_id),
                )

            # 2. If it's an expense and has a project/category, update matching budget spent_amount
            if tx.transaction_type == "expense":
                if tx.project_id:
                    cur.execute(
                        "UPDATE financial_budgets SET spent_amount = spent_amount + %s, updated_at = %s WHERE organization_id = %s AND project_id = %s AND status = 'active';",
                        (tx.amount, now_iso, self.organization_id, tx.project_id),
                    )
                elif tx.category:
                    cur.execute(
                        "UPDATE financial_budgets SET spent_amount = spent_amount + %s, updated_at = %s WHERE organization_id = %s AND category = %s AND status = 'active';",
                        (tx.amount, now_iso, self.organization_id, tx.category),
                    )

            # 3. Insert transaction
            cur.execute(
                """INSERT INTO financial_transactions 
                   (id, reference, organization_id, transaction_type, date, description, amount, currency,
                    account_id, destination_account_id, category, project_id, client_id, invoice_id,
                    payable_id, payment_method, status, recorded_by_id, recorded_by_name,
                    supporting_document_url, notes, is_demo, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'completed', %s, %s, %s, %s, FALSE, %s, %s);""",
                (tx_id, ref, self.organization_id, tx.transaction_type, tx.date, tx.description, tx.amount,
                 tx.currency, tx.account_id, tx.destination_account_id, tx.category, tx.project_id,
                 tx.client_id, tx.invoice_id, tx.payable_id, tx.payment_method, recorded_by_id,
                 recorded_by_name, tx.supporting_document_url, tx.notes, now_iso, now_iso),
            )
            self._log_activity_raw(conn, recorded_by_name, "transaction_recorded", f"Recorded {tx.transaction_type.capitalize()}: {tx.amount:,.2f} {tx.currency}", tx.description, "finance")

        return self.get_transaction(tx_id)

    def reverse_transaction(
        self,
        tx_id: str,
        actor_id: str = "tm-1",
        actor_name: str = "AUREN SOLIAN",
        reason: str = "Administrative correction"
    ) -> Optional[FinancialTransaction]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM financial_transactions WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, tx_id))
            row = cur.fetchone()
            if not row or row["status"] == "reversed":
                return self.get_transaction(tx_id) if row else None

            amount = float(row["amount"])
            tx_type = row["transaction_type"]
            acc_id = row["account_id"]
            dest_acc_id = row.get("destination_account_id")

            if tx_type == "income":
                cur.execute(
                    "UPDATE financial_accounts SET current_balance = current_balance - %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                    (amount, now_iso, self.organization_id, acc_id),
                )
            elif tx_type == "expense":
                cur.execute(
                    "UPDATE financial_accounts SET current_balance = current_balance + %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                    (amount, now_iso, self.organization_id, acc_id),
                )
                if row.get("project_id"):
                    cur.execute(
                        "UPDATE financial_budgets SET spent_amount = GREATEST(0.0, spent_amount - %s), updated_at = %s WHERE organization_id = %s AND project_id = %s;",
                        (amount, now_iso, self.organization_id, row["project_id"]),
                    )
            elif tx_type == "transfer":
                cur.execute(
                    "UPDATE financial_accounts SET current_balance = current_balance + %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                    (amount, now_iso, self.organization_id, acc_id),
                )
                if dest_acc_id:
                    cur.execute(
                        "UPDATE financial_accounts SET current_balance = current_balance - %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                        (amount, now_iso, self.organization_id, dest_acc_id),
                    )

            rev_note = f"REVERSED by {actor_name} on {now_iso[:10]}. Reason: {reason}. " + (row.get("notes") or "")
            cur.execute(
                "UPDATE financial_transactions SET status = 'reversed', notes = %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                (rev_note, now_iso, self.organization_id, tx_id),
            )
            self._log_activity_raw(conn, actor_name, "transaction_reversed", f"Reversed Transaction {row['reference']}", f"Amount: {amount} - Reason: {reason}", "finance")

        return self.get_transaction(tx_id)

    # Invoices
    def list_invoices(
        self,
        status: Optional[str] = None,
        client_id: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> List[Invoice]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            query = "SELECT * FROM invoices WHERE organization_id = %s"
            params = [self.organization_id]
            if status:
                query += " AND status = %s"
                params.append(status)
            if client_id:
                query += " AND client_id = %s"
                params.append(client_id)
            if project_id:
                query += " AND project_id = %s"
                params.append(project_id)
            query += " ORDER BY issue_date DESC, created_at DESC;"
            cur.execute(query, params)
            rows = cur.fetchall()
            return [self._row_to_invoice(r) for r in rows]

    def get_invoice(self, invoice_id: str) -> Optional[Invoice]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM invoices WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, invoice_id))
            row = cur.fetchone()
            return self._row_to_invoice(row) if row else None

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

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute(
                """INSERT INTO invoices 
                   (id, organization_id, invoice_number, client_id, client_name, project_id, project_name,
                    issue_date, due_date, items, subtotal, tax_rate, tax_amount, total_amount,
                    amount_paid, balance_due, currency, status, notes, terms, created_by, is_demo,
                    created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0.0, %s, %s, 'issued', %s, %s, %s, FALSE, %s, %s);""",
                (inv_id, self.organization_id, inv_num, inv.client_id, client_name, inv.project_id, project_name,
                 inv.issue_date, inv.due_date, items_json, subtotal, inv.tax_rate, tax_amount, total_amount,
                 balance_due, inv.currency, inv.notes, inv.terms, creator_name, now_iso, now_iso),
            )
            self._log_activity_raw(conn, creator_name, "invoice_issued", f"Issued Invoice {inv_num}", f"Client: {client_name}, Total: {total_amount:,.2f} {inv.currency}", "finance")

        return self.get_invoice(inv_id)

    def update_invoice(self, invoice_id: str, update: InvoiceUpdate) -> Optional[Invoice]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM invoices WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, invoice_id))
            row = cur.fetchone()
            if not row:
                return None
            due_date = update.due_date if update.due_date is not None else row["due_date"]
            status = update.status if update.status is not None else row["status"]
            notes = update.notes if update.notes is not None else row["notes"]
            terms = update.terms if update.terms is not None else row["terms"]
            cur.execute(
                "UPDATE invoices SET due_date = %s, status = %s, notes = %s, terms = %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                (due_date, status, notes, terms, now_iso, self.organization_id, invoice_id),
            )
        return self.get_invoice(invoice_id)

    def record_invoice_payment(
        self,
        invoice_id: str,
        payment: InvoicePaymentRecord,
        recorded_by_id: str = "tm-1",
        recorded_by_name: str = "AUREN SOLIAN"
    ) -> Optional[Invoice]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM invoices WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, invoice_id))
            row = cur.fetchone()
            if not row:
                return None

            total = float(row["total_amount"])
            cur_paid = float(row["amount_paid"])
            new_paid = cur_paid + payment.amount
            new_balance = max(0.0, total - new_paid)
            new_status = "paid" if new_balance <= 0.01 else "partially_paid"

            cur.execute(
                "UPDATE invoices SET amount_paid = %s, balance_due = %s, status = %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                (new_paid, new_balance, new_status, now_iso, self.organization_id, invoice_id),
            )

            # Atomically update account balance
            cur.execute(
                "UPDATE financial_accounts SET current_balance = current_balance + %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                (payment.amount, now_iso, self.organization_id, payment.account_id),
            )

            # Insert corresponding income transaction
            tx_id = f"tx-{uuid.uuid4().hex[:8]}"
            ref = payment.payment_reference or f"TX-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:6].upper()}"
            desc = f"Payment received for {row['invoice_number']} ({row['client_name']})"
            cur.execute(
                """INSERT INTO financial_transactions 
                   (id, reference, organization_id, transaction_type, date, description, amount, currency,
                    account_id, destination_account_id, category, project_id, client_id, invoice_id,
                    payable_id, payment_method, status, recorded_by_id, recorded_by_name,
                    supporting_document_url, notes, is_demo, created_at, updated_at)
                   VALUES (%s, %s, %s, 'income', %s, %s, %s, %s, %s, NULL, 'Client Payment', %s, %s, %s, NULL, %s, 'completed', %s, %s, NULL, %s, FALSE, %s, %s);""",
                (tx_id, ref, self.organization_id, payment.date, desc, payment.amount, row["currency"],
                 payment.account_id, row.get("project_id"), row.get("client_id"), invoice_id, payment.payment_method,
                 recorded_by_id, recorded_by_name, payment.notes, now_iso, now_iso),
            )
            self._log_activity_raw(conn, recorded_by_name, "invoice_payment", f"Payment on {row['invoice_number']}: {payment.amount:,.2f} {row['currency']}", f"Status: {new_status}, Balance: {new_balance:,.2f}", "finance")

        return self.get_invoice(invoice_id)

    # Payables
    def list_payables(
        self,
        status: Optional[str] = None,
        category: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> List[AccountsPayable]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            query = "SELECT * FROM accounts_payable WHERE organization_id = %s"
            params = [self.organization_id]
            if status:
                query += " AND status = %s"
                params.append(status)
            if category:
                query += " AND category = %s"
                params.append(category)
            if project_id:
                query += " AND project_id = %s"
                params.append(project_id)
            query += " ORDER BY due_date ASC, created_at DESC;"
            cur.execute(query, params)
            rows = cur.fetchall()
            return [self._row_to_payable(r) for r in rows]

    def get_payable(self, payable_id: str) -> Optional[AccountsPayable]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM accounts_payable WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, payable_id))
            row = cur.fetchone()
            return self._row_to_payable(row) if row else None

    def create_payable(self, payable: AccountsPayableCreate, creator_name: str = "AUREN SOLIAN") -> AccountsPayable:
        now_iso = datetime.now(timezone.utc).isoformat()
        p_id = f"ap-{uuid.uuid4().hex[:8]}"
        ref = payable.reference or f"BILL-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:4].upper()}"

        project_name = None
        if payable.project_id:
            p = self.get_project(payable.project_id)
            if p:
                project_name = p.name

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute(
                """INSERT INTO accounts_payable
                   (id, organization_id, reference, supplier_name, description, category, amount_due,
                    amount_paid, balance_due, currency, due_date, project_id, project_name, status,
                    supporting_document_url, notes, created_by, is_demo, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, 0.0, %s, %s, %s, %s, %s, 'pending', %s, %s, %s, FALSE, %s, %s);""",
                (p_id, self.organization_id, ref, payable.supplier_name, payable.description, payable.category,
                 payable.amount_due, payable.amount_due, payable.currency, payable.due_date, payable.project_id,
                 project_name, payable.supporting_document_url, payable.notes, creator_name, now_iso, now_iso),
            )
            self._log_activity_raw(conn, creator_name, "payable_recorded", f"Recorded Bill {ref}: {payable.supplier_name}", f"Amount: {payable.amount_due:,.2f} {payable.currency}", "finance")

        return self.get_payable(p_id)

    def update_payable(self, payable_id: str, update: AccountsPayableUpdate) -> Optional[AccountsPayable]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM accounts_payable WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, payable_id))
            row = cur.fetchone()
            if not row:
                return None
            desc = update.description if update.description is not None else row["description"]
            due_date = update.due_date if update.due_date is not None else row["due_date"]
            status = update.status if update.status is not None else row["status"]
            notes = update.notes if update.notes is not None else row["notes"]
            cur.execute(
                "UPDATE accounts_payable SET description = %s, due_date = %s, status = %s, notes = %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                (desc, due_date, status, notes, now_iso, self.organization_id, payable_id),
            )
        return self.get_payable(payable_id)

    def record_payable_payment(
        self,
        payable_id: str,
        payment: AccountsPayablePaymentRecord,
        recorded_by_id: str = "tm-1",
        recorded_by_name: str = "AUREN SOLIAN"
    ) -> Optional[AccountsPayable]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM accounts_payable WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, payable_id))
            row = cur.fetchone()
            if not row:
                return None

            total = float(row["amount_due"])
            cur_paid = float(row["amount_paid"])
            new_paid = cur_paid + payment.amount
            new_balance = max(0.0, total - new_paid)
            new_status = "paid" if new_balance <= 0.01 else "partially_paid"

            cur.execute(
                "UPDATE accounts_payable SET amount_paid = %s, balance_due = %s, status = %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                (new_paid, new_balance, new_status, now_iso, self.organization_id, payable_id),
            )

            # Atomically update account balance (deduct)
            cur.execute(
                "UPDATE financial_accounts SET current_balance = current_balance - %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                (payment.amount, now_iso, self.organization_id, payment.account_id),
            )

            # Insert corresponding expense transaction
            tx_id = f"tx-{uuid.uuid4().hex[:8]}"
            ref = payment.payment_reference or f"TX-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:6].upper()}"
            desc = f"Settled payable {row['reference']} ({row['supplier_name']})"
            cur.execute(
                """INSERT INTO financial_transactions 
                   (id, reference, organization_id, transaction_type, date, description, amount, currency,
                    account_id, destination_account_id, category, project_id, client_id, invoice_id,
                    payable_id, payment_method, status, recorded_by_id, recorded_by_name,
                    supporting_document_url, notes, is_demo, created_at, updated_at)
                   VALUES (%s, %s, %s, 'expense', %s, %s, %s, %s, %s, NULL, %s, %s, NULL, NULL, %s, %s, 'completed', %s, %s, NULL, %s, FALSE, %s, %s);""",
                (tx_id, ref, self.organization_id, payment.date, desc, payment.amount, row["currency"],
                 payment.account_id, row["category"], row.get("project_id"), payable_id, payment.payment_method,
                 recorded_by_id, recorded_by_name, payment.notes, now_iso, now_iso),
            )
            self._log_activity_raw(conn, recorded_by_name, "payable_payment", f"Settled Bill {row['reference']}: {payment.amount:,.2f} {row['currency']}", f"Supplier: {row['supplier_name']}, Status: {new_status}", "finance")

        return self.get_payable(payable_id)

    # Budgets
    def list_budgets(
        self,
        status: Optional[str] = None,
        period: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> List[FinancialBudget]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            query = "SELECT * FROM financial_budgets WHERE organization_id = %s"
            params = [self.organization_id]
            if status:
                query += " AND status = %s"
                params.append(status)
            if period:
                query += " AND period = %s"
                params.append(period)
            if project_id:
                query += " AND project_id = %s"
                params.append(project_id)
            query += " ORDER BY start_date DESC, created_at DESC;"
            cur.execute(query, params)
            rows = cur.fetchall()
            return [self._row_to_budget(r) for r in rows]

    def get_budget(self, budget_id: str) -> Optional[FinancialBudget]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM financial_budgets WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, budget_id))
            row = cur.fetchone()
            return self._row_to_budget(row) if row else None

    def create_budget(self, budget: FinancialBudgetCreate, creator_name: str = "AUREN SOLIAN") -> FinancialBudget:
        now_iso = datetime.now(timezone.utc).isoformat()
        b_id = f"bgt-{uuid.uuid4().hex[:8]}"

        project_name = None
        if budget.project_id:
            p = self.get_project(budget.project_id)
            if p:
                project_name = p.name

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute(
                """INSERT INTO financial_budgets
                   (id, organization_id, name, period, start_date, end_date, category, project_id,
                    project_name, department, allocated_amount, spent_amount, currency, status,
                    created_by, notes, is_demo, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0.0, %s, 'active', %s, %s, FALSE, %s, %s);""",
                (b_id, self.organization_id, budget.name, budget.period, budget.start_date, budget.end_date,
                 budget.category, budget.project_id, project_name, budget.department, budget.allocated_amount,
                 budget.currency, creator_name, budget.notes, now_iso, now_iso),
            )
            self._log_activity_raw(conn, creator_name, "budget_created", f"Created Budget: {budget.name}", f"Allocation: {budget.allocated_amount:,.2f} {budget.currency}", "finance")

        return self.get_budget(b_id)

    def update_budget(self, budget_id: str, update: FinancialBudgetUpdate) -> Optional[FinancialBudget]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM financial_budgets WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, budget_id))
            row = cur.fetchone()
            if not row:
                return None
            name = update.name if update.name is not None else row["name"]
            alloc = update.allocated_amount if update.allocated_amount is not None else row["allocated_amount"]
            status = update.status if update.status is not None else row["status"]
            notes = update.notes if update.notes is not None else row["notes"]
            cur.execute(
                "UPDATE financial_budgets SET name = %s, allocated_amount = %s, status = %s, notes = %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                (name, alloc, status, notes, now_iso, self.organization_id, budget_id),
            )
        return self.get_budget(budget_id)

    # Expense Requests
    def list_expense_requests(
        self,
        status: Optional[str] = None,
        urgency: Optional[str] = None,
        requested_by_id: Optional[str] = None
    ) -> List[ExpenseRequest]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            query = "SELECT * FROM expense_requests WHERE organization_id = %s"
            params = [self.organization_id]
            if status:
                query += " AND status = %s"
                params.append(status)
            if urgency:
                query += " AND urgency = %s"
                params.append(urgency)
            if requested_by_id:
                query += " AND requested_by_id = %s"
                params.append(requested_by_id)
            query += " ORDER BY created_at DESC;"
            cur.execute(query, params)
            rows = cur.fetchall()
            return [self._row_to_expense_request(r) for r in rows]

    def get_expense_request(self, request_id: str) -> Optional[ExpenseRequest]:
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM expense_requests WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, request_id))
            row = cur.fetchone()
            return self._row_to_expense_request(row) if row else None

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

        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute(
                """INSERT INTO expense_requests
                   (id, organization_id, title, description, category, amount, currency,
                    requested_by_id, requested_by_name, project_id, project_name, department,
                    urgency, status, reviewed_by_id, reviewed_by_name, review_comments,
                    reviewed_at, transaction_id, supporting_document_url, is_demo, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'submitted', NULL, NULL, NULL, NULL, NULL, %s, FALSE, %s, %s);""",
                (r_id, self.organization_id, req.title, req.description, req.category, req.amount,
                 req.currency, requested_by_id, requested_by_name, req.project_id, project_name,
                 req.department, req.urgency, req.supporting_document_url, now_iso, now_iso),
            )
            self._log_activity_raw(conn, requested_by_name, "expense_request_submitted", f"Expense Request: {req.title}", f"Amount: {req.amount:,.2f} {req.currency}, Urgency: {req.urgency}", "finance")

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
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM expense_requests WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, request_id))
            row = cur.fetchone()
            if not row:
                return None
            cur.execute(
                """UPDATE expense_requests 
                   SET status = %s, reviewed_by_id = %s, reviewed_by_name = %s, review_comments = %s, reviewed_at = %s, updated_at = %s
                   WHERE organization_id = %s AND id = %s;""",
                (status, reviewer_id, reviewer_name, review.comments, now_iso, now_iso, self.organization_id, request_id),
            )
            self._log_activity_raw(conn, reviewer_name, f"expense_request_{status}", f"{status.capitalize()} Request: {row['title']}", f"Comments: {review.comments or 'None'}", "finance")
        return self.get_expense_request(request_id)

    def pay_expense_request(
        self,
        request_id: str,
        payment: ExpenseRequestPay,
        actor_id: str = "tm-1",
        actor_name: str = "Alice Moraa Nyakundi"
    ) -> Optional[ExpenseRequest]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with db_manager.connection() as conn:
            cur = conn.cursor()
            self._set_tenant_session(cur)
            cur.execute("SELECT * FROM expense_requests WHERE organization_id = %s AND id = %s LIMIT 1;", (self.organization_id, request_id))
            row = cur.fetchone()
            if not row or row["status"] != "approved":
                return None

            amount = float(row["amount"])
            # 1. Deduct from account
            cur.execute(
                "UPDATE financial_accounts SET current_balance = current_balance - %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                (amount, now_iso, self.organization_id, payment.account_id),
            )

            # 2. Insert expense transaction
            tx_id = f"tx-{uuid.uuid4().hex[:8]}"
            ref = payment.payment_reference or f"TX-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:6].upper()}"
            desc = f"Disbursement for approved request: {row['title']}"
            cur.execute(
                """INSERT INTO financial_transactions 
                   (id, reference, organization_id, transaction_type, date, description, amount, currency,
                    account_id, destination_account_id, category, project_id, client_id, invoice_id,
                    payable_id, payment_method, status, recorded_by_id, recorded_by_name,
                    supporting_document_url, notes, is_demo, created_at, updated_at)
                   VALUES (%s, %s, %s, 'expense', %s, %s, %s, %s, %s, NULL, %s, %s, NULL, NULL, NULL, %s, 'completed', %s, %s, %s, %s, FALSE, %s, %s);""",
                (tx_id, ref, self.organization_id, payment.date, desc, amount, row["currency"],
                 payment.account_id, row["category"], row.get("project_id"), payment.payment_method,
                 actor_id, actor_name, row.get("supporting_document_url"), payment.notes, now_iso, now_iso),
            )

            # 3. Mark request as paid
            cur.execute(
                "UPDATE expense_requests SET status = 'paid', transaction_id = %s, updated_at = %s WHERE organization_id = %s AND id = %s;",
                (tx_id, now_iso, self.organization_id, request_id),
            )
            self._log_activity_raw(conn, actor_name, "expense_request_disbursed", f"Disbursed Request: {row['title']}", f"Amount: {amount:,.2f} {row['currency']} via {payment.payment_method}", "finance")

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

        # Cash flow trend by month
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

        # Expenses by category
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

    def purge_demo_data(self) -> Dict[str, int]:
        """Purges all demo rows from the active tenant in PostgreSQL."""
        purged = {}
        tables_with_conditions = [
            ("financial_transactions", "is_demo = TRUE OR reference LIKE '%DEMO%'"),
            ("invoices", "is_demo = TRUE OR invoice_number LIKE '%DEMO%'"),
            ("accounts_payable", "is_demo = TRUE OR reference LIKE '%DEMO%'"),
            ("financial_budgets", "is_demo = TRUE"),
            ("expense_requests", "is_demo = TRUE"),
            ("financial_accounts", "is_demo = TRUE"),
            ("tasks", "is_demo = TRUE OR title LIKE '%[DEMO]%'"),
            ("projects", "is_demo = TRUE OR name LIKE '%[DEMO]%'"),
            ("knowledge_items", "is_demo = TRUE OR title LIKE '%[DEMO]%'"),
            ("documents", "is_demo = TRUE OR name LIKE '%[DEMO]%'"),
            ("workflows", "is_demo = TRUE OR title LIKE '%[DEMO]%'"),
            ("clients", "is_demo = TRUE OR company_name LIKE '%[DEMO]%'"),
            ("meetings", "is_demo = TRUE OR title LIKE '%[DEMO]%'"),
            ("discussions", "is_demo = TRUE OR title LIKE '%[DEMO]%'"),
            ("teams", "is_demo = TRUE OR name LIKE '%[DEMO]%'"),
            ("departments", "is_demo = TRUE OR name LIKE '%[DEMO]%'"),
            ("members", "is_demo = TRUE OR name LIKE '%[DEMO]%'"),
            ("operating_principles", "is_demo = TRUE"),
            ("operating_cadences", "is_demo = TRUE"),
            ("company_activities", "is_demo = TRUE OR title LIKE '%[DEMO]%'"),
        ]
        with db_manager.connection() as conn:
            cur = conn.cursor()
            for table, condition in tables_with_conditions:
                try:
                    cur.execute(f"DELETE FROM {table} WHERE organization_id = %s AND ({condition});", (self.organization_id,))
                    purged[table] = cur.rowcount
                except Exception as exc:
                    purged[table] = 0
            conn.commit()
        return purged
