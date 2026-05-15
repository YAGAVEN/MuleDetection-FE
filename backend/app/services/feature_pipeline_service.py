"""Feature extraction stage service."""
from __future__ import annotations

import asyncio
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import pandas as pd

from .storage_service import storage_service


class FeaturePipelineService:
    def __init__(self) -> None:
        self.project_root = Path(__file__).resolve().parents[3]
        self.script_path = self.project_root / "Mule-data" / "feature_extraction_pipeline.py"

    async def run(self) -> Dict[str, Any]:
        if not self.script_path.exists():
            raise FileNotFoundError(f"Feature extraction script not found: {self.script_path}")

        env = dict(os.environ)
        env["FEATURE_PIPELINE_DATA_PATH"] = str(storage_service.temp_data_dir)
        env["FEATURE_PIPELINE_OUTPUT_PATH"] = str(storage_service.temp_data_dir)

        process = await asyncio.create_subprocess_exec(
            "python3",
            str(self.script_path),
            cwd=str(self.project_root),
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            raise RuntimeError(
                f"Feature pipeline failed (exit={process.returncode}): {stderr.decode('utf-8', errors='replace')}"
            )

        source = storage_service.temp_data_dir / "features_combined.csv"
        if not source.exists():
            raise FileNotFoundError("Feature pipeline completed but features_combined.csv not found in temp-data")

        engineered_csv = storage_service.temp_data_dir / "engineered_features.csv"
        shutil.copy2(source, engineered_csv)

        dataframe = pd.read_csv(engineered_csv)

        parquet_written = False
        parquet_path = storage_service.temp_data_dir / "engineered_features.parquet"
        try:
            dataframe.to_parquet(parquet_path, index=False)
            parquet_written = True
        except ImportError:
            parquet_written = False

        metadata = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "rows": int(len(dataframe)),
            "columns": int(len(dataframe.columns)),
            "source_csv": str(source),
            "engineered_csv": str(engineered_csv),
            "engineered_parquet": str(parquet_path) if parquet_written else "",
            "parquet_written": parquet_written,
            "stdout_tail": stdout.decode("utf-8", errors="replace")[-2000:],
        }
        storage_service.save_json("feature_metadata.json", metadata)
        return metadata


feature_pipeline_service = FeaturePipelineService()
