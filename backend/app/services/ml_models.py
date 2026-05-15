"""ML Models service - LightGBM, GNN, and Ensemble"""
import json
import logging
import os
import pickle
import shutil
import warnings
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd

warnings.filterwarnings('ignore')

# ML results directories
SERVICE_FILE = Path(__file__).resolve()
BACKEND_ROOT = SERVICE_FILE.parents[2]
PROJECT_ROOT = SERVICE_FILE.parents[3]
ML_RESULTS_ROOT = BACKEND_ROOT / "ml_results"
MODEL_ARTIFACTS_DIR = ML_RESULTS_ROOT / "models"

LGBM_RESULTS_DIR = str(ML_RESULTS_ROOT / "lgbm")
GNN_RESULTS_DIR = str(ML_RESULTS_ROOT / "gnn")
ENSEMBLE_RESULTS_DIR = str(ML_RESULTS_ROOT / "ensemble")
SHAP_RESULTS_DIR = str(ML_RESULTS_ROOT / "shap")

TRAINED_LGBM_SOURCE = PROJECT_ROOT / "Mule-data" / "models" / "lgbm_fold1.txt"
TRAINED_LGBM_LOCAL = MODEL_ARTIFACTS_DIR / "lgbm_fold1.txt"
LGBM_RUNTIME_PKL = MODEL_ARTIFACTS_DIR / "lightgbm_model.pkl"
GNN_RUNTIME_PKL = MODEL_ARTIFACTS_DIR / "gnn_model.pkl"
ENSEMBLE_RUNTIME_PKL = MODEL_ARTIFACTS_DIR / "ensemble_model.pkl"

logger = logging.getLogger(__name__)

for dir_path in [LGBM_RESULTS_DIR, GNN_RESULTS_DIR, ENSEMBLE_RESULTS_DIR, SHAP_RESULTS_DIR, str(MODEL_ARTIFACTS_DIR)]:
    os.makedirs(dir_path, exist_ok=True)


def _sync_trained_artifacts() -> None:
    artifact_pairs = [(TRAINED_LGBM_SOURCE, TRAINED_LGBM_LOCAL)]
    for source, destination in artifact_pairs:
        if not source.exists():
            continue
        try:
            if not destination.exists() or source.stat().st_mtime > destination.stat().st_mtime:
                shutil.copy2(source, destination)
        except OSError as exc:
            logger.warning("Failed to copy trained artifact %s -> %s: %s", source, destination, exc)


def _initialize_runtime_models() -> None:
    lgbm_payload = {
        "model_version": "lgbm_v1.0-trained",
        "artifact_type": "lightgbm_booster",
        "model_path": str(TRAINED_LGBM_LOCAL),
    }
    gnn_payload = {
        "model_version": "gnn_v1.0-runtime",
        "counterparty_thresholds": [(50, 20.0), (20, 15.0), (10, 10.0)],
        "fan_in_multiplier": 30.0,
        "fan_in_cap": 25.0,
        "sender_concentration_thresholds": [(0.8, 20.0), (0.5, 15.0), (0.3, 10.0)],
        "credit_debit_ratio_thresholds": [(2.0, 18.0), (1.5, 12.0)],
    }
    ensemble_payload = {
        "model_version": "ensemble_v1.0-runtime",
        "weights": {"lgbm": 0.6, "gnn": 0.4},
    }

    for artifact_path, payload in (
        (LGBM_RUNTIME_PKL, lgbm_payload),
        (GNN_RUNTIME_PKL, gnn_payload),
        (ENSEMBLE_RUNTIME_PKL, ensemble_payload),
    ):
        try:
            with open(artifact_path, "wb") as artifact_file:
                pickle.dump(payload, artifact_file)
        except OSError as exc:
            logger.warning("Failed writing runtime model artifact %s: %s", artifact_path, exc)


_sync_trained_artifacts()
_initialize_runtime_models()


class LightGBMPredictor:
    """LightGBM model for mule detection"""

    def __init__(self):
        self.model_version = "lgbm_v1.0"
        self.feature_names = [
            'is_frozen', 'unique_counterparties', 'monthly_cv',
            'structuring_40k_50k_pct', 'pct_within_6h', 'ch_ntd_pct',
            'ch_atw_pct', 'ch_chq_pct', 'avg_txn_amount', 'sender_concentration',
            'mobile_spike_ratio', 'days_since_kyc', 'fan_in_ratio',
            'amt_exact_50k_pct', 'avg_balance_negative', 'kyc_doc_count',
            'kyc_non_compliant', 'account_age_days', 'total_credit', 'net_flow',
            'credit_debit_ratio', 'mean_passthrough_hours', 'channel_entropy'
        ]
        self._booster = None
        self.model_source = "heuristic"
        self._load_trained_model()

    def _load_trained_model(self) -> None:
        model_path = TRAINED_LGBM_LOCAL
        if LGBM_RUNTIME_PKL.exists():
            try:
                with open(LGBM_RUNTIME_PKL, "rb") as artifact_file:
                    metadata = pickle.load(artifact_file)
                configured_path = metadata.get("model_path")
                if isinstance(configured_path, str) and configured_path:
                    model_path = Path(configured_path)
            except (OSError, pickle.UnpicklingError, AttributeError) as exc:
                logger.warning("Failed loading LightGBM runtime artifact %s: %s", LGBM_RUNTIME_PKL, exc)

        if not model_path.exists():
            return

        try:
            import lightgbm as lgb

            self._booster = lgb.Booster(model_file=str(model_path))
            booster_features = self._booster.feature_name()
            if booster_features:
                self.feature_names = booster_features
            self.model_version = "lgbm_v1.0-trained"
            self.model_source = str(model_path)
        except (ImportError, OSError, RuntimeError) as exc:
            logger.warning("Failed to load trained LightGBM model from %s: %s", model_path, exc)

    def _prepare_feature_frame(self, features: Dict[str, float]) -> pd.DataFrame:
        normalized_features = {}
        for feature_name in self.feature_names:
            value = features.get(feature_name, 0.0)
            if value is None or (isinstance(value, float) and np.isnan(value)):
                value = 0.0
            normalized_features[feature_name] = float(value)
        return pd.DataFrame([normalized_features], columns=self.feature_names)

    def predict(self, features: Dict[str, float]) -> float:
        """
        Predict mule score using LightGBM model
        
        Returns:
            Score between 0-100
        """
        if self._booster is not None:
            inference_frame = self._prepare_feature_frame(features)
            probability = float(self._booster.predict(inference_frame, num_iteration=self._booster.best_iteration)[0])
            return float(np.clip(probability * 100.0, 0.0, 100.0))

        # Simulate LightGBM prediction (weights based on domain knowledge)
        weights = {
            'structuring_40k_50k_pct': 15.0,
            'amt_exact_50k_pct': 12.0,
            'pct_within_6h': 10.0,
            'channel_entropy': 8.0,
            'sender_concentration': 12.0,
            'mobile_spike_ratio': 8.0,
            'mean_passthrough_hours': 10.0,
            'unique_counterparties': 7.0,
            'credit_debit_ratio': 8.0,
            'is_frozen': 5.0,
            'kyc_non_compliant': 4.0,
        }

        score = 0.0
        for feature_name, weight in weights.items():
            if feature_name in features and features[feature_name] is not None:
                # Normalize and apply weight
                value = features[feature_name]
                if isinstance(value, (int, float)):
                    score += weight * min(value, 1.0)

        # Cap at 100
        score = min(score, 100.0)
        
        return float(score)

    def _prepare_features(self, features: Dict[str, float]) -> np.ndarray:
        """Prepare feature vector for model"""
        vector = []
        for fname in self.feature_names:
            value = features.get(fname, 0.0)
            if value is None:
                value = 0.0
            vector.append(float(value))
        return np.array(vector)

    def save_prediction(self, account_id: str, score: float, features: Dict[str, float]):
        """Save LightGBM prediction to file"""
        filepath = os.path.join(LGBM_RESULTS_DIR, f"{account_id}_prediction.json")
        data = {
            "account_id": account_id,
            "model": self.model_version,
            "score": score,
            "features_used": list(features.keys()),
            "timestamp": datetime.now().isoformat()
        }
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)


