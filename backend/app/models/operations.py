"""Enterprise operational models: projects, tasks, clients, documents, workflows, dashboard."""
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


ALLOWED_PROJECT_PRIORITIES = {"low", "medium", "high", "critical"}
ALLOWED_PROJECT_STATUSES = {"planning", "in_progress", "review", "delivered"}

ALLOWED_TASK_PRIORITIES = {"low", "medium", "high", "urgent"}
ALLOWED_TASK_STATUSES = {"backlog", "in_progress", "review", "completed"}


class Project(BaseModel):
    id: str
    organization_id: str = "org-solian-wolves"
    name: str
    client: Optional[str] = None
    status: str  # planning | in_progress | review | delivered
    progress: int
    lead: str
    due_date: str
    priority: str  # low | medium | high | critical
    department: Optional[str] = None
    description: Optional[str] = None
    is_demo: bool = False


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    client: Optional[str] = None
    status: str = Field(default="planning")
    progress: int = Field(default=0, ge=0, le=100)
    lead: str = Field(min_length=2, max_length=100)
    due_date: str = Field(min_length=4, max_length=50)
    priority: str = Field(default="medium")
    department: Optional[str] = None
    description: Optional[str] = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        if v.lower() not in ALLOWED_PROJECT_PRIORITIES:
            raise ValueError(f"Invalid priority '{v}'. Allowed: {sorted(ALLOWED_PROJECT_PRIORITIES)}")
        return v.lower()

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v.lower() not in ALLOWED_PROJECT_STATUSES:
            raise ValueError(f"Invalid status '{v}'. Allowed: {sorted(ALLOWED_PROJECT_STATUSES)}")
        return v.lower()


class Task(BaseModel):
    id: str
    organization_id: str = "org-solian-wolves"
    title: str
    description: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    status: str  # backlog | in_progress | review | completed
    priority: str  # low | medium | high | urgent
    assignee: str
    due_date: str
    department: Optional[str] = None
    created_at: str = "2026-11-20"
    is_demo: bool = False


class TaskCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(default="")
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    status: str = Field(default="backlog")
    priority: str = Field(default="medium")
    assignee: str = Field(min_length=2, max_length=100)
    due_date: str = Field(min_length=2, max_length=50)
    department: Optional[str] = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        if v.lower() not in ALLOWED_TASK_PRIORITIES:
            raise ValueError(f"Invalid priority '{v}'. Allowed: {sorted(ALLOWED_TASK_PRIORITIES)}")
        return v.lower()

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v.lower() not in ALLOWED_TASK_STATUSES:
            raise ValueError(f"Invalid status '{v}'. Allowed: {sorted(ALLOWED_TASK_STATUSES)}")
        return v.lower()


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    description: Optional[str] = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.lower() not in ALLOWED_TASK_PRIORITIES:
            raise ValueError(f"Invalid priority '{v}'. Allowed: {sorted(ALLOWED_TASK_PRIORITIES)}")
        return v.lower() if v else None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.lower() not in ALLOWED_TASK_STATUSES:
            raise ValueError(f"Invalid status '{v}'. Allowed: {sorted(ALLOWED_TASK_STATUSES)}")
        return v.lower() if v else None


class ClientAccount(BaseModel):
    id: str
    organization_id: str = "org-solian-wolves"
    company_name: str
    contact_person: str
    email: str
    status: str  # prospect | active | contract_pending | retained
    contract_value: str
    lead_account_manager: str
    notes: Optional[str] = None
    is_demo: bool = False


class ClientAccountCreate(BaseModel):
    company_name: str = Field(min_length=2, max_length=150)
    contact_person: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=100)
    status: str = Field(default="prospect")
    contract_value: str = Field(default="")
    lead_account_manager: str = Field(min_length=2, max_length=100)
    notes: Optional[str] = None


class CorporateDocument(BaseModel):
    id: str
    organization_id: str = "org-solian-wolves"
    name: str
    type: str
    size: str
    classification: str  # Public | Internal | Confidential | Restricted
    updated_at: str
    owner: str
    department: Optional[str] = None
    is_demo: bool = False


class WorkflowRule(BaseModel):
    id: str
    organization_id: str = "org-solian-wolves"
    title: str
    trigger: str
    action: str
    status: str = "active"  # active | paused
    execution_count: int = 0
    department: Optional[str] = None
    is_demo: bool = False


class WorkflowRuleCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    trigger: str = Field(min_length=3, max_length=300)
    action: str = Field(min_length=3, max_length=300)
    department: Optional[str] = None


class CompanyActivityEvent(BaseModel):
    id: str
    actor_name: str
    action_type: str  # milestone | task_completed | task_created | sop_indexed | doc_uploaded | workflow_triggered
    title: str
    description: str
    timestamp: str
    module: str
    is_demo: bool = False


class OperationalInsight(BaseModel):
    id: str
    category: str  # risk | velocity | alignment | resource
    title: str
    description: str
    severity: str  # info | warning | critical
    metric_source: str
    is_demo_insight: bool = False


class DashboardStats(BaseModel):
    active_staff_count: int
    active_projects_count: int
    open_operations_count: int
    knowledge_entities_count: int
    departments_count: int
    operations_velocity: str
    urgent_tasks_count: int
    pending_reviews_count: int
    has_demo_data: bool = True
    verified_knowledge_count: int = 0
    recent_activities: List[CompanyActivityEvent] = Field(default_factory=list)
    operational_insights: List[OperationalInsight] = Field(default_factory=list)
