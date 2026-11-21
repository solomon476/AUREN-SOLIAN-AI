"""Analytics and Operations metrics API."""
from fastapi import APIRouter, Depends
from app.core.security import require_role, UserRole, AuthUser

router = APIRouter()


@router.get("/metrics")
async def get_metrics(user: AuthUser = Depends(require_role(UserRole.MANAGER))):
    return {
        "operationsVelocity": "94.2%",
        "aiQueryVolume": 1420,
        "sopRetrievalLatencyMs": 180,
        "departmentalAlignment": "98.5%",
    }
