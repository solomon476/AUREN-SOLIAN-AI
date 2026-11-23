"""Consolidated v1 API Router."""
from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.teams import router as teams_router
from app.api.v1.projects import router as projects_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.clients import router as clients_router
from app.api.v1.documents import router as documents_router
from app.api.v1.knowledge import router as knowledge_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.workflows import router as workflows_router
from app.api.v1.meetings import router as meetings_router
from app.api.v1.discussions import router as discussions_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.calendar import router as calendar_router
from app.api.v1.search import router as search_router
from app.api.v1.finance import router as finance_router
from app.api.v1.email import router as email_router

api_router = APIRouter()

api_router.include_router(health_router, tags=["Health"])
api_router.include_router(auth_router, prefix="/auth", tags=["Auth & Tenancy"])
api_router.include_router(chat_router, prefix="/chat", tags=["Company AI"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(teams_router, prefix="/teams", tags=["Teams & RBAC"])
api_router.include_router(projects_router, prefix="/projects", tags=["Projects"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(clients_router, prefix="/clients", tags=["Clients & CRM"])
api_router.include_router(documents_router, prefix="/documents", tags=["Documents"])
api_router.include_router(knowledge_router, prefix="/knowledge", tags=["Knowledge Vault"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(workflows_router, prefix="/workflows", tags=["Workflows"])
api_router.include_router(meetings_router, prefix="/meetings", tags=["Meetings & Minutes"])
api_router.include_router(discussions_router, prefix="/discussions", tags=["Discussions & Threads"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(calendar_router, prefix="/calendar", tags=["Calendar"])
api_router.include_router(search_router, prefix="/search", tags=["Search"])
api_router.include_router(finance_router, prefix="/finance", tags=["Finance & Company Records"])
api_router.include_router(email_router, prefix="/email", tags=["Email & Communications"])

