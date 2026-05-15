"""Pipeline status endpoints."""
from __future__ import annotations

from fastapi import APIRouter

from ..services.pipeline_orchestrator import pipeline_orchestrator
from ..services.storage_service import storage_service


router = APIRouter(prefix="/api/pipeline", tags=["Pipeline"])


@router.get("/status")
async def pipeline_status():
    return pipeline_orchestrator.status()


@router.get("/results")
async def pipeline_results():
    return {
        "ingestion_metadata": storage_service.load_json("ingestion-metadata.json") or {},
        "validation_report": storage_service.load_json("validation-report.json") or {},
        "feature_metadata": storage_service.load_json("feature_metadata.json") or {},
        "prediction_summary": storage_service.load_json("prediction_summary.json") or {},
        "suspicious_accounts": (storage_service.load_json("suspicious_accounts.json") or {}).get("accounts", []),
        "risk_scores": (storage_service.load_json("risk_scores.json") or {}).get("scores", []),
        "investigation_cases": (storage_service.load_json("investigation_cases.json") or {}).get("cases", []),
        "alerts": (storage_service.load_json("ingestion_alerts.json") or {}).get("alerts", []),
    }
