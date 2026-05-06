"""Feature engineering service for data preprocessing"""
import numpy as np
import pandas as pd
from typing import Dict, List, Any
from datetime import datetime
import json
import os

FE_RESULTS_DIR = "ml_results/feature_engineering"


class FeatureEngineer:
    """Feature engineering pipeline"""

    def __init__(self):
        self.feature_version = "v1.0"
        os.makedirs(FE_RESULTS_DIR, exist_ok=True)

    def engineer_features(self, raw_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Engineer features from raw data
        
        Returns:
            Dictionary of engineered features
        """
        features = {}

        # Demographic features
        if "account_age_days" in raw_data:
            features["account_age_days"] = raw_data["account_age_days"]

        if "avg_balance" in raw_data:
            balance = raw_data["avg_balance"]
            features["avg_balance"] = balance
            features["avg_balance_negative"] = 1 if balance < 0 else 0

        # Transaction features
        if "total_credit" in raw_data and "total_debit" in raw_data:
            credit = raw_data["total_credit"]
            debit = raw_data["total_debit"]
            total = credit + debit
            
            features["total_credit"] = credit
            features["credit_debit_ratio"] = credit / max(debit, 1)
            features["net_flow"] = credit - debit

        # Transaction timing features
        if "transactions" in raw_data:
            features.update(self._extract_timing_features(raw_data["transactions"]))

        # Channel diversity
        if "channels" in raw_data:
            features.update(self._extract_channel_features(raw_data["channels"]))

        # Counterparty features
        if "counterparties" in raw_data:
            features.update(self._extract_network_features(raw_data["counterparties"]))

        # Structuring detection
        if "transaction_amounts" in raw_data:
            features.update(self._extract_structuring_features(raw_data["transaction_amounts"]))

        # KYC features
        if "kyc_data" in raw_data:
            features.update(self._extract_kyc_features(raw_data["kyc_data"]))

        return features

    def _extract_timing_features(self, transactions: List[Dict]) -> Dict[str, float]:
        """Extract timing-based features"""
        features = {}
        
        if not transactions:
            return features

        # Parse transaction timestamps
        times = []
        for txn in transactions:
            if "timestamp" in txn:
                times.append(txn["timestamp"])

        if len(times) < 2:
            return features

        # Within 6 hours clustering
        times_sorted = sorted(times)
        within_6h = 0
        for i in range(len(times_sorted) - 1):
            diff = (times_sorted[i + 1] - times_sorted[i]).total_seconds() / 3600
            if diff <= 6:
                within_6h += 1

        features["pct_within_6h"] = within_6h / max(len(times) - 1, 1)

        # Mean passthrough hours
        passthrough_hours = []
        for txn in transactions:
            if "passthrough_hours" in txn:
                passthrough_hours.append(txn["passthrough_hours"])

        if passthrough_hours:
            features["mean_passthrough_hours"] = np.mean(passthrough_hours)

        # Monthly coefficient of variation
        monthly_amounts = []
        for txn in transactions:
            if "amount" in txn:
                monthly_amounts.append(txn["amount"])

        if len(monthly_amounts) > 1:
            features["monthly_cv"] = np.std(monthly_amounts) / np.mean(monthly_amounts)

        return features

    def _extract_channel_features(self, channels: List[Dict]) -> Dict[str, float]:
        """Extract channel diversity features"""
        features = {}

        if not channels:
            return features

        channel_counts = {}
        for ch in channels:
            name = ch.get("name", "unknown")
            count = ch.get("transaction_count", 1)
            channel_counts[name] = channel_counts.get(name, 0) + count

        total = sum(channel_counts.values())

        # Named channel percentages
        for channel_name in ["NTD", "ATW", "CHQ"]:
            pct = channel_counts.get(channel_name, 0) / total if total > 0 else 0
            features[f"ch_{channel_name.lower()}_pct"] = pct

        # Channel entropy
        if total > 0:
            entropy = -sum(
                (count / total) * np.log(count / total + 1e-10)
                for count in channel_counts.values()
            )
            features["channel_entropy"] = entropy

        return features

    def _extract_network_features(self, counterparties: List[Dict]) -> Dict[str, float]:
        """Extract network/counterparty features"""
        features = {}

        if not counterparties:
            return features

        unique_count = len(set(cp.get("id", f"unknown_{i}") for i, cp in enumerate(counterparties)))
        features["unique_counterparties"] = unique_count

        # Fan-in ratio (receivers)
        total_txns = len(counterparties)
        fan_in = sum(1 for cp in counterparties if cp.get("role") == "receiver")
        features["fan_in_ratio"] = fan_in / total_txns if total_txns > 0 else 0

        # Sender concentration (Herfindahl index)
        sender_counts = {}
        for cp in counterparties:
            sender = cp.get("sender_id", "unknown")
            sender_counts[sender] = sender_counts.get(sender, 0) + 1

        if total_txns > 0:
            concentration = sum((count / total_txns) ** 2 for count in sender_counts.values())
            features["sender_concentration"] = concentration

        return features

    def _extract_structuring_features(self, amounts: List[float]) -> Dict[str, float]:
        """Detect structuring patterns (amounts near thresholds)"""
        features = {}

        if not amounts:
            return features

        amounts = np.array(amounts)

        # 40k-50k structuring
        in_40_50k = np.sum((amounts >= 40000) & (amounts <= 50000))
        features["structuring_40k_50k_pct"] = in_40_50k / len(amounts)

        # Exact 50k
        exact_50k = np.sum(amounts == 50000)
        features["amt_exact_50k_pct"] = exact_50k / len(amounts)

        return features

    def _extract_kyc_features(self, kyc_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract KYC-related features"""
        features = {}

        if "days_since_kyc" in kyc_data:
            features["days_since_kyc"] = kyc_data["days_since_kyc"]

        if "doc_count" in kyc_data:
            features["kyc_doc_count"] = kyc_data["doc_count"]

        if "is_compliant" in kyc_data:
            features["kyc_non_compliant"] = 0 if kyc_data["is_compliant"] else 1

        return features

    def save_features(self, account_id: str, features: Dict[str, float]):
        """Save engineered features to file"""
        filepath = os.path.join(FE_RESULTS_DIR, f"{account_id}_features.json")
        data = {
            "account_id": account_id,
            "features": features,
            "version": self.feature_version,
            "timestamp": datetime.now().isoformat()
        }
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)

    def load_features(self, account_id: str) -> Dict[str, Any]:
        """Load previously engineered features"""
        filepath = os.path.join(FE_RESULTS_DIR, f"{account_id}_features.json")
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                return json.load(f)
        return None
