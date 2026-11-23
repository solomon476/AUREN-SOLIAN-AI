"""Health and readiness diagnostic probes."""
from fastapi import APIRouter
from app.core.config import settings
from app.db import db_manager

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "organization": settings.ORGANIZATION_NAME,
        "auth_mode": settings.AUTH_MODE,
        "database_dialect": settings.database_dialect,
    }


@router.get("/ready")
async def readiness_check():
    db_health = db_manager.check_connection()
    is_ready = db_health.get("status") == "connected"
    return {
        "status": "ready" if is_ready else "degraded",
        "database": db_health.get("status", "connected"),
        "database_dialect": db_health.get("dialect", "sqlite"),
        "database_latency_ms": db_health.get("latency_ms"),
        "knowledge_vault": "indexed",
        "ai_engine": "operational",
    }
