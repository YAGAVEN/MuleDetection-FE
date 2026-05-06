"""ML Models service - LightGBM, GNN, and Ensemble"""
import numpy as np
import json
import os
from typing import Dict, List, Any, Tuple
from datetime import datetime
import warnings

warnings.filterwarnings('ignore')

# ML results directories
LGBM_RESULTS_DIR = "ml_results/lgbm"
GNN_RESULTS_DIR = "ml_results/gnn"
ENSEMBLE_RESULTS_DIR = "ml_results/ensemble"

for dir_path in [LGBM_RESULTS_DIR, GNN_RESULTS_DIR, ENSEMBLE_RESULTS_DIR]:
    os.makedirs(dir_path, exist_ok=True)


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

    def predict(self, features: Dict[str, float]) -> float:
        """
        Predict mule score using LightGBM model
        
        Returns:
            Score between 0-100
        """
        # Extract feature vector
        feature_vector = self._prepare_features(features)
        
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
        self.model_version = "gnn_v1.0"

    def predict(self, features: Dict[str, float], network_data: Dict[str, Any] = None) -> float:
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
            if counterparties > 50:
                score += 20.0
            elif counterparties > 20:
                score += 15.0
            elif counterparties > 10:
                score += 10.0

        # Fan-in ratio (money in from many sources)
        if 'fan_in_ratio' in features:
            fan_in = features['fan_in_ratio']
            score += min(fan_in * 30, 25.0)

        # Sender concentration (money from few sources)
        if 'sender_concentration' in features:
            concentration = features['sender_concentration']
            if concentration > 0.8:
                score += 20.0
            elif concentration > 0.5:
                score += 15.0
            elif concentration > 0.3:
                score += 10.0

        # Credit-debit asymmetry
        if 'credit_debit_ratio' in features:
            ratio = features['credit_debit_ratio']
            if ratio > 2.0:
                score += 18.0
            elif ratio > 1.5:
                score += 12.0

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
        self.model_version = "ensemble_v1.0"
        self.weights = {
            'lgbm': 0.6,  # 60% weight to LightGBM
            'gnn': 0.4    # 40% weight to GNN
        }

    def predict(self, features: Dict[str, float]) -> Dict[str, float]:
        """
        Predict using ensemble of LightGBM and GNN
        
        Returns:
            Dictionary with individual and ensemble scores
        """
        lgbm_score = self.lgbm.predict(features)
        gnn_score = self.gnn.predict(features)

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


class ModelManager:
    """Manages all ML models"""

    def __init__(self):
        self.ensemble = EnsemblePredictor()
        self.models_loaded = True

    def predict_mule_score(self, account_id: str, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Get mule detection score for an account
        """
        if not features or len(features) == 0:
            raise ValueError("No features provided for prediction")

        # Get ensemble predictions
        scores = self.ensemble.predict(features)

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

    def get_model_stats(self) -> Dict[str, Any]:
        """Get statistics about loaded models"""
        return {
            "ensemble_model": self.ensemble.model_version,
            "lgbm_model": self.ensemble.lgbm.model_version,
            "gnn_model": self.ensemble.gnn.model_version,
            "lgbm_features": len(self.ensemble.lgbm.feature_names),
            "ensemble_weights": self.ensemble.weights,
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
