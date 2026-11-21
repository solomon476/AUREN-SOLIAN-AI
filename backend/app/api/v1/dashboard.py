"""Executive dashboard endpoints."""
from fastapi import APIRouter, Depends
from app.core.security import get_current_user, AuthUser
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("/stats")
async def get_stats(user: AuthUser = Depends(get_current_user)):
    stats = repo.get_dashboard_stats()
    return {
        "activeStaffCount": stats.active_staff_count,
        "activeProjectsCount": stats.active_projects_count,
        "openOperationsCount": stats.open_operations_count,
        "knowledgeEntitiesCount": stats.knowledge_entities_count,
        "aiQueriesThisMonth": stats.ai_queries_this_month,
        "operationsVelocity": stats.operations_velocity,
    }
