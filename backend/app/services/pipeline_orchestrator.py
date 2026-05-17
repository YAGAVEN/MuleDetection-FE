"""Orchestrates end-to-end AML pipeline after successful ingestion."""
from __future__ import annotations

import asyncio
import logging
import traceback
from datetime import datetime, timezone
from typing import Any, Dict

from .feature_pipeline_service import feature_pipeline_service
from .pipeline_status_service import pipeline_status_service
from .prediction_pipeline_service import prediction_pipeline_service
from .shap_report_service import shap_report_service
from .storage_service import storage_service


pipeline_logger = logging.getLogger("trinetra.pipeline")
if not pipeline_logger.handlers:
    pipeline_logger.setLevel(logging.INFO)
    handler = logging.FileHandler(storage_service.logs_dir / "pipeline.log", encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s - %(message)s"))
    pipeline_logger.addHandler(handler)


class PipelineOrchestrator:
    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        async with self._lock:
            if self._task and not self._task.done():
                pipeline_logger.info("Pipeline already running; skipping new start request")
                return
            self._task = asyncio.create_task(self._run_pipeline(), name="trinetra-pipeline-task")

    async def _run_pipeline(self) -> None:
        started_at = datetime.now(timezone.utc)
        pipeline_logger.info("Pipeline started")
        try:
            pipeline_status_service.set_stage(
                "feature_extraction",
                "running",
                "Extracting AML intelligence features... Analyzing transaction behavior, structuring patterns, and account relationships...",
            )
            feature_start = datetime.now(timezone.utc)
            feature_meta = await feature_pipeline_service.run()
            feature_duration = (datetime.now(timezone.utc) - feature_start).total_seconds()
            pipeline_logger.info("Feature extraction completed in %.2fs", feature_duration)
            pipeline_logger.info("Feature metadata: %s", feature_meta)

            pipeline_status_service.set_stage(
                "feature_extraction",
                "completed",
                "Feature extraction completed successfully. Prediction engine starting automatically...",
            )

            pipeline_status_service.set_stage(
                "prediction_engine",
                "running",
                "Running AI-based mule detection models... Analyzing graph relationships and behavioral anomalies...",
            )
            prediction_start = datetime.now(timezone.utc)
            prediction_summary = await prediction_pipeline_service.run()
            prediction_duration = (datetime.now(timezone.utc) - prediction_start).total_seconds()
            pipeline_logger.info("Prediction pipeline completed in %.2fs", prediction_duration)
            pipeline_logger.info("Prediction summary: %s", prediction_summary)

            pipeline_status_service.set_stage("prediction_engine", "completed")
            pipeline_status_service.set_stage(
                "case_generation",
                "running",
                "Generating investigation case outputs from suspicious accounts...",
            )

            await asyncio.sleep(0.2)
            
            # Generate SHAP model reports for suspicious accounts
            pipeline_status_service.set_stage(
                "case_generation",
                "running",
                "Generating SHAP model reports for suspicious accounts...",
            )
            shap_start = datetime.now(timezone.utc)
            shap_summary = await shap_report_service.generate_model_reports_for_suspicious_accounts()
            shap_duration = (datetime.now(timezone.utc) - shap_start).total_seconds()
            pipeline_logger.info("SHAP report generation completed in %.2fs", shap_duration)
            pipeline_logger.info("SHAP summary: %s", shap_summary)
            
            pipeline_status_service.set_stage(
                "case_generation",
                "completed",
                "Prediction pipeline completed successfully. SHAP model reports generated and ready for analysis.",
            )
            total_duration = (datetime.now(timezone.utc) - started_at).total_seconds()
            pipeline_logger.info("Pipeline completed successfully in %.2fs", total_duration)
        except Exception as exc:
            total_duration = (datetime.now(timezone.utc) - started_at).total_seconds()
            error_trace = traceback.format_exc()
            pipeline_logger.error("Pipeline failed in %.2fs: %s", total_duration, exc)
            pipeline_logger.error(error_trace)

            status = pipeline_status_service.get_status()
            if status.get("feature_extraction") == "running":
                pipeline_status_service.fail_stage(
                    "feature_extraction",
                    "Feature extraction failed. Pipeline stopped.",
                    str(exc),
                )
            elif status.get("prediction_engine") == "running":
                pipeline_status_service.fail_stage(
                    "prediction_engine",
                    "Prediction engine failed. Pipeline stopped.",
                    str(exc),
                )
            else:
                pipeline_status_service.fail_stage(
                    "case_generation",
                    "Case generation failed. Pipeline stopped.",
                    str(exc),
                )

    def is_running(self) -> bool:
        return self._task is not None and not self._task.done()

    def status(self) -> Dict[str, Any]:
        status = pipeline_status_service.get_status()
        status["is_running"] = self.is_running()
        return status


pipeline_orchestrator = PipelineOrchestrator()
