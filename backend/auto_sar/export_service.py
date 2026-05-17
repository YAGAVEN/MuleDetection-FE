"""Persistence and logging for Auto-SAR outputs."""

from __future__ import annotations

import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, Dict


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPORTS_DIR = BACKEND_ROOT / "reports"
GENERATED_DIR = REPORTS_DIR / "generated"
TEMPLATES_DIR = REPORTS_DIR / "templates"
ASSETS_DIR = REPORTS_DIR / "assets"
TEMP_DATA_DIR = BACKEND_ROOT / "temp-data"
SHAP_DIR = TEMP_DATA_DIR / "shap"
LOGS_DIR = BACKEND_ROOT / "logs"
LOG_FILE = LOGS_DIR / "auto_sar.log"
MANIFEST_FILE = GENERATED_DIR / "report_index.json"


def ensure_directories() -> None:
    for directory in (REPORTS_DIR, GENERATED_DIR, TEMPLATES_DIR, ASSETS_DIR, TEMP_DATA_DIR, SHAP_DIR, LOGS_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def _build_logger() -> logging.Logger:
    ensure_directories()
    logger = logging.getLogger("auto_sar")
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    handler = RotatingFileHandler(LOG_FILE, maxBytes=1_000_000, backupCount=3)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(handler)
    logger.propagate = False
    return logger


logger = _build_logger()


class AutoSARExportService:
    def __init__(self) -> None:
        ensure_directories()

    def save_report_json(self, report_id: str, payload: Dict[str, Any]) -> Path:
        path = GENERATED_DIR / f"{report_id}.json"
        path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
        return path

    def register_report(self, metadata: Dict[str, Any]) -> None:
        manifest = self.load_manifest()
        manifest[metadata["report_id"]] = metadata
        MANIFEST_FILE.write_text(json.dumps(manifest, indent=2, default=str), encoding="utf-8")

    def load_manifest(self) -> Dict[str, Any]:
        if not MANIFEST_FILE.exists():
            return {}
        return json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))

    def get_report_record(self, report_id: str) -> Dict[str, Any] | None:
        return self.load_manifest().get(report_id)

    def get_report_json(self, report_id: str) -> Dict[str, Any] | None:
        path = GENERATED_DIR / f"{report_id}.json"
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def log_event(self, message: str, *, level: str = "info") -> None:
        getattr(logger, level, logger.info)(message)


export_service = AutoSARExportService()
