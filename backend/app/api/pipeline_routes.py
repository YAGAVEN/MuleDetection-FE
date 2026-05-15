"""Pipeline status endpoints."""
from __future__ import annotations

from fastapi import APIRouter

from ..services.pipeline_orchestrator import pipeline_orchestrator


router = APIRouter(prefix="/api/pipeline", tags=["Pipeline"])


@router.get("/status")
async def pipeline_status():
    return pipeline_orchestrator.status()


@router.post("/start")
async def pipeline_start():
    """Start the ML prediction pipeline (feature extraction + GNN prediction)"""
    await pipeline_orchestrator.start()
    return {
        "status": "started",
        "message": "Pipeline started. Feature extraction and GNN prediction in progress...",
        "pipeline_status": pipeline_orchestrator.status()
    }
