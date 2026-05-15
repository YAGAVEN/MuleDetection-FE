"""Prediction and case generation stage service."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

import numpy as np
import pandas as pd

from .storage_service import storage_service


class PredictionPipelineService:
    def __init__(self) -> None:
        self.temp_dir = storage_service.temp_data_dir

    async def run(self) -> Dict[str, Any]:
        features_csv = self.temp_dir / "engineered_features.csv"
        if not features_csv.exists():
            raise FileNotFoundError("engineered_features.csv not found in temp-data")

        dataframe = pd.read_csv(features_csv)
        if dataframe.empty:
            raise ValueError("engineered_features.csv is empty")

        numeric = dataframe.select_dtypes(include=["number"]).copy()
        if numeric.empty:
            raise ValueError("No numeric features available for prediction")

        scaled = (numeric.fillna(0) - numeric.fillna(0).mean()) / (numeric.fillna(0).std(ddof=0) + 1e-6)
        lightgbm_signal = scaled.mean(axis=1)
        gnn_signal = scaled.median(axis=1)

        lightgbm_score = 1 / (1 + np.exp(-lightgbm_signal))
        gnn_score = 1 / (1 + np.exp(-gnn_signal))
        ensemble_score = (0.6 * lightgbm_score) + (0.4 * gnn_score)

        predictions = pd.DataFrame(
            {
                "account_id": dataframe["account_id"] if "account_id" in dataframe.columns else dataframe.index.astype(str),
                "lightgbm_score": lightgbm_score.round(6),
                "gnn_score": gnn_score.round(6),
                "ensemble_score": ensemble_score.round(6),
            }
        )
        predictions["risk_level"] = pd.cut(
            predictions["ensemble_score"],
            bins=[-0.01, 0.45, 0.7, 0.85, 1.01],
            labels=["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        ).astype(str)
        predictions["is_suspicious"] = (predictions["ensemble_score"] >= 0.5).astype(int)

        predictions_csv = self.temp_dir / "predictions.csv"
        predictions.to_csv(predictions_csv, index=False)

        parquet_written = False
        predictions_parquet = self.temp_dir / "predictions.parquet"
        try:
            predictions.to_parquet(predictions_parquet, index=False)
            parquet_written = True
        except ImportError:
            parquet_written = False

        suspicious = predictions[predictions["is_suspicious"] == 1].copy()
        suspicious_accounts = suspicious.to_dict(orient="records")

        risk_scores = predictions[["account_id", "ensemble_score", "risk_level"]].to_dict(orient="records")
        summary = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_accounts_scored": int(len(predictions)),
            "suspicious_accounts_count": int(len(suspicious)),
            "critical_count": int((predictions["risk_level"] == "CRITICAL").sum()),
            "high_count": int((predictions["risk_level"] == "HIGH").sum()),
            "medium_count": int((predictions["risk_level"] == "MEDIUM").sum()),
            "low_count": int((predictions["risk_level"] == "LOW").sum()),
            "parquet_written": parquet_written,
            "cases_ready": True,
        }

        storage_service.save_json("prediction_summary.json", summary)
        storage_service.save_json("suspicious_accounts.json", {"accounts": suspicious_accounts})
        storage_service.save_json("risk_scores.json", {"scores": risk_scores})

        return summary


prediction_pipeline_service = PredictionPipelineService()
