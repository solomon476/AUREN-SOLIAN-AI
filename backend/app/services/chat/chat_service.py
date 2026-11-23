"""Company chat service handling SSE formatting, permission boundaries, and action proposals."""
import json
import asyncio
from typing import AsyncGenerator, Dict, Any, List, Optional
from app.services.llm.gemini_service import GeminiService
from app.services.knowledge.knowledge_service import knowledge_service
from app.services.storage.sqlite_repository import repo
from app.core.security import UserRole, AuthUser, get_allowed_classifications
from app.models.chat import ActionProposal, ExecuteActionRequest, ExecuteActionResult
from app.models.operations import TaskCreate, TaskUpdate
from app.models.knowledge import KnowledgeItemCreate


class ChatService:
    def __init__(self):
        self.llm = GeminiService()

    async def generate_chat_stream(
        self,
        message: str,
        user: AuthUser,
        history: Optional[List[Dict[str, Any]]] = None,
        workspace_context: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        user_role = user.role
        user_name = user.full_name
        user_department = user.department

        # Check permissions & filter knowledge items
        allowed_classes = get_allowed_classifications(user_role)
        all_matches = repo.list_knowledge(query=message)
        authorized_matches = [k for k in all_matches if k.classification in allowed_classes]

        # Detect if user attempted to query restricted documents beyond their role
        restricted_attempt = len(all_matches) > len(authorized_matches) and user_role in (UserRole.GUEST, UserRole.MEMBER)

        context_sources = [k.title for k in authorized_matches[:3]]
        if not context_sources:
            context_sources = ["Solian Wolves Organizational Memory", "Operating Cadence Registry"]

        # Fetch relevant operational context
        projects = repo.list_projects()
        tasks = repo.list_tasks()
        meetings = repo.list_meetings()

        # Financial context grounding (for authorized organizational members)
        financial_summary = None
        if user_role in (UserRole.MEMBER, UserRole.ADMIN, UserRole.OWNER):
            try:
                fin_stats = repo.get_financial_overview()
                financial_summary = {
                    "total_recorded_balances": fin_stats.total_recorded_balances,
                    "monthly_income": fin_stats.monthly_income,
                    "monthly_expenditure": fin_stats.monthly_expenditure,
                    "outstanding_receivables": fin_stats.outstanding_receivables,
                    "outstanding_payables": fin_stats.outstanding_payables,
                    "budget_total_allocated": fin_stats.budget_total_allocated,
                    "budget_total_spent": fin_stats.budget_total_spent,
                    "budget_utilization_percentage": fin_stats.budget_utilization_percentage,
                    "pending_approvals_count": fin_stats.pending_approvals_count,
                    "active_accounts": [
                        {"name": a.name, "type": a.account_type, "balance": a.current_balance, "currency": a.currency}
                        for a in fin_stats.accounts if a.status == "active"
                    ],
                }
            except Exception:
                financial_summary = None

        operational_context = {
            "financial_intelligence": financial_summary,
            "verified_leadership": [
                {"name": "Ian Momanyi Nyakundi", "title": "Chief Executive Officer"},
                {"name": "Hillary Onchwati Isaiah", "title": "Chief Operating Officer"},
                {"name": "Alice Moraa Nyakundi", "title": "Chief Financial Officer"},
                {"name": "Noella Maraka Kaatho", "title": "Executive Director / Finance & Administration"},
                {"name": "Solomon Nyangweso Omwenga", "title": "Chief Technology Officer"},
            ],
            "upcoming_meetings": [
                {
                    "title": m.title,
                    "type": m.meeting_type,
                    "date": m.date,
                    "time": m.time,
                    "organizer": m.organizer_name,
                    "status": m.status,
                }
                for m in meetings[:5]
            ],
            "projects": [
                {
                    "name": p.name,
                    "status": p.status,
                    "progress": p.progress,
                    "lead": p.lead,
                    "due_date": p.due_date,
                    "priority": p.priority,
                    "client": p.client,
                    "department": p.department,
                }
                for p in projects
            ],
            "tasks": [
                {
                    "title": t.title,
                    "status": t.status,
                    "priority": t.priority,
                    "assignee": t.assignee,
                    "due_date": t.due_date,
                    "project_name": t.project_name,
                }
                for t in tasks
            ],
        }

        knowledge_context = [
            {
                "title": k.title,
                "category": k.category,
                "classification": k.classification,
                "snippet": k.snippet,
                "department": k.department,
                "author": k.author,
            }
            for k in authorized_matches[:3]
        ]

        # Stream response chunks
        async for chunk in self.llm.stream_executive_response(
            prompt=message,
            user_role=user_role.value,
            user_name=user_name,
            user_department=user_department,
            context_sources=context_sources,
            operational_context=operational_context,
            knowledge_context=knowledge_context,
            history=history,
            workspace_context=workspace_context,
            restricted_attempt=restricted_attempt,
        ):
            payload = json.dumps({"content": chunk})
            yield f"data: {payload}\n\n"

        # Generate actionable proposals if query implies operational action
        proposals: List[ActionProposal] = []
        lower_msg = message.lower()

        if any(w in lower_msg for w in ["create task", "assign", "delegate", "schedule review", "draft sop"]):
            if "sop" in lower_msg:
                proposals.append(
                    ActionProposal(
                        id=f"prop-{int(asyncio.get_event_loop().time() * 1000)}",
                        title=f"Draft Standard Operating Procedure: {message[:40]}...",
                        type="index_sop",
                        payload={
                            "title": f"Draft SOP: {message[:45]}",
                            "category": "SOP",
                            "snippet": f"Documented standard procedure per executive request: {message[:60]}",
                            "content": f"Full operational specification initiated by {user_name}.\n\nProcedure details tracking.",
                            "classification": "Internal",
                            "department": user_department,
                            "tags": ["draft", "sop", "executive-directive"],
                        },
                        status="pending",
                    )
                )
            else:
                proposals.append(
                    ActionProposal(
                        id=f"prop-{int(asyncio.get_event_loop().time() * 1000)}",
                        title=f"Create Operational Task: {message[:45]}...",
                        type="create_task",
                        payload={
                            "title": f"Executive Directive: {message[:50]}",
                            "description": f"Operational requirement logged via AUREN SOLIAN assistant by {user_name}.",
                            "priority": "high",
                            "assignee": user_name,
                            "due_date": "Next Scheduled Sprint",
                            "department": user_department,
                        },
                        status="pending",
                    )
                )

        if proposals:
            proposals_payload = json.dumps({
                "action_proposals": [p.model_dump() for p in proposals],
                "context_sources": context_sources,
            })
            yield f"data: {proposals_payload}\n\n"

        yield "data: [DONE]\n\n"

    def execute_action(self, req: ExecuteActionRequest, user: AuthUser) -> ExecuteActionResult:
        """Executes a confirmed action proposal on the backend repository."""
        # Idempotency check: prevent duplicate replay of the same action proposal
        if repo.is_proposal_executed(req.proposal_id):
            return ExecuteActionResult(
                success=False,
                message=f"Action proposal '{req.proposal_id}' has already been executed and cannot be replayed.",
                already_executed=True,
            )

        p_type = req.action_type
        payload = req.payload

        if p_type == "create_task":
            if user.role == UserRole.GUEST:
                return ExecuteActionResult(
                    success=False,
                    message="Guest accounts are not authorized to create operational tasks.",
                    already_executed=False,
                )
            new_task = repo.create_task(
                TaskCreate(
                    title=payload.get("title", "New Task from AI Assistant"),
                    description=payload.get("description", "Created via AUREN SOLIAN"),
                    project_id=payload.get("project_id"),
                    project_name=payload.get("project_name", "General Operations"),
                    status="backlog",
                    priority=payload.get("priority", "medium"),
                    assignee=payload.get("assignee", user.full_name),
                    due_date=payload.get("due_date", "Upcoming"),
                    department=payload.get("department", user.department),
                ),
                creator_name=user.full_name,
            )
            repo.record_proposal_executed(req.proposal_id, p_type, user.full_name)
            return ExecuteActionResult(
                success=True,
                message=f"Task '{new_task.title}' successfully created in Solian Tasks.",
                entity_id=new_task.id,
                entity_type="task",
            )

        elif p_type == "complete_task":
            if user.role == UserRole.GUEST:
                return ExecuteActionResult(
                    success=False,
                    message="Guest accounts are not authorized to modify tasks.",
                    already_executed=False,
                )
            task_id = payload.get("task_id", "t-1")
            updated = repo.update_task(task_id, TaskUpdate(status="completed"), actor_name=user.full_name)
            if updated:
                repo.record_proposal_executed(req.proposal_id, p_type, user.full_name)
                return ExecuteActionResult(
                    success=True,
                    message=f"Task '{updated.title}' marked as completed.",
                    entity_id=updated.id,
                    entity_type="task",
                )
            return ExecuteActionResult(success=False, message="Task not found.")

        elif p_type == "index_sop":
            # Indexing standard operating procedures requires at least MANAGER clearance
            if user.role not in (UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER):
                return ExecuteActionResult(
                    success=False,
                    message="Insufficient clearance to index Standard Operating Procedures. Manager clearance required.",
                    already_executed=False,
                )
            new_sop = repo.add_knowledge_item(
                KnowledgeItemCreate(
                    title=payload.get("title", "New Standard Operating Procedure"),
                    category=payload.get("category", "SOP"),
                    snippet=payload.get("snippet", "Indexed SOP"),
                    content=payload.get("content", "Operational Procedure specifications."),
                    classification=payload.get("classification", "Internal"),
                    department=payload.get("department", user.department),
                    tags=payload.get("tags", ["sop"]),
                ),
                author=user.full_name,
            )
            repo.record_proposal_executed(req.proposal_id, p_type, user.full_name)
            return ExecuteActionResult(
                success=True,
                message=f"SOP '{new_sop.title}' indexed in Institutional Knowledge Vault.",
                entity_id=new_sop.id,
                entity_type="knowledge",
            )

        repo.record_proposal_executed(req.proposal_id, p_type, user.full_name)
        return ExecuteActionResult(
            success=True,
            message="Action registered in Solian Wolves audit log.",
            entity_id=req.proposal_id,
            entity_type="generic",
        )


chat_service = ChatService()
