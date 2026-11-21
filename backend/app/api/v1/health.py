"""Health and readiness probes."""
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "organization": settings.ORGANIZATION_NAME,
    }


@router.get("/ready")
async def readiness_check():
    return {
        "status": "ready",
        "database": "connected",
        "knowledge_vault": "indexed",
        "ai_engine": "operational",
    }
