"""Analytics and Operations metrics API with live computed data."""
import time
from fastapi import APIRouter, Depends
from app.core.security import require_role, UserRole, AuthUser
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("/metrics")
async def get_metrics(user: AuthUser = Depends(require_role(UserRole.MANAGER))):
    t0 = time.perf_counter()
    stats = repo.get_dashboard_stats()
    departments = repo.list_departments()
    tasks = repo.list_tasks()
    t1 = time.perf_counter()

    # Calculate real departmental alignment based on statutory leadership and assigned operations
    if departments:
        aligned_depts = [d for d in departments if d.lead_name or d.member_count > 0 or d.active_initiatives > 0]
        dept_alignment = f"{int(round(len(aligned_depts) / len(departments) * 100))}%"
    else:
        dept_alignment = "100%"

    # Compute actual department activity density
    total_tasks = len(tasks)
    dept_distribution = {
        "TECH": 0,
        "OPS": 0,
        "FIN": 0,
        "EXEC": 0,
        "ADMIN": 0,
    }
    for t in tasks:
        dept_lower = (t.department or "").lower()
        if "tech" in dept_lower or "eng" in dept_lower or "ai" in dept_lower:
            dept_distribution["TECH"] += 1
        elif "fin" in dept_lower or "treasury" in dept_lower:
            dept_distribution["FIN"] += 1
        elif "exec" in dept_lower or "govern" in dept_lower:
            dept_distribution["EXEC"] += 1
        elif "admin" in dept_lower or "service" in dept_lower:
            dept_distribution["ADMIN"] += 1
        else:
            dept_distribution["OPS"] += 1

    density_pcts = {}
    for code, count in dept_distribution.items():
        density_pcts[code] = int(round((count / total_tasks * 100))) if total_tasks > 0 else (20)

    measured_latency = max(1, int((t1 - t0) * 1000))

    return {
        "operationsVelocity": stats.operations_velocity,
        "activeStaffCount": stats.active_staff_count,
        "activeProjectsCount": stats.active_projects_count,
        "openOperationsCount": stats.open_operations_count,
        "knowledgeEntitiesCount": stats.knowledge_entities_count,
        "urgentTasksCount": stats.urgent_tasks_count,
        "pendingReviewsCount": stats.pending_reviews_count,
        "sopRetrievalLatencyMs": measured_latency,
        "departmentalAlignment": dept_alignment,
        "departmentDensity": density_pcts,
    }
