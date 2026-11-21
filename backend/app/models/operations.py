"""Enterprise operational models: projects, tasks, clients, documents, workflows."""
from typing import Optional
from pydantic import BaseModel


class Project(BaseModel):
    id: str
    name: str
    client: Optional[str] = None
    status: str  # planning | in_progress | review | delivered
    progress: int
    lead: str
    due_date: str
    priority: str  # low | medium | high | critical


class Task(BaseModel):
    id: str
    title: str
    description: str
    project_id: Optional[str] = None
    status: str  # backlog | in_progress | review | completed
    priority: str  # low | medium | high | urgent
    assignee: str
    due_date: str


class ClientAccount(BaseModel):
    id: str
    company_name: str
    contact_person: str
    email: str
    status: str  # prospect | active | contract_pending | retained
    contract_value: str
    lead_account_manager: str


class CorporateDocument(BaseModel):
    id: str
    name: str
    type: str
    size: str
    classification: str  # Public | Internal | Confidential | Restricted
    updated_at: str
    owner: str


class WorkflowRule(BaseModel):
    id: str
    title: str
    trigger: str
    action: str
    status: str = "active"  # active | paused
    execution_count: int = 0


class DashboardStats(BaseModel):
    active_staff_count: int
    active_projects_count: int
    open_operations_count: int
    knowledge_entities_count: int
    ai_queries_this_month: int
    operations_velocity: str
