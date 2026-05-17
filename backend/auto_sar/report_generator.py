"""Top-level Auto-SAR report orchestration."""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
import math
from typing import Any, Dict, Optional

from .case_report_service import CaseReportService
from .export_service import GENERATED_DIR, export_service, logger
from .hydra_report_service import HydraReportService
from .investigation_analyzer import InvestigationAnalyzer
from .model_report_service import ModelReportService
from .pdf_builder import PDFBuilder


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _slug(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in value.strip())


def _sanitize(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _sanitize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_sanitize(item) for item in value]
    if isinstance(value, tuple):
        return [_sanitize(item) for item in value]
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if hasattr(value, "item") and not isinstance(value, (str, bytes)):
        try:
            return _sanitize(value.item())
        except Exception:
            return value
    return value


class AutoSARReportGenerator:
    def __init__(self) -> None:
        self.pdf_builder = PDFBuilder()
        self._refresh_context()

    def _refresh_context(self) -> None:
        self.analyzer = InvestigationAnalyzer()
        self.case_service = CaseReportService(self.analyzer)
        self.model_service = ModelReportService(self.analyzer)
        self.hydra_service = HydraReportService(self.analyzer)

    def list_cases(self, limit: int = 100) -> list[dict[str, Any]]:
        self._refresh_context()
        return self.case_service.list_cases(limit=limit)

    def get_case(self, case_id: str) -> dict[str, Any]:
        self._refresh_context()
        return self.case_service.get_case(case_id)

    def get_report(self, report_id: str) -> dict[str, Any]:
        record = export_service.get_report_record(report_id)
        if not record:
            raise ValueError(f"Report not found: {report_id}")
        report_json = export_service.get_report_json(report_id)
        if report_json is None:
            raise ValueError(f"Report payload not found: {report_id}")
        record["report"] = report_json
        return record

    def generate(self, request: Dict[str, Any]) -> Dict[str, Any]:
        self._refresh_context()
        report_type = request["report_type"]
        report_id = request.get("report_id") or f"ASR-{uuid.uuid4().hex[:10].upper()}"
        start = time.perf_counter()

        if report_type == "individual_account":
            account_id = request.get("account_id")
            if not account_id:
                raise ValueError("account_id is required for individual_account reports")
            report = self.analyzer.build_individual_account_report(
                account_id=account_id,
                investigator_name=request.get("investigator_name"),
                classification_level=request.get("classification_level"),
            )
        elif report_type == "related_account_network":
            account_id = request.get("account_id")
            if not account_id:
                raise ValueError("account_id is required for related_account_network reports")
            report = self.analyzer.build_related_account_report(
                account_id=account_id,
                investigator_name=request.get("investigator_name"),
                classification_level=request.get("classification_level"),
                depth=int(request.get("depth", 2)),
            )
        elif report_type in {"full_investigation", "entire_investigation"}:
            report = self.analyzer.build_master_investigation_report(
                investigator_name=request.get("investigator_name"),
                classification_level=request.get("classification_level"),
            )
        elif report_type == "all_cases":
            report = self.analyzer.build_all_cases_report(
                investigator_name=request.get("investigator_name"),
                classification_level=request.get("classification_level"),
            )
        elif report_type == "prediction_model":
            report = self.model_service.build_report(
                account_id=request.get("account_id"),
                investigator_name=request.get("investigator_name"),
                classification_level=request.get("classification_level"),
            )
        elif report_type == "hydra_training":
            report = self.hydra_service.build_report(
                investigator_name=request.get("investigator_name"),
                classification_level=request.get("classification_level"),
            )
        else:
            raise ValueError(f"Unsupported report type: {report_type}")

        report["report_id"] = report_id
        report["generated_at"] = _utc_now()
        report["report_type"] = report_type
        report["duration_ms"] = round((time.perf_counter() - start) * 1000, 2)
        report = _sanitize(report)

        pdf_name = report.get("output_filename") or f"{_slug(report.get('title', report_id))}.pdf"
        report["output_filename"] = pdf_name
        report_path = self.pdf_builder.build_pdf(report, GENERATED_DIR / pdf_name)
        report["pdf_path"] = str(report_path)

        json_path = export_service.save_report_json(report_id, report)
        export_service.register_report(
            {
                "report_id": report_id,
                "report_type": report_type,
                "title": report.get("title", report_id),
                "account_id": report.get("account_id"),
                "case_id": report.get("case_id"),
                "risk_level": report.get("risk_level"),
                "created_at": report["generated_at"],
                "pdf_path": str(report_path),
                "json_path": str(json_path),
            }
        )
        logger.info("Generated %s report %s in %.2fms", report_type, report_id, report["duration_ms"])

        return {
            "report_id": report_id,
            "report_type": report_type,
            "title": report.get("title"),
            "risk_level": report.get("risk_level"),
            "pdf_path": str(report_path),
            "json_path": str(json_path),
            "generated_at": report["generated_at"],
            "summary": report.get("summary", {}),
        }

    def get_pdf_path(self, report_id: str) -> Path:
        record = export_service.get_report_record(report_id)
        if not record:
            raise ValueError(f"Report not found: {report_id}")
        return Path(record["pdf_path"])


report_generator = AutoSARReportGenerator()
