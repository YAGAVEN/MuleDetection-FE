"""Response builders for ingestion APIs."""
from __future__ import annotations

import math
from datetime import date, datetime
from typing import Any, Dict, List


def ingestion_success_response(
    files: Dict[str, Dict[str, Any]],
    storage_location: str,
    feature_pipeline_ready: bool,
    summary: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "status": "success",
        "message": "Data ingestion completed",
        "files": files,
        "storage_location": storage_location,
        "feature_pipeline_ready": feature_pipeline_ready,
        "summary": summary,
    }


def ingestion_error_response(errors: List[Dict[str, str]]) -> Dict[str, Any]:
    return {
        "status": "error",
        "message": "Validation failed",
        "errors": errors,
    }


def sanitize_json_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: sanitize_json_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [sanitize_json_value(item) for item in value]
    if isinstance(value, tuple):
        return [sanitize_json_value(item) for item in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if hasattr(value, "item") and not isinstance(value, (str, bytes)):
        try:
            return sanitize_json_value(value.item())
        except Exception:
            return value
    return value
