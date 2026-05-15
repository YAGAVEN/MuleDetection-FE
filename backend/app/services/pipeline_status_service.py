"""Pipeline status manager for ingestion -> feature -> prediction workflow."""
from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Any, Dict


ALLOWED_STATES = {"pending", "running", "completed", "failed"}


class PipelineStatusService:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._status: Dict[str, Any] = {}
        self.reset()

    def reset(self) -> None:
        with self._lock:
            self._status = {
                "ingestion": "pending",
                "feature_extraction": "pending",
                "prediction_engine": "pending",
                "case_generation": "pending",
                "message": "Awaiting upload.",
                "error": None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

    def set_stage(self, stage: str, state: str, message: str | None = None) -> None:
        if state not in ALLOWED_STATES:
            raise ValueError(f"Invalid pipeline state: {state}")
        with self._lock:
            self._status[stage] = state
            if message:
                self._status["message"] = message
            self._status["updated_at"] = datetime.now(timezone.utc).isoformat()
            if state != "failed":
                self._status["error"] = None

    def fail_stage(self, stage: str, message: str, error: str) -> None:
        with self._lock:
            self._status[stage] = "failed"
            self._status["message"] = message
            self._status["error"] = error
            self._status["updated_at"] = datetime.now(timezone.utc).isoformat()

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._status)


pipeline_status_service = PipelineStatusService()
