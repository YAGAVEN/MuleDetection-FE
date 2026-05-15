"""Response builders for ingestion APIs."""
from __future__ import annotations

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
