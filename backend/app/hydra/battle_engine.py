"""HYDRA attacker-vs-defender battle engine using existing models."""
from __future__ import annotations

from datetime import datetime, timezone
import logging
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

from ..data import get_account_features
from ..services.ml_models import get_model_manager

logger = logging.getLogger(__name__)
HYDRA_DETECTION_THRESHOLD = 15.0


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


def _safe_float(value: object, default: float = 0.0) -> float:
    try:
        if pd.isna(value):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _row_to_features(row: pd.Series, feature_names: List[str]) -> Dict[str, float]:
    return {feature_name: _safe_float(row.get(feature_name, 0.0)) for feature_name in feature_names}


class BattleEngine:
    def _mock_attack_features(self, feature_names: List[str], attack_batch_size: int) -> List[Dict[str, float]]:
        """Generate explicit adversarial mock payloads when GAN weights are not loaded."""
        rng = np.random.default_rng()
        profiles = [
            {
                "attack_type": "layering_scheme",
                "unique_counterparties": 42,
                "fan_in_ratio": 0.88,
                "fan_out_ratio": 0.72,
                "sender_concentration": 0.82,
                "channel_entropy": 0.92,
                "mean_passthrough_hours": 3.5,
                "pct_within_6h": 0.84,
                "structuring_40k_50k_pct": 0.62,
                "amt_exact_50k_pct": 0.48,
                "credit_debit_ratio": 2.4,
                "avg_txn_amount": 48500,
                "avg_credit": 98000,
                "total_credit": 1_850_000,
                "net_flow": 1_120_000,
                "txn_count": 96,
                "ch_upi_debit_pct": 0.74,
                "ch_ftd_pct": 0.66,
                "ch_upi_credit_pct": 0.71,
                "min_passthrough_hours": 0.4,
                "mean_gap_days": 0.18,
                "max_gap_days": 1.2,
                "amt_exact_25k_pct": 0.42,
                "txn_pre_mobile_30d": 8,
                "weekend_txn_pct": 0.64,
                "night_txn_pct": 0.37,
            },
            {
                "attack_type": "smurfing_burst",
                "unique_counterparties": 24,
                "fan_in_ratio": 0.94,
                "fan_out_ratio": 0.35,
                "sender_concentration": 0.68,
                "channel_entropy": 0.78,
                "mean_passthrough_hours": 1.8,
                "pct_within_6h": 0.91,
                "structuring_40k_50k_pct": 0.74,
                "amt_exact_50k_pct": 0.58,
                "credit_debit_ratio": 1.9,
                "avg_txn_amount": 43200,
                "avg_credit": 87000,
                "total_credit": 980_000,
                "net_flow": 640_000,
                "txn_count": 64,
                "ch_upi_debit_pct": 0.82,
                "ch_ftd_pct": 0.58,
                "ch_upi_credit_pct": 0.69,
                "min_passthrough_hours": 0.25,
                "mean_gap_days": 0.12,
                "max_gap_days": 0.8,
                "amt_exact_25k_pct": 0.36,
                "txn_pre_mobile_30d": 11,
                "weekend_txn_pct": 0.58,
                "night_txn_pct": 0.44,
            },
            {
                "attack_type": "round_tripping",
                "unique_counterparties": 17,
                "fan_in_ratio": 0.56,
                "fan_out_ratio": 0.81,
                "sender_concentration": 0.51,
                "channel_entropy": 0.88,
                "mean_passthrough_hours": 4.2,
                "pct_within_6h": 0.76,
                "structuring_40k_50k_pct": 0.35,
                "amt_exact_50k_pct": 0.28,
                "credit_debit_ratio": 2.1,
                "avg_txn_amount": 72500,
                "avg_credit": 126000,
                "total_credit": 2_420_000,
                "net_flow": 110_000,
                "txn_count": 48,
                "ch_upi_debit_pct": 0.61,
                "ch_ftd_pct": 0.72,
                "ch_upi_credit_pct": 0.63,
                "min_passthrough_hours": 0.6,
                "mean_gap_days": 0.2,
                "max_gap_days": 1.6,
                "amt_exact_25k_pct": 0.31,
                "txn_pre_mobile_30d": 5,
                "weekend_txn_pct": 0.49,
                "night_txn_pct": 0.52,
            },
        ]

        attacks: List[Dict[str, float]] = []
        for index in range(attack_batch_size):
            profile = profiles[index % len(profiles)]
            feature_map = {feature_name: 0.0 for feature_name in feature_names}
            for feature_name in feature_names:
                if feature_name in profile:
                    jitter = 1.0 + float(rng.normal(0.0, 0.06))
                    feature_map[feature_name] = max(0.0, float(profile[feature_name]) * jitter)
            feature_map["_attack_type"] = profile["attack_type"]
            attacks.append(feature_map)
        return attacks

    def _generate_attack_batch(
        self,
        feature_names: List[str],
        attack_batch_size: int,
    ) -> Tuple[List[Dict[str, float]], str]:
        try:
            from ..services.gan_training import get_gan_service

            gan_service = get_gan_service()
            synthetic = gan_service.generate_synthetic_data(attack_batch_size)
            synthetic_vectors = synthetic.get("data", [])
            if synthetic_vectors:
                return [
                    {
                        **_vector_to_features(np.array(vector, dtype=float), feature_names),
                        "_attack_type": "gan_evasive_payload",
                    }
                    for vector in synthetic_vectors
                ], "gan"
        except Exception as exc:
            logger.info("HYDRA using mock attack payloads because GAN is unavailable: %s", exc)

        return self._mock_attack_features(feature_names, attack_batch_size), "mock"

    def evaluate_model_accuracy(self, limit: int = 96) -> Dict[str, float | int | None]:
        model_manager = get_model_manager()
        feature_names = model_manager.ensemble.lgbm.feature_names
        try:
            baseline_rows = get_account_features().head(limit)
        except Exception as exc:
            logger.info("HYDRA baseline accuracy skipped because feature data is unavailable: %s", exc)
            return {
                "model_accuracy": None,
                "baseline_detection_rate": 0.0,
                "baseline_samples": 0,
                "true_positive": 0,
                "true_negative": 0,
                "false_positive": 0,
                "false_negative": 0,
                "confusion_matrix": {
                    "true_positive": 0,
                    "true_negative": 0,
                    "false_positive": 0,
                    "false_negative": 0,
                },
            }

        if baseline_rows.empty:
            return {
                "model_accuracy": None,
                "baseline_detection_rate": 0.0,
                "baseline_samples": 0,
                "true_positive": 0,
                "true_negative": 0,
                "false_positive": 0,
                "false_negative": 0,
                "confusion_matrix": {
                    "true_positive": 0,
                    "true_negative": 0,
                    "false_positive": 0,
                    "false_negative": 0,
                },
            }

        true_positive = true_negative = false_positive = false_negative = 0
        detected = 0
        labeled = "is_mule" in baseline_rows.columns

        for _, row in baseline_rows.iterrows():
            baseline_features = _row_to_features(row, feature_names)
            baseline_prediction = model_manager.predict_mule_score(
                str(row.get("account_id", f"BASE_{detected}")),
                baseline_features,
            )
            predicted_positive = float(baseline_prediction["ensemble_score"]) >= HYDRA_DETECTION_THRESHOLD
            if predicted_positive:
                detected += 1

            if labeled:
                actual_positive = _safe_float(row.get("is_mule", 0.0)) >= 0.5
                if predicted_positive and actual_positive:
                    true_positive += 1
                elif predicted_positive and not actual_positive:
                    false_positive += 1
                elif not predicted_positive and actual_positive:
                    false_negative += 1
                else:
                    true_negative += 1

        total = int(len(baseline_rows))
        correct = true_positive + true_negative
        accuracy = (correct / total) if labeled and total else None
        detection_rate = detected / total if total else 0.0
        return {
            "model_accuracy": round(accuracy, 6) if accuracy is not None else None,
            "baseline_detection_rate": round(detection_rate, 6),
            "baseline_samples": total,
            "true_positive": true_positive,
            "true_negative": true_negative,
            "false_positive": false_positive,
            "false_negative": false_negative,
            "confusion_matrix": {
                "true_positive": true_positive,
                "true_negative": true_negative,
                "false_positive": false_positive,
                "false_negative": false_negative,
            },
        }

    def run_round(self, attack_batch_size: int = 32) -> Dict:
        model_manager = get_model_manager()
        feature_names = model_manager.ensemble.lgbm.feature_names
        attack_batch, attack_source = self._generate_attack_batch(feature_names, attack_batch_size)
        attacks_evaluated = 0
        detected = 0
        attack_scores: List[float] = []
        defender_scores: List[float] = []
        attack_types: List[str] = []

        for index, feature_map in enumerate(attack_batch):
            attack_type = str(feature_map.pop("_attack_type", "adversarial_payload"))
            prediction = model_manager.predict_mule_score(f"HYDRA_SYN_{index}", feature_map)
            attacks_evaluated += 1
            ensemble_score = float(prediction["ensemble_score"])
            defender_detected = ensemble_score >= HYDRA_DETECTION_THRESHOLD
            if defender_detected:
                detected += 1
            attack_scores.append(max(0.0, 100.0 - ensemble_score))
            defender_scores.append(ensemble_score)
            attack_types.append(attack_type)

        attack_success_rate = ((attacks_evaluated - detected) / attacks_evaluated) if attacks_evaluated else 0.0
        detection_rate = (detected / attacks_evaluated) if attacks_evaluated else 0.0
        accuracy = self.evaluate_model_accuracy(limit=64)
        active_attack_type = attack_types[-1] if attack_types else "mock_adversarial_payload"

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "attacks_evaluated": attacks_evaluated,
            "detected_attacks": detected,
            "attack_success_rate": round(attack_success_rate, 6),
            "detection_rate": round(detection_rate, 6),
            "adversarial_accuracy": round(detection_rate, 6),
            "baseline_detection_rate": accuracy["baseline_detection_rate"],
            "model_accuracy": accuracy["model_accuracy"],
            "baseline_samples": accuracy["baseline_samples"],
            "confusion_matrix": {
                "true_positive": accuracy["true_positive"],
                "true_negative": accuracy["true_negative"],
                "false_positive": accuracy["false_positive"],
                "false_negative": accuracy["false_negative"],
            },
            "attack_source": attack_source,
            "detection_threshold": HYDRA_DETECTION_THRESHOLD,
            "attacker_score": round(float(np.mean(attack_scores)) if attack_scores else 0.0, 2),
            "defender_score": round(float(np.mean(defender_scores)) if defender_scores else 0.0, 2),
            "active_attack_type": active_attack_type,
        }
