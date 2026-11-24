"""Executive dashboard and operations hub endpoints."""
from fastapi import APIRouter, Depends
from app.core.security import get_current_user, require_role, UserRole, AuthUser
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("/stats")
async def get_stats(user: AuthUser = Depends(require_role(UserRole.MEMBER))):
    stats = repo.get_dashboard_stats()
    return {
        "activeStaffCount": stats.active_staff_count,
        "activeProjectsCount": stats.active_projects_count,
        "openOperationsCount": stats.open_operations_count,
        "knowledgeEntitiesCount": stats.knowledge_entities_count,
        "verifiedKnowledgeCount": stats.verified_knowledge_count,
        "hasDemoData": stats.has_demo_data,
        "departmentsCount": stats.departments_count,
        "operationsVelocity": stats.operations_velocity,
        "urgentTasksCount": stats.urgent_tasks_count,
        "pendingReviewsCount": stats.pending_reviews_count,
        "recentActivities": [
            {
                "id": a.id,
                "actorName": a.actor_name,
                "actionType": a.action_type,
                "title": a.title,
                "description": a.description,
                "timestamp": a.timestamp,
                "module": a.module,
            }
            for a in stats.recent_activities
        ],
        "operationalInsights": [
            {
                "id": i.id,
                "category": i.category,
                "title": i.title,
                "description": i.description,
                "severity": i.severity,
                "metricSource": i.metric_source,
                "isDemoInsight": i.is_demo_insight,
            }
            for i in stats.operational_insights
        ],
    }


@router.get("/activities")
async def list_activities(limit: int = 15, user: AuthUser = Depends(require_role(UserRole.MEMBER))):
    activities = repo.list_activities(limit=limit)
    return [
        {
            "id": a.id,
            "actorName": a.actor_name,
            "actionType": a.action_type,
            "title": a.title,
            "description": a.description,
            "timestamp": a.timestamp,
            "module": a.module,
        }
        for a in activities
    ]