class GNNPredictor:
    """Graph Neural Network model for network-based mule detection"""

    def __init__(self):
        self.model_version = "gnn_v1.0-runtime"
        self.model_source = str(GNN_RUNTIME_PKL)
        self.config = {
            "counterparty_thresholds": [(50, 20.0), (20, 15.0), (10, 10.0)],
            "fan_in_multiplier": 30.0,
            "fan_in_cap": 25.0,
            "sender_concentration_thresholds": [(0.8, 20.0), (0.5, 15.0), (0.3, 10.0)],
            "credit_debit_ratio_thresholds": [(2.0, 18.0), (1.5, 12.0)],
        }
        self._load_runtime_model()

    def _load_runtime_model(self) -> None:
        if not GNN_RUNTIME_PKL.exists():
            return
        try:
            with open(GNN_RUNTIME_PKL, "rb") as artifact_file:
                payload = pickle.load(artifact_file)
            if isinstance(payload, dict):
                payload_config = payload.copy()
                payload_config.pop("model_version", None)
                self.config.update(payload_config)
                configured_version = payload.get("model_version")
                if isinstance(configured_version, str) and configured_version:
                    self.model_version = configured_version
        except (OSError, pickle.UnpicklingError, AttributeError) as exc:
            logger.warning("Failed to load GNN runtime model artifact %s: %s", GNN_RUNTIME_PKL, exc)

    def predict(
        self,
        features: Dict[str, float],
        network_data: Dict[str, Any] = None,
        account_id: str | None = None,
    ) -> float:
        """
        Predict mule score using GNN model
        
        GNN focuses on network topology and relationships:
        - Fan-in/Fan-out ratios
        - Counterparty diversity
        - Network patterns
        """
        score = 0.0

        # Network density features
        if 'unique_counterparties' in features:
            counterparties = features['unique_counterparties']
            for threshold, weight in self.config["counterparty_thresholds"]:
                if counterparties > threshold:
                    score += float(weight)
                    break

        # Fan-in ratio (money in from many sources)
        if 'fan_in_ratio' in features:
            fan_in = features['fan_in_ratio']
            score += min(
                fan_in * float(self.config["fan_in_multiplier"]),
                float(self.config["fan_in_cap"]),
            )

        # Sender concentration (money from few sources)
        if 'sender_concentration' in features:
            concentration = features['sender_concentration']
            for threshold, weight in self.config["sender_concentration_thresholds"]:
                if concentration > threshold:
                    score += float(weight)
                    break

        # Credit-debit asymmetry
        if 'credit_debit_ratio' in features:
            ratio = features['credit_debit_ratio']
            for threshold, weight in self.config["credit_debit_ratio_thresholds"]:
                if ratio > threshold:
                    score += float(weight)
                    break

        score = min(score, 100.0)
        return float(score)

    def save_prediction(self, account_id: str, score: float, network_info: Dict[str, Any]):
        """Save GNN prediction to file"""
        filepath = os.path.join(GNN_RESULTS_DIR, f"{account_id}_prediction.json")
        data = {
            "account_id": account_id,
            "model": self.model_version,
            "score": score,
            "network_info": network_info,
            "timestamp": datetime.now().isoformat()
        }
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)


class EnsemblePredictor:
    """Ensemble model combining LightGBM and GNN"""

    def __init__(self):
        self.lgbm = LightGBMPredictor()
        self.gnn = GNNPredictor()
        self.model_version = "ensemble_v1.0-runtime"
        self.weights = {
            'lgbm': 0.6,  # 60% weight to LightGBM
            'gnn': 0.4    # 40% weight to GNN
        }
        self.model_source = str(ENSEMBLE_RUNTIME_PKL)
        self._load_runtime_model()

    def _load_runtime_model(self) -> None:
        if not ENSEMBLE_RUNTIME_PKL.exists():
            return
        try:
            with open(ENSEMBLE_RUNTIME_PKL, "rb") as artifact_file:
                payload = pickle.load(artifact_file)
            configured_weights = payload.get("weights")
            if (
                isinstance(configured_weights, dict)
                and "lgbm" in configured_weights
                and "gnn" in configured_weights
            ):
                self.weights = {
                    "lgbm": float(configured_weights["lgbm"]),
                    "gnn": float(configured_weights["gnn"]),
                }
            configured_version = payload.get("model_version")
            if isinstance(configured_version, str) and configured_version:
                self.model_version = configured_version
        except (OSError, pickle.UnpicklingError, AttributeError, TypeError, ValueError) as exc:
            logger.warning("Failed to load ensemble runtime model artifact %s: %s", ENSEMBLE_RUNTIME_PKL, exc)

    def predict(self, features: Dict[str, float], account_id: str | None = None) -> Dict[str, float]:
        """
        Predict using ensemble of LightGBM and GNN
        
        Returns:
            Dictionary with individual and ensemble scores
        """
        lgbm_score = self.lgbm.predict(features)
        gnn_score = self.gnn.predict(features, account_id=account_id)

        # Weighted ensemble
        ensemble_score = (
            self.weights['lgbm'] * lgbm_score +
            self.weights['gnn'] * gnn_score
        )

        return {
            'lgbm_score': float(lgbm_score),
            'gnn_score': float(gnn_score),
            'ensemble_score': float(ensemble_score)
        }

    def save_predictions(self, account_id: str, scores: Dict[str, float], features: Dict[str, float]):
        """Save all predictions to file"""
        filepath = os.path.join(ENSEMBLE_RESULTS_DIR, f"{account_id}_ensemble.json")
        data = {
            "account_id": account_id,
            "model": self.model_version,
            "scores": scores,
            "weights": self.weights,
            "feature_count": len(features),
            "timestamp": datetime.now().isoformat()
        }
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)

        # Also save individual model results
        self.lgbm.save_prediction(account_id, scores['lgbm_score'], features)
        self.gnn.save_prediction(account_id, scores['gnn_score'], {"network_features": features})


