"""FastAPI Application Entrypoint for AUREN SOLIAN."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Enterprise Organizational Intelligence & Autonomous Operations Platform API",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "platform": "AUREN SOLIAN",
        "tagline": "Organizational Intelligence & High-Trust Autonomous Operations",
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1": settings.API_V1_STR,
    }

