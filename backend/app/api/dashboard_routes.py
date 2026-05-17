"""Runtime dashboard summary endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter
import pandas as pd

from ..services.pipeline_orchestrator import pipeline_orchestrator
from ..services.risk_thresholds import (
    CRITICAL_ABOVE_PCT_RANK,
    HIGH_UPTO_PCT_RANK,
    LOW_UPTO_PCT_RANK,
    MEDIUM_UPTO_PCT_RANK,
    SUSPICIOUS_ABOVE_PCT_RANK,
    is_critical_percentile,
    is_suspicious_percentile,
    risk_level_for_percentile,
)
from ..services.storage_service import storage_service
from ..utils.response_utils import sanitize_json_value


router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def _as_list(payload: Dict[str, Any] | None, key: str) -> List[Dict[str, Any]]:
    if not payload:
        return []
    value = payload.get(key)
    return value if isinstance(value, list) else []


def _score_value(row: Dict[str, Any]) -> float:
    try:
        return float(row.get("ensemble_score", row.get("risk_score", row.get("score", 0))))
    except (TypeError, ValueError):
        return 0.0


def _risk_level(row: Dict[str, Any]) -> str:
    return str(row.get("risk_level", row.get("level", "LOW"))).upper().title()


def _derived_counts(risk_scores: List[Dict[str, Any]]) -> Dict[str, int]:
    totals = {"total": len(risk_scores), "suspicious": 0, "critical": 0, "high": 0, "medium": 0, "low": 0}
    for row in risk_scores:
        level = _risk_level(row)
        if row.get("is_suspicious") == 1 or level in {"High", "Critical"}:
            totals["suspicious"] += 1
        if row.get("is_critical") == 1 or level == "Critical":
            totals["critical"] += 1
        elif level == "High":
            totals["high"] += 1
        elif level == "Medium":
            totals["medium"] += 1
        else:
            totals["low"] += 1
    return totals


def _prediction_counts_from_frame(frame: pd.DataFrame) -> Dict[str, int]:
    if frame.empty:
        return {"total": 0, "suspicious": 0, "critical": 0, "high": 0, "medium": 0, "low": 0}

    if "ensemble_score" in frame.columns:
        scored = pd.to_numeric(frame["ensemble_score"], errors="coerce").fillna(0.0)
        ranked = scored.rank(pct=True, method="first")
        levels = ranked.apply(risk_level_for_percentile)
        suspicious_mask = ranked.apply(is_suspicious_percentile)
        critical_mask = ranked.apply(is_critical_percentile)
    else:
        levels = frame.get("risk_level", pd.Series(dtype=str)).fillna("LOW").astype(str).str.upper()
        suspicious_mask = pd.Series(False, index=frame.index)
        critical_mask = pd.Series(False, index=frame.index)
        if "is_suspicious" in frame.columns:
            suspicious_mask = pd.to_numeric(frame["is_suspicious"], errors="coerce").fillna(0).astype(int) == 1
        if "is_critical" in frame.columns:
            critical_mask = pd.to_numeric(frame["is_critical"], errors="coerce").fillna(0).astype(int) == 1

    totals = {
        "total": int(len(frame)),
        "suspicious": int(suspicious_mask.sum() if suspicious_mask.any() else levels.isin(["HIGH", "CRITICAL"]).sum()),
        "critical": int(critical_mask.sum() if critical_mask.any() else (levels == "CRITICAL").sum()),
        "high": int((levels == "HIGH").sum()),
        "medium": int((levels == "MEDIUM").sum()),
        "low": int((levels == "LOW").sum()),
    }
    return totals


def _top_risk_scores(risk_scores: List[Dict[str, Any]], limit: int = 20) -> List[Dict[str, Any]]:
    ranked = sorted(risk_scores, key=_score_value, reverse=True)
    suspicious = [
        item for item in ranked if item.get("is_suspicious") == 1 or _risk_level(item) in {"High", "Critical"}
    ]
    return (suspicious or ranked)[:limit]


def _build_cases_from_scores(risk_scores: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    cases: List[Dict[str, Any]] = []
    for index, row in enumerate(_top_risk_scores(risk_scores, 20)):
        score = _score_value(row)
        account_id = str(row.get("account_id", f"ACC-{index + 1:04d}"))
        cases.append(
            {
                "id": f"MDE-{24000 + index + 1}",
                "riskScore": int(round(score * 100)),
                "riskLevel": _risk_level(row),
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


def _build_alerts_from_scores(risk_scores: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    alerts: List[Dict[str, Any]] = []
    for index, row in enumerate(_top_risk_scores(risk_scores, 10)):
        level = _risk_level(row)
        severity = "critical" if level == "Critical" else "high" if level == "High" else "medium"
        account_id = row.get("account_id", "unknown")
        alerts.append(
            {
                "id": f"AL-{9000 + index + 1}",
                "text": f"Account {account_id} is in the {level} risk band.",
                "severity": severity,
                "time": "Just now",
            }
        )
    return alerts


def _load_predictions_frame() -> pd.DataFrame:
    path = storage_service.temp_data_dir / "predictions.csv"
    if not path.exists():
        return pd.DataFrame()
    try:
        return pd.read_csv(path)
    except Exception:
        return pd.DataFrame()


def _enriched_prediction_rows(frame: pd.DataFrame) -> pd.DataFrame:
    if frame.empty or "ensemble_score" not in frame.columns:
        return frame

    enriched = frame.copy()
    scores = pd.to_numeric(enriched["ensemble_score"], errors="coerce").fillna(0.0)
    enriched["__risk_percentile"] = scores.rank(pct=True, method="first")
    enriched["__risk_level"] = enriched["__risk_percentile"].apply(risk_level_for_percentile)
    enriched["__is_suspicious"] = enriched["__risk_percentile"].apply(is_suspicious_percentile)
    enriched["__is_critical"] = enriched["__risk_percentile"].apply(is_critical_percentile)
    return enriched


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
    predictions_frame = _enriched_prediction_rows(_load_predictions_frame())
    if not suspicious_accounts and risk_scores:
        suspicious_accounts = _top_risk_scores(risk_scores, 20)
    if not suspicious_accounts and not predictions_frame.empty:
        suspicious_accounts = predictions_frame[predictions_frame["__is_suspicious"]].to_dict(orient="records")
    if not investigation_cases and risk_scores:
        investigation_cases = _build_cases_from_scores(risk_scores)
    if not investigation_cases and not predictions_frame.empty:
        investigation_cases = [
            {
                "id": f"MDE-{24000 + index + 1}",
                "riskScore": int(round(float(row.get("ensemble_score", 0)) * 100)),
                "riskLevel": str(row.get("__risk_level", row.get("risk_level", "LOW"))).upper().title(),
                "pattern": "Uploaded data risk scoring",
                "accounts": 1,
                "amount": "N/A",
                "timeline": "Uploaded window",
                "status": "Open",
                "investigator": "Auto-assigned",
                "alerts": 1,
                "entities": [str(row.get("account_id", f"ACC-{index + 1:04d}"))],
            }
            for index, row in predictions_frame[predictions_frame["__is_suspicious"]].head(20).iterrows()
        ]
    if not alerts and risk_scores:
        alerts = _build_alerts_from_scores(risk_scores)
    if not alerts and not predictions_frame.empty:
        alerts = _build_alerts_from_scores(
            predictions_frame[predictions_frame["__is_suspicious"]].to_dict(orient="records")
        )
    pipeline_status = pipeline_orchestrator.status()

    derived = _derived_counts(risk_scores)
    frame_counts = _prediction_counts_from_frame(predictions_frame)

    total_accounts = int(prediction_summary.get("total_accounts_scored") or derived["total"] or frame_counts["total"])
    suspicious_count = int(
        prediction_summary.get("suspicious_accounts_count")
        or len(suspicious_accounts)
        or derived["suspicious"]
        or frame_counts["suspicious"]
    )
    critical_count = int(prediction_summary.get("critical_count") or derived["critical"] or frame_counts["critical"])
    high_count = int(prediction_summary.get("high_count") or derived["high"] or frame_counts["high"])
    medium_count = int(prediction_summary.get("medium_count") or derived["medium"] or frame_counts["medium"])
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

    return sanitize_json_value({
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
    })
