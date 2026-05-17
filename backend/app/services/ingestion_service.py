"""Business service for ingestion workflow."""
from __future__ import annotations

import asyncio
import logging
import json
from datetime import datetime, timezone
from typing import Any, Dict

from .storage_service import storage_service
from .validation_service import validation_service
from ..data.loader import invalidate_cache


logger = logging.getLogger("trinetra.ingestion")
if not logger.handlers:
    logger.setLevel(logging.INFO)
    file_handler = logging.FileHandler(
        storage_service.logs_dir / "ingestion.log",
        encoding="utf-8",
    )
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s - %(message)s")
    )
    logger.addHandler(file_handler)


class IngestionService:
    def process_upload(self, master_content: bytes, tx_content: bytes) -> Dict[str, Any]:
        result = validation_service.validate(master_content, tx_content)
        if result["status"] == "error":
            logger.warning("Ingestion validation failed with %s errors", len(result["errors"]))
            return result

        storage_service.save_csv("master.csv", master_content)
        storage_service.save_csv("transactions_full.csv", tx_content)
        storage_service.mirror_to_feature_pipeline("master.csv")
        storage_service.mirror_to_feature_pipeline("transactions_full.csv")

        metadata = {
            "ingestion_time": datetime.now(timezone.utc).isoformat(),
            "master_rows": result["files_summary"]["master.csv"]["rows"],
            "transaction_rows": result["files_summary"]["transactions_full.csv"]["rows"],
            "date_range": result["report"]["date_range"],
            "validation_status": "success",
            "feature_pipeline_ready": True,
        }
        storage_service.save_json("validation-report.json", result["report"])
        storage_service.save_json("ingestion-metadata.json", metadata)
        invalidate_cache()

        logger.info(
            "Ingestion successful. master_rows=%s transaction_rows=%s",
            metadata["master_rows"],
            metadata["transaction_rows"],
        )
        
        # Update pipeline status
        try:
            from .pipeline_status_service import pipeline_status_service
            # Start every new upload with a fresh stage state so UI does not reuse
            # "completed" states from previous runs.
            pipeline_status_service.reset()
            pipeline_status_service.set_stage(
                "ingestion",
                "completed",
                "Data ingestion completed successfully. Files stored in temp-data. Feature extraction pipeline starting...",
            )
        except Exception as e:
            logger.error("Failed to update ingestion status: %s", str(e))
        
        # Trigger pipeline orchestration asynchronously
        try:
            from .pipeline_orchestrator import pipeline_orchestrator
            asyncio.create_task(pipeline_orchestrator.start())
            logger.info("Pipeline orchestration triggered")
        except Exception as e:
            logger.error("Failed to trigger pipeline: %s", str(e))
        
        result["metadata"] = metadata
        return result

    def get_status(self) -> Dict[str, Any]:
        has_master = storage_service.exists("master.csv")
        has_tx = storage_service.exists("transactions_full.csv")
        has_report = storage_service.exists("validation-report.json")
        has_metadata = storage_service.exists("ingestion-metadata.json")
        return {
            "status": "ready" if all([has_master, has_tx, has_report, has_metadata]) else "not_ready",
            "files_present": {
                "master.csv": has_master,
                "transactions_full.csv": has_tx,
                "validation-report.json": has_report,
                "ingestion-metadata.json": has_metadata,
            },
            "feature_pipeline_ready": all([has_master, has_tx, has_report, has_metadata]),
        }

    def get_summary(self) -> Dict[str, Any]:
        report_path = storage_service.temp_data_dir / "validation-report.json"
        metadata_path = storage_service.temp_data_dir / "ingestion-metadata.json"

        summary: Dict[str, Any] = {"status": "not_ready"}
        if report_path.exists():
            summary["validation_report"] = json.loads(report_path.read_text(encoding="utf-8"))
        if metadata_path.exists():
            summary["ingestion_metadata"] = json.loads(metadata_path.read_text(encoding="utf-8"))
        if report_path.exists() and metadata_path.exists():
            summary["status"] = "ready"
        return summary

    def clear(self) -> Dict[str, Any]:
        storage_service.clear_ingestion_data()
        invalidate_cache()
        try:
            from .pipeline_status_service import pipeline_status_service
            pipeline_status_service.reset()
            logger.info("Pipeline status reset")
        except Exception as e:
            logger.error("Failed to reset pipeline status: %s", str(e))
        logger.info("Ingestion temp data cleared")
        return {"status": "success", "message": "Ingestion data cleared"}


ingestion_service = IngestionService()
