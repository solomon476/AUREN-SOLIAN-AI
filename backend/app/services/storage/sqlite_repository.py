"""In-memory and SQLite repository for enterprise data."""
from typing import List
from app.models.operations import Project, Task, ClientAccount, CorporateDocument, WorkflowRule, DashboardStats
from app.models.organization import OrganizationMember
from app.core.security import UserRole


class EnterpriseRepository:
    def __init__(self):
        self.members = [
            OrganizationMember(id="tm-1", user_id="usr-1", organization_id="org-solian-corp", name="Solomon K.", email="solomon@solian.ai", role=UserRole.ADMIN, department="Executive Leadership", status="active", assigned_projects=5),
            OrganizationMember(id="tm-2", user_id="usr-2", organization_id="org-solian-corp", name="Sarah Chen", email="s.chen@solian.ai", role=UserRole.MANAGER, department="Engineering & AI Ops", status="active", assigned_projects=4),
            OrganizationMember(id="tm-3", user_id="usr-3", organization_id="org-solian-corp", name="Marcus Vance", email="m.vance@solian.ai", role=UserRole.MANAGER, department="Strategic Accounts", status="active", assigned_projects=3),
            OrganizationMember(id="tm-4", user_id="usr-4", organization_id="org-solian-corp", name="Elena Rostova", email="e.rostova@solian.ai", role=UserRole.MEMBER, department="Product Architecture", status="away", assigned_projects=2),
            OrganizationMember(id="tm-5", user_id="usr-5", organization_id="org-solian-corp", name="David Ochieng", email="d.ochieng@solian.ai", role=UserRole.MEMBER, department="Data Intelligence", status="active", assigned_projects=3),
        ]

        self.projects = [
            Project(id="p-101", name="Project Apex: Autonomous Supply Sync", client="Meridian Logistics", status="in_progress", progress=68, lead="Sarah Chen", due_date="2026-12-15", priority="critical"),
            Project(id="p-102", name="Solian Intelligence Mesh Rollout", client="Internal Enterprise", status="in_progress", progress=85, lead="Solomon K.", due_date="2026-11-30", priority="high"),
            Project(id="p-103", name="Compliance Vault Migration & SOC2", client="Aether Capital", status="review", progress=92, lead="Elena Rostova", due_date="2026-12-05", priority="high"),
            Project(id="p-104", name="Automated Operations Triage Engine", client="Vanguard Group", status="planning", progress=25, lead="Marcus Vance", due_date="2027-01-10", priority="medium"),
        ]

        self.tasks = [
            Task(id="t-1", title="Synthesize Q4 Operations Review for Board", description="Compile departmental deliverables and AI cost efficiencies.", status="in_progress", priority="urgent", assignee="Solomon K.", due_date="Today"),
            Task(id="t-2", title="Audit Multi-Tenant RBAC Security Matrix", description="Verify boundary isolation between departments and guest credentials.", status="review", priority="high", assignee="Sarah Chen", due_date="Tomorrow"),
            Task(id="t-3", title="Update Client Escalation Playbook", description="Incorporate new automated SMS & email dispatch triggers.", status="backlog", priority="medium", assignee="Marcus Vance", due_date="Nov 28"),
            Task(id="t-4", title="Finalize Institutional Knowledge Ingestion", description="Index corporate handbooks into vector memory store.", status="completed", priority="high", assignee="David Ochieng", due_date="Completed"),
        ]

        self.clients = [
            ClientAccount(id="c-1", company_name="Meridian Global Logistics", contact_person="Alister Sterling", email="a.sterling@meridian.com", status="active", contract_value="$240,000 / yr", lead_account_manager="Marcus Vance"),
            ClientAccount(id="c-2", company_name="Aether Capital Partners", contact_person="Beatrice Holt", email="b.holt@aethercap.com", status="retained", contract_value="$360,000 / yr", lead_account_manager="Solomon K."),
            ClientAccount(id="c-3", company_name="Vanguard Industrial Systems", contact_person="Robert Drake", email="rdrake@vanguardind.com", status="contract_pending", contract_value="$180,000 / yr", lead_account_manager="Marcus Vance"),
        ]

        self.documents = [
            CorporateDocument(id="doc-1", name="Solian Master Services Agreement (MSA) Template 2026.pdf", type="PDF Document", size="2.4 MB", classification="Confidential", updated_at="2026-11-19", owner="Legal & Risk"),
            CorporateDocument(id="doc-2", name="Enterprise Architecture & Data Security Whitepaper.pdf", type="PDF Document", size="5.1 MB", classification="Internal", updated_at="2026-11-14", owner="Architecture"),
            CorporateDocument(id="doc-3", name="Q3 Executive Operations & Financial Synthesis.xlsx", type="Spreadsheet", size="1.2 MB", classification="Restricted", updated_at="2026-10-31", owner="Executive Board"),
        ]

        self.workflows = [
            WorkflowRule(id="wf-1", title="High-Priority Client Escalation Auto-Triage", trigger="Client urgency flag in support desk", action="Notify Director + Auto-create P1 Incident in Solian Tasks", status="active", execution_count=124),
            WorkflowRule(id="wf-2", title="Weekly Executive Intelligence Digest", trigger="Every Friday at 17:00 UTC", action="Compile project velocities, unblockers & budget status", status="active", execution_count=52),
            WorkflowRule(id="wf-3", title="Knowledge Drift & Stale Policy Audit", trigger="Document untouched for > 90 days", action="Assign verification ticket to department author", status="active", execution_count=18),
        ]

    def get_dashboard_stats(self) -> DashboardStats:
        return DashboardStats(
            active_staff_count=len(self.members),
            active_projects_count=len(self.projects),
            open_operations_count=len([t for t in self.tasks if t.status != "completed"]),
            knowledge_entities_count=184,
            ai_queries_this_month=1420,
            operations_velocity="+18.4%",
        )


repo = EnterpriseRepository()

