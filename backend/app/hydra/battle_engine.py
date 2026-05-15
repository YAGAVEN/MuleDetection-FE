"""HYDRA attacker-vs-defender battle engine using existing models."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List

import numpy as np
import pandas as pd

from ..data import get_account_features
from ..services.ml_models import get_model_manager


def _vector_to_features(vector: np.ndarray, feature_names: List[str]) -> Dict[str, float]:
    mapped: Dict[str, float] = {}
    for index, name in enumerate(feature_names):
        source = float(vector[index % len(vector)]) if len(vector) else 0.0
        # Keep values in stable range for existing predictors
        if "count" in name or "counterparties" in name:
            mapped[name] = max(0.0, min(200.0, abs(source) * 10.0))
        elif "ratio" in name or "pct" in name or "entropy" in name:
            mapped[name] = max(0.0, min(1.0, abs(source)))
        elif "hours" in name:
            mapped[name] = max(0.0, min(48.0, abs(source) * 24.0))
        elif "days" in name:
            mapped[name] = max(0.0, min(3650.0, abs(source) * 365.0))
        elif "credit" in name or "balance" in name or "flow" in name or "amount" in name:
            mapped[name] = max(0.0, min(5_000_000.0, abs(source) * 100_000.0))
        else:
            mapped[name] = max(0.0, min(1.0, abs(source)))
    return mapped


class BattleEngine:
    def run_round(self, attack_batch_size: int = 32) -> Dict:
        model_manager = get_model_manager()
        from ..services.gan_training import get_gan_service

        gan_service = get_gan_service()

        synthetic = gan_service.generate_synthetic_data(attack_batch_size)
        synthetic_vectors = synthetic.get("data", [])
        if not synthetic_vectors:
            synthetic_vectors = np.zeros((attack_batch_size, len(model_manager.ensemble.lgbm.feature_names))).tolist()

        feature_names = model_manager.ensemble.lgbm.feature_names
        attacks_evaluated = 0
        detected = 0
        attack_scores: List[float] = []
        defender_scores: List[float] = []

        for index, vector in enumerate(synthetic_vectors):
            feature_map = _vector_to_features(np.array(vector, dtype=float), feature_names)
            prediction = model_manager.predict_mule_score(f"HYDRA_SYN_{index}", feature_map)
            attacks_evaluated += 1
            ensemble_score = float(prediction["ensemble_score"])
            defender_detected = ensemble_score >= 50.0
            if defender_detected:
                detected += 1
            attack_scores.append(max(0.0, 100.0 - ensemble_score))
            defender_scores.append(ensemble_score)

        attack_success_rate = ((attacks_evaluated - detected) / attacks_evaluated) if attacks_evaluated else 0.0
        detection_rate = (detected / attacks_evaluated) if attacks_evaluated else 0.0

        # Baseline from current real feature pipeline coverage
        baseline_rows = get_account_features().head(64)
        feature_names = model_manager.ensemble.lgbm.feature_names
        baseline_detected = 0
        for _, row in baseline_rows.iterrows():
            baseline_features = {}
            for feature_name in feature_names:
                value = row.get(feature_name, 0.0)
                if pd.isna(value):
                    value = 0.0
                baseline_features[feature_name] = float(value)
            baseline_prediction = model_manager.predict_mule_score(
                str(row.get("account_id", f"BASE_{baseline_detected}")),
                baseline_features,
            )
            if float(baseline_prediction["ensemble_score"]) >= 50.0:
                baseline_detected += 1
        baseline_detection_rate = (baseline_detected / len(baseline_rows)) if len(baseline_rows) else 0.0

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "attacks_evaluated": attacks_evaluated,
            "detected_attacks": detected,
            "attack_success_rate": round(attack_success_rate, 6),
            "detection_rate": round(detection_rate, 6),
            "baseline_detection_rate": round(baseline_detection_rate, 6),
            "attacker_score": round(float(np.mean(attack_scores)) if attack_scores else 0.0, 2),
            "defender_score": round(float(np.mean(defender_scores)) if defender_scores else 0.0, 2),
            "active_attack_type": "rapid_passthrough_mutation",
        }
