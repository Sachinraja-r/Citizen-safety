"""
Raksha AI & Location-Logic Engine — FastAPI Application Entry Point.

Usage:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Or from project root:
    uvicorn main:app --reload

Frontend integration:
    - Person 1 (Frontend) calls POST /api/v1/ai-location/triage
    - Vite dev server proxies /api/v1/ai-location/* → http://localhost:8000
    - CORS is configured below to allow all localhost origins during development.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import ai_location_router
from backend.app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Raksha Citizen Safety & Emergency Response Platform — AI Triage, "
        "Location Intelligence, Responder Ranking, and Radius Escalation Engine. "
        "Supports Kannada (ಕನ್ನಡ), Hindi (हिन्दी), and English emergency classification."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─────────────────────────────────────────────────────────────────────────────
# CORS — allow Person 1's frontend (Vite dev server on port 3000) and any
# production domain to reach this API without browser CORS errors.
# In production, replace ["*"] with your exact deployed frontend domain.
# ─────────────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Vite dev server (Person 1 frontend)
        "http://localhost:5173",   # Vite alternative default port
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*",                       # Remove in production; replace with exact frontend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Mount Person 3's AI + Location router under /api/v1
# All routes become: /api/v1/ai-location/...
# ─────────────────────────────────────────────────────────────────────────────
app.include_router(ai_location_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def health_check():
    """
    Health check endpoint. Returns engine status and available providers.
    """
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "llm_provider": settings.LLM_PROVIDER,
        "endpoints": {
            "triage":           "POST /api/v1/ai-location/triage",
            "duplicate_check":  "POST /api/v1/ai-location/duplicates/check",
            "dispatch_rank":    "POST /api/v1/ai-location/dispatch/rank",
            "dispatch_evaluate": "POST /api/v1/ai-location/dispatch/evaluate",
        },
        "docs": "/docs",
    }
