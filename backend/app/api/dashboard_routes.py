"""Runtime dashboard summary endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter

from ..services.pipeline_orchestrator import pipeline_orchestrator
from ..services.storage_service import storage_service


router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def _as_list(payload: Dict[str, Any] | None, key: str) -> List[Dict[str, Any]]:
    if not payload:
        return []
    value = payload.get(key)
    return value if isinstance(value, list) else []


def _format_count(value: int) -> str:
    return f"{int(value):,}"


def _spark(base: float) -> List[float]:
    # deterministic miniature trend sparkline from current value
    return [
        round(base * 0.72, 2),
        round(base * 0.78, 2),
        round(base * 0.84, 2),
        round(base * 0.89, 2),
        round(base * 0.94, 2),
        round(base * 0.98, 2),
        round(base, 2),
    ]


@router.get("/summary")
async def dashboard_summary():
    prediction_summary = storage_service.load_json("prediction_summary.json") or {}
    alerts = _as_list(storage_service.load_json("ingestion_alerts.json"), "alerts")
    risk_scores = _as_list(storage_service.load_json("risk_scores.json"), "scores")
    suspicious_accounts = _as_list(storage_service.load_json("suspicious_accounts.json"), "accounts")
    investigation_cases = _as_list(storage_service.load_json("investigation_cases.json"), "cases")
    pipeline_status = pipeline_orchestrator.status()

    total_accounts = int(prediction_summary.get("total_accounts_scored") or len(risk_scores))
    suspicious_count = int(
        prediction_summary.get("suspicious_accounts_count") or len(suspicious_accounts)
    )
    critical_count = int(prediction_summary.get("critical_count") or 0)
    high_count = int(prediction_summary.get("high_count") or 0)
    medium_count = int(prediction_summary.get("medium_count") or 0)
    open_case_count = int(len(investigation_cases))
    alerts_count = int(len(alerts))

    stages = [
        pipeline_status.get("ingestion"),
        pipeline_status.get("feature_extraction"),
        pipeline_status.get("prediction_engine"),
        pipeline_status.get("case_generation"),
    ]
    completed_stages = sum(1 for stage in stages if stage == "completed")
    pipeline_completion_pct = int((completed_stages / 4.0) * 100)

    kpis = [
        {
            "id": "accounts",
            "title": "Total Accounts Processed",
            "value": _format_count(total_accounts),
            "trend": "Runtime",
            "positive": True,
            "color": "cyan",
            "spark": _spark(float(max(total_accounts, 1))),
        },
        {
            "id": "suspicious",
            "title": "Suspicious Accounts",
            "value": _format_count(suspicious_count),
            "trend": "Runtime",
            "positive": suspicious_count == 0,
            "color": "rose",
            "spark": _spark(float(max(suspicious_count, 1))),
        },
        {
            "id": "critical",
            "title": "Critical Risk Accounts",
            "value": _format_count(critical_count),
            "trend": "Runtime",
            "positive": critical_count == 0,
            "color": "violet",
            "spark": _spark(float(max(critical_count, 1))),
        },
        {
            "id": "cases",
            "title": "Investigation Cases",
            "value": _format_count(open_case_count),
            "trend": "Runtime",
            "positive": False,
            "color": "indigo",
            "spark": _spark(float(max(open_case_count, 1))),
        },
        {
            "id": "alerts",
            "title": "Active Alerts",
            "value": _format_count(alerts_count),
            "trend": "Runtime",
            "positive": alerts_count == 0,
            "color": "cyan",
            "spark": _spark(float(max(alerts_count, 1))),
        },
        {
            "id": "highMedium",
            "title": "High + Medium Accounts",
            "value": _format_count(high_count + medium_count),
            "trend": "Runtime",
            "positive": False,
            "color": "emerald",
            "spark": _spark(float(max(high_count + medium_count, 1))),
        },
        {
            "id": "pipeline",
            "title": "Pipeline Completion",
            "value": f"{pipeline_completion_pct}%",
            "trend": "Runtime",
            "positive": pipeline_completion_pct == 100,
            "color": "violet",
            "spark": _spark(float(max(pipeline_completion_pct, 1))),
        },
        {
            "id": "model",
            "title": "Model Output Coverage",
            "value": f"{(100.0 if total_accounts > 0 else 0.0):.1f}%",
            "trend": "Runtime",
            "positive": total_accounts > 0,
            "color": "emerald",
            "spark": _spark(100.0 if total_accounts > 0 else 0.0),
        },
    ]

    system_health = [
        {
            "label": "Ingestion Gateway",
            "value": "Healthy" if storage_service.exists("master.csv") and storage_service.exists("transactions_full.csv") else "Awaiting Data",
            "pct": 100 if storage_service.exists("master.csv") and storage_service.exists("transactions_full.csv") else 15,
            "tone": "emerald" if storage_service.exists("master.csv") and storage_service.exists("transactions_full.csv") else "amber",
        },
        {
            "label": "Feature Store",
            "value": "Healthy" if storage_service.exists("engineered_features.csv") else "Pending",
            "pct": 100 if storage_service.exists("engineered_features.csv") else 25,
            "tone": "cyan" if storage_service.exists("engineered_features.csv") else "amber",
        },
        {
            "label": "MDE Scoring API",
            "value": "Healthy" if storage_service.exists("predictions.csv") else "Pending",
            "pct": 100 if storage_service.exists("predictions.csv") else 25,
            "tone": "violet" if storage_service.exists("predictions.csv") else "amber",
        },
        {
            "label": "Case Generation",
            "value": "Healthy" if storage_service.exists("investigation_cases.json") else "Pending",
            "pct": 100 if storage_service.exists("investigation_cases.json") else 25,
            "tone": "indigo" if storage_service.exists("investigation_cases.json") else "amber",
        },
        {
            "label": "Pipeline Orchestrator",
            "value": "Running" if pipeline_status.get("is_running") else "Idle",
            "pct": 85 if pipeline_status.get("is_running") else 60,
            "tone": "cyan",
        },
    ]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "online": True,
        "kpis": kpis,
        "alerts": alerts,
        "system_health": system_health,
        "prediction_summary": prediction_summary,
        "risk_scores": risk_scores,
        "suspicious_accounts": suspicious_accounts,
        "investigation_cases": investigation_cases,
        "pipeline_status": pipeline_status,
    }

