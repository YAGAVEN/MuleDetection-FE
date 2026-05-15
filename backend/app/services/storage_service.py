"""Storage management for ingestion artifacts."""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any, Dict


class StorageService:
    def __init__(self) -> None:
        backend_root = Path(__file__).resolve().parents[2]
        project_root = Path(__file__).resolve().parents[3]
        self.temp_data_dir = backend_root / "temp-data"
        self.logs_dir = backend_root / "logs"
        self.mule_data_dir = project_root / "Mule-data"

        self.temp_data_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)

    def save_csv(self, filename: str, content: bytes) -> str:
        output = self.temp_data_dir / filename
        output.write_bytes(content)
        return str(output)

    def save_json(self, filename: str, data: Dict[str, Any]) -> str:
        output = self.temp_data_dir / filename
        output.write_text(json.dumps(data, indent=2), encoding="utf-8")
        return str(output)

    def mirror_to_feature_pipeline(self, filename: str) -> None:
        source = self.temp_data_dir / filename
        if not source.exists() or not self.mule_data_dir.exists():
            return
        destination = self.mule_data_dir / filename
        shutil.copy2(source, destination)

    def clear_ingestion_data(self) -> None:
        for filename in [
            "master.csv",
            "transactions_full.csv",
            "validation-report.json",
            "ingestion-metadata.json",
            "features_combined.csv",
            "engineered_features.csv",
            "engineered_features.parquet",
            "feature_metadata.json",
            "predictions.csv",
            "predictions.parquet",
            "prediction_summary.json",
            "suspicious_accounts.json",
            "risk_scores.json",
        ]:
            target = self.temp_data_dir / filename
            if target.exists():
                target.unlink()

    def exists(self, filename: str) -> bool:
        return (self.temp_data_dir / filename).exists()


storage_service = StorageService()