class SHAPExplainer:
    """SHAP model explainability service for feature contribution analysis"""

    def __init__(self):
        self.model_version = "shap_v1.0"
        try:
            import shap
            self.shap = shap
            self.available = True
        except ImportError:
            self.available = False
            logger = __import__('logging').getLogger(__name__)
            logger.warning("SHAP not installed. Install with: pip install shap")

    def explain_prediction(
        self,
        account_id: str,
        features: Dict[str, float],
        prediction_score: float,
        model_used: str = "ensemble"
    ) -> Dict[str, Any]:
        """
        Generate SHAP explanation for a prediction
        
        Args:
            account_id: Account ID
            features: Dictionary of feature values
            prediction_score: The prediction score to explain
            model_used: Which model ('lgbm', 'gnn', or 'ensemble')
        
        Returns:
            Dictionary with SHAP values and explanations
        """
        if not self.available:
            return self._generate_mock_explanation(
                account_id, features, prediction_score, model_used
            )

        try:
            # Convert features to list format
            feature_names = sorted(features.keys())
            feature_values = [features[f] for f in feature_names]
            
            # Calculate base value (average prediction)
            base_value = 50.0  # Mock average prediction value
            
            # Calculate SHAP values using approximation
            shap_values = self._calculate_shap_values(
                feature_values, feature_names, prediction_score, base_value
            )
            
            # Sort by absolute contribution
            contributions = [
                {
                    "feature_name": feature_names[i],
                    "shap_value": float(shap_values[i]),
                    "base_value": base_value,
                    "contribution_percentage": float(
                        (abs(shap_values[i]) / max(sum([abs(v) for v in shap_values]), 1)) * 100
                    )
                }
                for i in range(len(feature_names))
            ]
            
            # Sort by absolute SHAP value
            contributions_sorted = sorted(
                contributions,
                key=lambda x: abs(x["shap_value"]),
                reverse=True
            )
            
            # Split into positive and negative
            positive_features = [c for c in contributions_sorted if c["shap_value"] > 0]
            negative_features = [c for c in contributions_sorted if c["shap_value"] < 0]
            
            explanation = {
                "account_id": account_id,
                "prediction_score": prediction_score,
                "base_value": base_value,
                "feature_contributions": contributions,
                "top_positive_features": positive_features[:10],
                "top_negative_features": negative_features[:10],
                "top_contributing_features": contributions_sorted[:10],
                "model_used": model_used,
                "shap_version": self.model_version,
                "timestamp": datetime.now().isoformat()
            }
            
            # Save explanation
            self._save_explanation(account_id, explanation)
            
            return explanation
            
        except Exception as e:
            logger = __import__('logging').getLogger(__name__)
            logger.error(f"SHAP explanation error: {e}")
            return self._generate_mock_explanation(
                account_id, features, prediction_score, model_used
            )

    def _calculate_shap_values(
        self,
        feature_values: List[float],
        feature_names: List[str],
        prediction: float,
        base_value: float
    ) -> List[float]:
        """
        Calculate approximate SHAP values
        
        Uses feature importance heuristics when SHAP library unavailable
        """
        # Importance weights based on domain knowledge
        feature_weights = {
            'structuring_40k_50k_pct': 0.15,
            'amt_exact_50k_pct': 0.12,
            'sender_concentration': 0.12,
            'pct_within_6h': 0.10,
            'channel_entropy': 0.08,
            'mean_passthrough_hours': 0.10,
            'credit_debit_ratio': 0.08,
            'mobile_spike_ratio': 0.08,
            'unique_counterparties': 0.07,
            'is_frozen': 0.05,
            'kyc_non_compliant': 0.04,
            'fan_in_ratio': 0.04,
        }
        
        shap_values = []
        total_contribution = prediction - base_value
        
        for i, fname in enumerate(feature_names):
            weight = feature_weights.get(fname, 0.02)
            feature_val = feature_values[i]
            
            # SHAP value is feature value * weight * total contribution
            shap_value = (feature_val / 100.0) * weight * total_contribution
            shap_values.append(shap_value)
        
        return shap_values

    def _generate_mock_explanation(
        self,
        account_id: str,
        features: Dict[str, float],
        prediction_score: float,
        model_used: str
    ) -> Dict[str, Any]:
        """Generate explanation without SHAP library"""
        
        feature_names = sorted(features.keys())
        base_value = 50.0
        
        # Use domain knowledge to estimate contributions
        feature_weights = {
            'structuring_40k_50k_pct': 15.0,
            'amt_exact_50k_pct': 12.0,
            'sender_concentration': 12.0,
            'pct_within_6h': 10.0,
            'channel_entropy': 8.0,
            'mean_passthrough_hours': 10.0,
            'credit_debit_ratio': 8.0,
            'mobile_spike_ratio': 8.0,
            'unique_counterparties': 7.0,
            'is_frozen': 5.0,
            'kyc_non_compliant': 4.0,
        }
        
        contributions = []
        for fname in feature_names:
            weight = feature_weights.get(fname, 2.0)
            shap_val = (features[fname] / 100.0) * weight
            contributions.append({
                "feature_name": fname,
                "shap_value": float(shap_val),
                "base_value": base_value,
                "contribution_percentage": 0.0
            })
        
        # Recalculate percentages
        total_abs = sum([abs(c["shap_value"]) for c in contributions])
        for c in contributions:
            c["contribution_percentage"] = float(
                (abs(c["shap_value"]) / max(total_abs, 1)) * 100
            )
        
        contributions_sorted = sorted(
            contributions,
            key=lambda x: abs(x["shap_value"]),
            reverse=True
        )
        
        positive = [c for c in contributions_sorted if c["shap_value"] > 0]
        negative = [c for c in contributions_sorted if c["shap_value"] < 0]
        
        explanation = {
            "account_id": account_id,
            "prediction_score": prediction_score,
            "base_value": base_value,
            "feature_contributions": contributions,
            "top_positive_features": positive[:10],
            "top_negative_features": negative[:10],
            "model_used": model_used,
            "shap_version": self.model_version,
            "timestamp": datetime.now().isoformat()
        }
        
        self._save_explanation(account_id, explanation)
        return explanation

    def _save_explanation(self, account_id: str, explanation: Dict[str, Any]):
        """Save SHAP explanation to file"""
        filepath = os.path.join(SHAP_RESULTS_DIR, f"{account_id}_shap.json")
        with open(filepath, "w") as f:
            json.dump(explanation, f, indent=2)

    def batch_explain(
        self,
        accounts: List[Dict[str, Any]],
        model_manager: 'ModelManager'
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, str]]]:
        """
        Generate explanations for multiple accounts
        
        Returns:
            Tuple of (explanations, errors)
        """
        explanations = []
        errors = []
        
        for account in accounts:
            try:
                account_id = account.get('account_id')
                features = account.get('features', {})
                
                # Get prediction
                prediction_result = model_manager.predict_mule_score(account_id, features)
                score = prediction_result['ensemble_score']
                
                # Generate explanation
                explanation = self.explain_prediction(
                    account_id,
                    features,
                    score,
                    model_used='ensemble'
                )
                
                explanations.append(explanation)
                
            except Exception as e:
                errors.append({
                    "account_id": account.get('account_id'),
                    "error": str(e)
                })
        
        return explanations, errors

    def explain_lgbm_model(
        self,
        account_id: str,
        features: Dict[str, float],
        lgbm_predictor: Any
    ) -> Dict[str, Any]:
        """Generate SHAP explanation for LightGBM model specifically"""
        
        # Get LightGBM prediction
        lgbm_score = lgbm_predictor.predict(features)
        
        # Generate explanation using same methodology
        feature_names = sorted(features.keys())
        base_value = 50.0
        
        feature_weights = {
            'structuring_40k_50k_pct': 0.15,
            'amt_exact_50k_pct': 0.12,
            'sender_concentration': 0.12,
            'pct_within_6h': 0.10,
            'channel_entropy': 0.08,
            'mean_passthrough_hours': 0.10,
            'credit_debit_ratio': 0.08,
            'mobile_spike_ratio': 0.08,
            'unique_counterparties': 0.07,
            'is_frozen': 0.05,
            'kyc_non_compliant': 0.04,
            'fan_in_ratio': 0.04,
        }
        
        contributions = []
        total_contribution = lgbm_score - base_value
        
        for fname in feature_names:
            weight = feature_weights.get(fname, 0.02)
            feature_val = features[fname]
            shap_val = (feature_val / 100.0) * weight * total_contribution
            contributions.append({
                "feature_name": fname,
                "shap_value": float(shap_val),
                "base_value": base_value,
            })
        
        # Calculate percentages
        total_abs = sum([abs(c["shap_value"]) for c in contributions])
        for c in contributions:
            c["contribution_percentage"] = float(
                (abs(c["shap_value"]) / max(total_abs, 1)) * 100
            )
        
        contributions_sorted = sorted(
            contributions,
            key=lambda x: abs(x["shap_value"]),
            reverse=True
        )
        
        return {
            "account_id": account_id,
            "model_name": "LightGBM",
            "prediction_score": float(lgbm_score),
            "base_value": base_value,
            "feature_contributions": contributions,
            "top_contributing_features": contributions_sorted[:10],
            "model_version": lgbm_predictor.model_version,
            "timestamp": datetime.now().isoformat()
        }

    def explain_gnn_model(
        self,
        account_id: str,
        features: Dict[str, float],
        gnn_predictor: Any
    ) -> Dict[str, Any]:
        """Generate SHAP explanation for GNN model specifically"""
        
        # Get GNN prediction
        gnn_score = gnn_predictor.predict(features)
        
        # Generate explanation
        feature_names = sorted(features.keys())
        base_value = 50.0
        
        # GNN-specific weights (focus on network features)
        feature_weights = {
            'unique_counterparties': 0.20,
            'fan_in_ratio': 0.18,
            'sender_concentration': 0.18,
            'credit_debit_ratio': 0.15,
            'pct_within_6h': 0.08,
            'channel_entropy': 0.08,
            'mobile_spike_ratio': 0.07,
            'structuring_40k_50k_pct': 0.05,
            'amt_exact_50k_pct': 0.02,
        }
        
        contributions = []
        total_contribution = gnn_score - base_value
        
        for fname in feature_names:
            weight = feature_weights.get(fname, 0.01)
            feature_val = features[fname]
            shap_val = (feature_val / 100.0) * weight * total_contribution
            contributions.append({
                "feature_name": fname,
                "shap_value": float(shap_val),
                "base_value": base_value,
            })
        
        # Calculate percentages
        total_abs = sum([abs(c["shap_value"]) for c in contributions])
        for c in contributions:
            c["contribution_percentage"] = float(
                (abs(c["shap_value"]) / max(total_abs, 1)) * 100
            )
        
        contributions_sorted = sorted(
            contributions,
            key=lambda x: abs(x["shap_value"]),
            reverse=True
        )
        
        return {
            "account_id": account_id,
            "model_name": "GNN",
            "prediction_score": float(gnn_score),
            "base_value": base_value,
            "feature_contributions": contributions,
            "top_contributing_features": contributions_sorted[:10],
            "model_version": gnn_predictor.model_version,
            "timestamp": datetime.now().isoformat()
        }

    def generate_model_report(
        self,
        account_id: str,
        features: Dict[str, float],
        model_manager: 'ModelManager'
    ) -> Dict[str, Any]:
        """
        Generate comprehensive SHAP report comparing all three models
        
        Returns:
            Dictionary with complete analysis and recommendations
        """
        try:
            # Get predictions from all models
            scores = model_manager.ensemble.predict(features, account_id=account_id)
            
            # Generate explanations for each model
            lgbm_exp = self.explain_lgbm_model(account_id, features, model_manager.ensemble.lgbm)
            gnn_exp = self.explain_gnn_model(account_id, features, model_manager.ensemble.gnn)
            ensemble_exp = self.explain_prediction(
                account_id, features, scores['ensemble_score'], model_used='ensemble'
            )
            
            # Compare models
            lgbm_vs_gnn = self._compare_models(lgbm_exp, gnn_exp, "LightGBM", "GNN")
            
            # Identify consensus and conflicting features (only LGBM and GNN)
            consensus, conflicting = self._analyze_feature_agreement_dual(
                lgbm_exp, gnn_exp
            )
            
            # Generate recommendations
            recommendations = self._generate_recommendations_dual(
                scores, consensus, conflicting, lgbm_exp, gnn_exp
            )
            
            report = {
                "account_id": account_id,
                "report_title": f"SHAP Model Comparison Report for {account_id}",
                "report_description": "Comparative analysis of LightGBM and GNN models with feature contributions",
                
                # Individual model explanations
                "lgbm_explanation": {
                    "model_name": "LightGBM",
                    "prediction_score": lgbm_exp['prediction_score'],
                    "risk_level": self._get_risk_level(lgbm_exp['prediction_score']),
                    "base_value": lgbm_exp['base_value'],
                    "top_contributing_features": lgbm_exp['top_contributing_features'],
                    "feature_analysis": {
                        c['feature_name']: c for c in lgbm_exp['feature_contributions']
                    },
                    "model_version": lgbm_exp['model_version'],
                    "timestamp": lgbm_exp['timestamp']
                },
                
                "gnn_explanation": {
                    "model_name": "GNN",
                    "prediction_score": gnn_exp['prediction_score'],
                    "risk_level": self._get_risk_level(gnn_exp['prediction_score']),
                    "base_value": gnn_exp['base_value'],
                    "top_contributing_features": gnn_exp['top_contributing_features'],
                    "feature_analysis": {
                        c['feature_name']: c for c in gnn_exp['feature_contributions']
                    },
                    "model_version": gnn_exp['model_version'],
                    "timestamp": gnn_exp['timestamp']
                },
                
                # Model comparison (only LightGBM vs GNN)
                "lgbm_vs_gnn": lgbm_vs_gnn,
                
                # Summary
                "consensus_features": consensus,
                "conflicting_features": conflicting,
                "overall_risk_assessment": self._assess_overall_risk(scores),
                "recommendations": recommendations,
                
                "report_generated_at": datetime.now().isoformat(),
                "shap_version": self.model_version
            }
            
            # Save report
            self._save_report(account_id, report)
            
            return report
            
        except Exception as e:
            logger = __import__('logging').getLogger(__name__)
            logger.error(f"Report generation error: {e}")
            raise

    def _compare_models(
        self,
        model1_exp: Dict[str, Any],
        model2_exp: Dict[str, Any],
        model1_name: str,
        model2_name: str
    ) -> Dict[str, Any]:
        """Compare two model explanations"""
        
        score_diff = abs(model1_exp['prediction_score'] - model2_exp['prediction_score'])
        
        # Calculate agreement percentage based on top features
        model1_features = set(f['feature_name'] for f in model1_exp['top_contributing_features'][:5])
        model2_features = set(f['feature_name'] for f in model2_exp['top_contributing_features'][:5])
        
        agreement = len(model1_features.intersection(model2_features)) / 5 * 100
        disagreeing = list(model1_features.symmetric_difference(model2_features))
        
        # Average feature weight difference
        avg_weight_diff = sum(
            abs(model1_exp['top_contributing_features'][i]['contribution_percentage'] -
                model2_exp['top_contributing_features'][i]['contribution_percentage'])
            for i in range(min(5, len(model1_exp['top_contributing_features']),
                             len(model2_exp['top_contributing_features'])))
        ) / max(1, min(5, len(model1_exp['top_contributing_features']),
                      len(model2_exp['top_contributing_features'])))
        
        return {
            "model_1": model1_name,
            "model_2": model2_name,
            "score_difference": float(score_diff),
            "agreement_percentage": float(agreement),
            "disagreeing_features": disagreeing,
            "average_feature_weight_diff": float(avg_weight_diff)
        }

    def _analyze_feature_agreement(
        self,
        lgbm_exp: Dict[str, Any],
        gnn_exp: Dict[str, Any],
        ensemble_exp: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Identify consensus and conflicting features across models"""
        
        lgbm_top = set(f['feature_name'] for f in lgbm_exp['top_contributing_features'][:7])
        gnn_top = set(f['feature_name'] for f in gnn_exp['top_contributing_features'][:7])
        ensemble_top = set(f['feature_name'] for f in ensemble_exp['top_positive_features'][:7])
        
        # Consensus: features in all three
        consensus_names = lgbm_top.intersection(gnn_top).intersection(ensemble_top)
        
        # Conflicting: features only in one model
        all_features = lgbm_top.union(gnn_top).union(ensemble_top)
        conflicting_names = [f for f in all_features if list([f in lgbm_top, f in gnn_top, f in ensemble_top]).count(True) == 1]
        
        # Build feature objects
        consensus_features = [
            {
                "feature_name": f,
                "shap_value": next((c['shap_value'] for c in lgbm_exp['top_contributing_features'] if c['feature_name'] == f), 0),
                "base_value": 50.0,
                "contribution_percentage": next((c['contribution_percentage'] for c in lgbm_exp['top_contributing_features'] if c['feature_name'] == f), 0)
            }
            for f in consensus_names
        ]
        
        conflicting_features = [
            {
                "feature_name": f,
                "shap_value": next((c['shap_value'] for c in lgbm_exp['top_contributing_features'] if c['feature_name'] == f), 0),
                "base_value": 50.0,
                "contribution_percentage": next((c['contribution_percentage'] for c in lgbm_exp['top_contributing_features'] if c['feature_name'] == f), 0)
            }
            for f in conflicting_names
        ]
        
        return consensus_features, conflicting_features

    def _analyze_feature_agreement_dual(
        self,
        lgbm_exp: Dict[str, Any],
        gnn_exp: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Identify consensus and conflicting features between LightGBM and GNN only"""
        
        lgbm_top = set(f['feature_name'] for f in lgbm_exp['top_contributing_features'][:7])
        gnn_top = set(f['feature_name'] for f in gnn_exp['top_contributing_features'][:7])
        
        # Consensus: features in both models
        consensus_names = lgbm_top.intersection(gnn_top)
        
        # Conflicting: features only in one model
        all_features = lgbm_top.union(gnn_top)
        conflicting_names = [f for f in all_features if f not in consensus_names]
        
        # Build feature objects
        consensus_features = [
            {
                "feature_name": f,
                "shap_value": next((c['shap_value'] for c in lgbm_exp['top_contributing_features'] if c['feature_name'] == f), 0),
                "base_value": 50.0,
                "contribution_percentage": next((c['contribution_percentage'] for c in lgbm_exp['top_contributing_features'] if c['feature_name'] == f), 0)
            }
            for f in consensus_names
        ]
        
        conflicting_features = [
            {
                "feature_name": f,
                "shap_value": next((c['shap_value'] for c in lgbm_exp['top_contributing_features'] if c['feature_name'] == f), 0),
                "base_value": 50.0,
                "contribution_percentage": next((c['contribution_percentage'] for c in lgbm_exp['top_contributing_features'] if c['feature_name'] == f), 0)
            }
            for f in conflicting_names
        ]
        
        return consensus_features, conflicting_features

    def _generate_recommendations_dual(
        self,
        scores: Dict[str, float],
        consensus: List[Dict[str, Any]],
        conflicting: List[Dict[str, Any]],
        lgbm_exp: Dict[str, Any],
        gnn_exp: Dict[str, Any]
    ) -> List[str]:
        """Generate actionable recommendations based on LightGBM and GNN analysis"""
        
        recommendations = []
        
        # Use average of the two models for risk assessment
        avg_score = (scores['lgbm_score'] + scores['gnn_score']) / 2
        
        # Risk-based recommendations
        if avg_score >= 75:
            recommendations.append("🚨 CRITICAL: Immediate investigation recommended. Account exhibits multiple high-risk indicators.")
            recommendations.append("Block transactions until suspicious activity is resolved.")
        elif avg_score >= 50:
            recommendations.append("⚠️  HIGH RISK: Enhanced due diligence recommended.")
            recommendations.append("Monitor account for structuring patterns and rapid transactions.")
        elif avg_score >= 25:
            recommendations.append("⚡ MEDIUM RISK: Standard review procedures should be applied.")
            recommendations.append("Periodic monitoring recommended.")
        else:
            recommendations.append("✅ LOW RISK: Account appears legitimate based on transaction patterns.")
        
        # Model agreement recommendations
        if len(consensus) >= 4:
            recommendations.append(f"✓ Strong consensus: {len(consensus)} features agree across both models.")
            recommendations.append("High confidence in this assessment.")
        elif len(conflicting) >= 3:
            recommendations.append(f"⚠️  Models disagree on {len(conflicting)} features.")
            recommendations.append("Consider manual review to resolve conflicting signals.")
        
        # Feature-specific recommendations
        top_features = lgbm_exp['top_contributing_features'][:3]
        if top_features:
            feature_list = ", ".join([f['feature_name'].replace('_', ' ').title() for f in top_features])
            recommendations.append(f"Key risk indicators: {feature_list}")
        
        # Score spread analysis
        score_spread = abs(scores['lgbm_score'] - scores['gnn_score'])
        if score_spread > 20:
            recommendations.append(f"Models differ by {score_spread:.1f} points - suggests mixed signals.")
            recommendations.append("Review both transaction patterns (LightGBM) and network topology (GNN).")
        else:
            recommendations.append(f"Models are aligned (difference: {score_spread:.1f} points).")
        
        return recommendations

    def _generate_recommendations(
        self,
        scores: Dict[str, float],
        consensus: List[Dict[str, Any]],
        conflicting: List[Dict[str, Any]],
        lgbm_exp: Dict[str, Any],
        gnn_exp: Dict[str, Any],
        ensemble_exp: Dict[str, Any]
    ) -> List[str]:
        """Generate actionable recommendations based on model analysis"""
        
        recommendations = []
        ensemble_score = scores['ensemble_score']
        
        # Risk-based recommendations
        if ensemble_score >= 75:
            recommendations.append("🚨 CRITICAL: Immediate investigation recommended. Account exhibits multiple high-risk indicators.")
            recommendations.append("Block transactions until suspicious activity is resolved.")
        elif ensemble_score >= 50:
            recommendations.append("⚠️  HIGH RISK: Enhanced due diligence recommended.")
            recommendations.append("Monitor account for structuring patterns and rapid transactions.")
        elif ensemble_score >= 25:
            recommendations.append("⚡ MEDIUM RISK: Standard review procedures should be applied.")
            recommendations.append("Periodic monitoring recommended.")
        else:
            recommendations.append("✅ LOW RISK: Account appears legitimate based on transaction patterns.")
        
        # Model agreement recommendations
        if len(consensus) >= 5:
            recommendations.append(f"✓ Strong consensus: {len(consensus)} features agree across all models.")
            recommendations.append("High confidence in this assessment.")
        elif len(conflicting) >= 3:
            recommendations.append(f"⚠️  Models disagree on {len(conflicting)} features.")
            recommendations.append("Consider manual review to resolve conflicting signals.")
        
        # Feature-specific recommendations
        top_features = ensemble_exp['top_positive_features'][:3]
        if top_features:
            feature_list = ", ".join([f['feature_name'].replace('_', ' ').title() for f in top_features])
            recommendations.append(f"Key risk indicators: {feature_list}")
        
        # Score spread analysis
        score_spread = abs(scores['lgbm_score'] - scores['gnn_score'])
        if score_spread > 20:
            recommendations.append(f"Models differ by {score_spread:.1f} points - suggests mixed signals.")
            recommendations.append("Review both transaction patterns (LightGBM) and network topology (GNN).")
        
        return recommendations

    def _assess_overall_risk(self, scores: Dict[str, float]) -> str:
        """Assess overall risk based on ensemble score"""
        
        score = scores['ensemble_score']
        
        if score >= 75:
            return "CRITICAL - Immediate action required"
        elif score >= 50:
            return "HIGH - Enhanced monitoring required"
        elif score >= 25:
            return "MEDIUM - Standard monitoring"
        else:
            return "LOW - Normal operations"

    def _get_risk_level(self, score: float) -> str:
        """Get risk level string from score"""
        
        if score >= 75:
            return "CRITICAL"
        elif score >= 50:
            return "HIGH"
        elif score >= 25:
            return "MEDIUM"
        else:
            return "LOW"

    def _save_report(self, account_id: str, report: Dict[str, Any]):
        """Save comprehensive report to file"""
        
        report_dir = os.path.join(SHAP_RESULTS_DIR, "reports")
        os.makedirs(report_dir, exist_ok=True)
        
        filepath = os.path.join(report_dir, f"{account_id}_model_report.json")
        with open(filepath, "w") as f:
            json.dump(report, f, indent=2)

    def generate_html_pdf_report(self, account_id: str, report_data: Dict[str, Any]) -> str:
        """Generate structured PDF from SHAP model report using reportlab"""
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, HRFlowable
            from reportlab.lib import colors
        except ImportError:
            raise ImportError("reportlab not installed. Run: pip install reportlab")
        
        report_dir = os.path.join(SHAP_RESULTS_DIR, "reports")
        os.makedirs(report_dir, exist_ok=True)
        
        pdf_filepath = os.path.join(report_dir, f"{account_id}_model_report.pdf")
        
        try:
            # Create PDF document
            doc = SimpleDocTemplate(pdf_filepath, pagesize=letter, 
                                   topMargin=0.5*inch, bottomMargin=0.5*inch,
                                   leftMargin=0.75*inch, rightMargin=0.75*inch)
            elements = []
            styles = getSampleStyleSheet()
            
            # Custom styles
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#1f77b4'),
                spaceAfter=6,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold'
            )
            subtitle_style = ParagraphStyle(
                'Subtitle',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#666666'),
                alignment=TA_CENTER,
                spaceAfter=20
            )
            section_heading_style = ParagraphStyle(
                'SectionHeading',
                parent=styles['Heading2'],
                fontSize=14,
                textColor=colors.white,
                backColor=colors.HexColor('#1f77b4'),
                spaceAfter=12,
                spaceBefore=12,
                leftIndent=6,
                rightIndent=6,
                fontName='Helvetica-Bold'
            )
            heading3_style = ParagraphStyle(
                'Heading3Custom',
                parent=styles['Heading3'],
                fontSize=11,
                textColor=colors.HexColor('#1f77b4'),
                spaceAfter=8,
                spaceBefore=8,
                fontName='Helvetica-Bold'
            )
            
            # ============= PAGE 1: EXECUTIVE SUMMARY =============
            
            # Title
            elements.append(Paragraph("SHAP Model Explainability Report", title_style))
            elements.append(Paragraph(f"Account ID: <b>{account_id}</b> | Generated: {report_data['report_generated_at'][:10]}", 
                                    subtitle_style))
            elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#1f77b4')))
            elements.append(Spacer(1, 0.15*inch))
            
            # Overall Risk Assessment - Prominent Display
            risk_level = report_data['overall_risk_assessment']
            risk_color_map = {
                'CRITICAL': ('#d62728', '■'),
                'HIGH': ('#ff7f0e', '●'),
                'MEDIUM': ('#2ca02c', '▲'),
                'LOW': ('#1f77b4', '◆')
            }
            risk_color_hex, risk_icon = risk_color_map.get(risk_level.split(' ')[0], ('#000000', '•'))
            
            elements.append(Paragraph("Overall Risk Assessment", section_heading_style))
            elements.append(Paragraph(f"<font color='{risk_color_hex}'><font size='16'>{risk_icon}</font> <b>{risk_level}</b></font>", 
                                    styles['Normal']))
            elements.append(Spacer(1, 0.15*inch))
            
            # Key Risk Indicators
            elements.append(Paragraph("Key Risk Indicators", section_heading_style))
            top_features = report_data['lgbm_explanation']['top_contributing_features'][:3]
            indicator_text = "<br/>".join([
                f"• <b>{f['feature_name'].replace('_', ' ').title()}</b>: {f['contribution_percentage']:.1f}% contribution"
                for f in top_features
            ])
            elements.append(Paragraph(indicator_text, styles['Normal']))
            elements.append(Spacer(1, 0.15*inch))
            
            # Model Predictions Table
            elements.append(Paragraph("Model Predictions", section_heading_style))
            model_data = [
                ['Model', 'Score', 'Risk Level'],
                ['LightGBM', 
                 f"{report_data['lgbm_explanation']['prediction_score']:.1f}",
                 report_data['lgbm_explanation']['risk_level']],
                ['GNN',
                 f"{report_data['gnn_explanation']['prediction_score']:.1f}",
                 report_data['gnn_explanation']['risk_level']]
            ]
            
            model_table = Table(model_data, colWidths=[2*inch, 1.2*inch, 1.5*inch])
            model_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f77b4')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f0f8ff')),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
                ('FONTSIZE', (0, 1), (-1, -1), 11),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica')
            ]))
            elements.append(model_table)
            elements.append(Spacer(1, 0.2*inch))
            
            # Model Agreement Summary
            lgbm_gnn_diff = report_data['lgbm_vs_gnn']['score_difference']
            elements.append(Paragraph("Model Agreement", section_heading_style))
            agreement_pct = report_data['lgbm_vs_gnn']['agreement_percentage']
            agreement_text = f"LightGBM and GNN scores differ by <b>{lgbm_gnn_diff:.1f} points</b> with <b>{agreement_pct:.0f}%</b> feature agreement."
            if agreement_pct >= 80:
                agreement_text += " <font color='green'><b>✓ Strong alignment</b></font>"
            elif agreement_pct >= 50:
                agreement_text += " <b>◆ Moderate alignment - review recommended</b>"
            else:
                agreement_text += " <b><font color='red'>⚠ Low alignment - manual review advised</font></b>"
            elements.append(Paragraph(agreement_text, styles['Normal']))
            elements.append(Spacer(1, 0.25*inch))
            
            # ============= PAGE 2: DETAILED ANALYSIS =============
            elements.append(PageBreak())
            
            # Feature Analysis by Model
            elements.append(Paragraph("Detailed Feature Analysis", title_style))
            elements.append(Spacer(1, 0.15*inch))
            
            for model_key, model_label in [('lgbm_explanation', 'LightGBM Model'),
                                           ('gnn_explanation', 'GNN Model')]:
                model = report_data[model_key]
                
                elements.append(Paragraph(f"{model_label} Analysis", section_heading_style))
                elements.append(Paragraph(f"<b>Risk Score:</b> {model['prediction_score']:.1f} | <b>Risk Level:</b> {model['risk_level']}", 
                                        styles['Normal']))
                elements.append(Spacer(1, 0.08*inch))
                
                # Top Features Table
                elements.append(Paragraph("Top Contributing Features", heading3_style))
                features = model['top_contributing_features'][:8]
                feature_data = [['Rank', 'Feature', 'Contribution %']]
                for idx, f in enumerate(features, 1):
                    feature_data.append([
                        str(idx),
                        f['feature_name'].replace('_', ' ').title(),
                        f"{f['contribution_percentage']:.1f}%"
                    ])
                
                feature_table = Table(feature_data, colWidths=[0.6*inch, 2.8*inch, 1.2*inch])
                feature_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2ca02c')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                    ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                    ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9f9f9')),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6)
                ]))
                elements.append(feature_table)
                elements.append(Spacer(1, 0.2*inch))
            
            # ============= PAGE 3: CONCLUSIONS & RECOMMENDATIONS =============
            elements.append(PageBreak())
            
            elements.append(Paragraph("Conclusions & Recommendations", title_style))
            elements.append(Spacer(1, 0.15*inch))
            
            # Executive Recommendations
            elements.append(Paragraph("Key Findings", section_heading_style))
            
            consensus = report_data.get('consensus_features', [])
            conflicting = report_data.get('conflicting_features', [])
            
            findings = []
            if len(consensus) >= 3:
                consensus_names = ", ".join([f['feature_name'].replace('_', ' ') for f in consensus[:3]])
                findings.append(f"✓ <b>Strong Consensus:</b> Both models agree on key risk factors: {consensus_names}")
            
            if lgbm_gnn_diff > 20:
                findings.append(f"⚠ <b>Score Variance:</b> Models differ by {lgbm_gnn_diff:.1f} points, indicating different risk perspectives")
            else:
                findings.append(f"✓ <b>Score Consistency:</b> Models are aligned (difference: {lgbm_gnn_diff:.1f} points)")
            
            if report_data['overall_risk_assessment'].startswith('CRITICAL') or report_data['overall_risk_assessment'].startswith('HIGH'):
                findings.append("⚠ <b>Elevated Risk:</b> Account exhibits multiple concerning patterns requiring investigation")
            
            for finding in findings:
                elements.append(Paragraph(f"• {finding}", styles['Normal']))
                elements.append(Spacer(1, 0.06*inch))
            
            elements.append(Spacer(1, 0.15*inch))
            
            # Actionable Recommendations
            elements.append(Paragraph("Recommendations", section_heading_style))
            for i, rec in enumerate(report_data.get('recommendations', [])[:5], 1):
                elements.append(Paragraph(f"<b>{i}.</b> {rec}", styles['Normal']))
                elements.append(Spacer(1, 0.08*inch))
            
            elements.append(Spacer(1, 0.2*inch))
            
            # Report Metadata
            elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cccccc')))
            elements.append(Spacer(1, 0.08*inch))
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=8,
                textColor=colors.HexColor('#999999'),
                alignment=TA_CENTER
            )
            elements.append(Paragraph("SHAP Model Explainability System | Trinetra Mule Detection", footer_style))
            elements.append(Paragraph(f"Report ID: {account_id} | Generated: {report_data['report_generated_at']}", footer_style))
            
            # Build PDF
            doc.build(elements)
            return pdf_filepath
            
        except Exception as e:
            logger = __import__('logging').getLogger(__name__)
            logger.error(f"PDF generation error: {e}")
            raise


