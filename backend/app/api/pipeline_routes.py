"""Pipeline status endpoints."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from ..services.pipeline_orchestrator import pipeline_orchestrator
from ..services.storage_service import storage_service
from ..utils.response_utils import sanitize_json_value


router = APIRouter(prefix="/api/pipeline", tags=["Pipeline"])


@router.get("/status")
async def pipeline_status():
    return pipeline_orchestrator.status()


@router.get("/results")
async def pipeline_results():
    """Get pipeline outputs from backend/temp-data."""
    prediction_summary = storage_service.load_json("prediction_summary.json") or {}
    risk_payload = storage_service.load_json("risk_scores.json") or {}
    suspicious_payload = storage_service.load_json("suspicious_accounts.json") or {}
    cases_payload = storage_service.load_json("investigation_cases.json") or {}
    alerts_payload = storage_service.load_json("ingestion_alerts.json") or {}

    risk_scores = risk_payload.get("scores", []) if isinstance(risk_payload, dict) else []
    suspicious_accounts = (
        suspicious_payload.get("accounts", []) if isinstance(suspicious_payload, dict) else []
    )
    cases = cases_payload.get("cases", []) if isinstance(cases_payload, dict) else []
    alerts = alerts_payload.get("alerts", []) if isinstance(alerts_payload, dict) else []

    if not cases and risk_scores:
        cases = _build_cases_from_scores(risk_scores)
    if not alerts and risk_scores:
        alerts = _build_alerts_from_scores(risk_scores)
    if not suspicious_accounts and risk_scores:
        suspicious_accounts = _top_suspicious_accounts(risk_scores)

    return sanitize_json_value({
        "status": "success" if prediction_summary or risk_scores else "no_results",
        "prediction_summary": prediction_summary,
        "risk_scores": risk_scores,
        "suspicious_accounts": suspicious_accounts,
        "investigation_cases": cases,
        "cases": cases,
        "alerts": alerts,
        "total_cases": len(cases),
        "generated_at": prediction_summary.get("generated_at"),
    })


def _score_value(row: dict) -> float:
    raw = row.get("ensemble_score", row.get("risk_score", row.get("score", 0)))
    try:
        return float(raw)
    except (TypeError, ValueError):
        return 0.0


def _risk_level(row: dict) -> str:
    level = str(row.get("risk_level", row.get("level", "LOW"))).upper()
    return level.title()


def _top_suspicious_accounts(risk_scores: list[dict]) -> list[dict]:
    ranked = sorted(risk_scores, key=_score_value, reverse=True)
    suspicious = [
        item for item in ranked if item.get("is_suspicious") == 1 or _risk_level(item) in {"High", "Critical"}
    ]
    return suspicious or ranked[: min(20, len(ranked))]


def _build_cases_from_scores(risk_scores: list[dict]) -> list[dict]:
    cases = []
    for index, row in enumerate(_top_suspicious_accounts(risk_scores)[:20]):
        score = _score_value(row)
        account_id = str(row.get("account_id", f"ACC-{index + 1:04d}"))
        cases.append(
            {
                "id": f"MDE-{24000 + index + 1}",
                "case_id": f"MDE-{24000 + index + 1}",
                "account_id": account_id,
                "riskScore": int(round(score * 100)),
                "risk_score": score,
                "riskLevel": _risk_level(row),
                "risk_level": str(row.get("risk_level", "LOW")),
                "pattern": "Uploaded data risk scoring",
                "accounts": 1,
                "amount": "N/A",
                "timeline": "Uploaded window",
                "status": "Open",
                "investigator": "Auto-assigned",
                "alerts": 1,
                "entities": [account_id],
            }
        )
    return cases


def _build_alerts_from_scores(risk_scores: list[dict]) -> list[dict]:
    alerts = []
    now = datetime.now(timezone.utc).isoformat()
    for index, row in enumerate(_top_suspicious_accounts(risk_scores)[:10]):
        level = _risk_level(row)
        severity = "critical" if level == "Critical" else "high" if level == "High" else "medium"
        account_id = row.get("account_id", "unknown")
        alerts.append(
            {
                "id": f"AL-{9000 + index + 1}",
                "alert_id": f"AL-{9000 + index + 1}",
                "text": f"Account {account_id} is in the {level} risk band.",
                "message": f"Account {account_id} is in the {level} risk band.",
                "severity": severity,
                "time": "Just now",
                "timestamp": now,
            }
        )
    return alerts
