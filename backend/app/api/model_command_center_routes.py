"""Model Command Center API endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter

from ..services.ml_models import get_model_manager
from ..services.model_command_center_service import model_command_center_service
from ..services.storage_service import storage_service


router = APIRouter(prefix="/api/model-command-center", tags=["Model Command Center"])


def _to_float_or_none(value: Any) -> float | None:
    try:
        if value is None:
            return None
        if isinstance(value, str):
            value = value.strip().replace("%", "")
        return float(value)
    except (TypeError, ValueError):
        return None


@router.get("/details")
async def get_model_command_center_details() -> Dict[str, Any]:
    """Return persisted Model Command Center details."""
    payload = model_command_center_service.load_details()

    model_manager = get_model_manager()
    model_stats = model_manager.get_model_stats()
    payload = model_command_center_service.update_model_versions(model_stats)

    prediction_summary = storage_service.load_json("prediction_summary.json") or {}
    latency_value = _to_float_or_none((prediction_summary or {}).get("latency_ms"))
    accuracy_value = _to_float_or_none((prediction_summary or {}).get("accuracy"))

    payload = model_command_center_service.update_from_prediction_summary(
        prediction_summary=prediction_summary,
        accuracy_value=accuracy_value,
        latency_ms=latency_value,
    )

    payload["model_info"] = model_stats
    return payload


@router.get("/version")
async def get_model_command_center_version() -> Dict[str, Any]:
    """Return model command center version metadata."""
    payload = model_command_center_service.load_details()
    return {
        "version": payload.get("version", 1),
        "gan_version": payload.get("model_versions", {}).get("gan", "gan_v1.0"),
        "updated_at": payload.get("updated_at", datetime.now(timezone.utc).isoformat()),
    }