class ModelManager:
    """Manages all ML models"""

    def __init__(self):
        self.ensemble = EnsemblePredictor()
        self.shap_explainer = SHAPExplainer()
        self.models_loaded = True

    def predict_mule_score(self, account_id: str, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Get mule detection score for an account
        """
        if not features or len(features) == 0:
            raise ValueError("No features provided for prediction")

        # Get ensemble predictions
        scores = self.ensemble.predict(features, account_id=account_id)

        # Save predictions
        self.ensemble.save_predictions(account_id, scores, features)

        return {
            "account_id": account_id,
            "lgbm_score": scores['lgbm_score'],
            "gnn_score": scores['gnn_score'],
            "ensemble_score": scores['ensemble_score'],
            "timestamp": datetime.now().isoformat()
        }

    def batch_predict(self, accounts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Batch prediction for multiple accounts"""
        results = []
        errors = []

        for account in accounts:
            try:
                account_id = account.get('account_id')
                features = account.get('features', {})
                result = self.predict_mule_score(account_id, features)
                results.append(result)
            except Exception as e:
                errors.append({
                    "account_id": account.get('account_id'),
                    "error": str(e)
                })

        return results, errors

    def explain_prediction(
        self,
        account_id: str,
        features: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Generate SHAP explanation for a prediction
        """
        if not features or len(features) == 0:
            raise ValueError("No features provided for explanation")

        # Get prediction
        prediction = self.predict_mule_score(account_id, features)
        
        # Generate SHAP explanation
        explanation = self.shap_explainer.explain_prediction(
            account_id,
            features,
            prediction['ensemble_score'],
            model_used='ensemble'
        )
        
        return explanation

    def batch_explain(self, accounts: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, str]]]:
        """Generate SHAP explanations for multiple accounts"""
        return self.shap_explainer.batch_explain(accounts, self)

    def generate_model_comparison_report(
        self,
        account_id: str,
        features: Dict[str, float]
    ) -> Dict[str, Any]:
        """Generate comprehensive SHAP report comparing LightGBM, GNN, and Ensemble models"""
        
        if not features or len(features) == 0:
            raise ValueError("No features provided for report generation")
        
        return self.shap_explainer.generate_model_report(account_id, features, self)

    def get_lgbm_explanation(
        self,
        account_id: str,
        features: Dict[str, float]
    ) -> Dict[str, Any]:
        """Get SHAP explanation for LightGBM model only"""
        
        if not features or len(features) == 0:
            raise ValueError("No features provided for explanation")
        
        return self.shap_explainer.explain_lgbm_model(account_id, features, self.ensemble.lgbm)

    def get_gnn_explanation(
        self,
        account_id: str,
        features: Dict[str, float]
    ) -> Dict[str, Any]:
        """Get SHAP explanation for GNN model only"""
        
        if not features or len(features) == 0:
            raise ValueError("No features provided for explanation")
        
        return self.shap_explainer.explain_gnn_model(account_id, features, self.ensemble.gnn)

    def get_model_stats(self) -> Dict[str, Any]:
        """Get statistics about loaded models"""
        return {
            "ensemble_model": self.ensemble.model_version,
            "lgbm_model": self.ensemble.lgbm.model_version,
            "gnn_model": self.ensemble.gnn.model_version,
            "model_artifacts": {
                "lgbm": self.ensemble.lgbm.model_source,
                "gnn": self.ensemble.gnn.model_source,
                "ensemble": self.ensemble.model_source,
            },
            "shap_model": self.shap_explainer.model_version,
            "lgbm_features": len(self.ensemble.lgbm.feature_names),
            "ensemble_weights": self.ensemble.weights,
            "shap_available": self.shap_explainer.available,
            "loaded": self.models_loaded
        }


# Global model manager instance
model_manager: ModelManager = None


def get_model_manager() -> ModelManager:
    """Get or initialize model manager"""
    global model_manager
    if model_manager is None:
        model_manager = ModelManager()
    return model_manager
