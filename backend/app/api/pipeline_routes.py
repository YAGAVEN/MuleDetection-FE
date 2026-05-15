"""Pipeline status endpoints."""
from __future__ import annotations

from fastapi import APIRouter

from ..services.pipeline_orchestrator import pipeline_orchestrator


router = APIRouter(prefix="/api/pipeline", tags=["Pipeline"])


@router.get("/status")
async def pipeline_status():
    return pipeline_orchestrator.status()
