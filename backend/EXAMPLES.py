"""Example API usage and test data"""
import json
from typing import Dict, Any

# Sample account data with features for testing

SAMPLE_HIGH_RISK_ACCOUNT = {
    "account_id": "ACC_HIGH_RISK_001",
    "features": {
        "is_frozen": 1,
        "unique_counterparties": 85,
        "monthly_cv": 0.75,
        "structuring_40k_50k_pct": 0.65,
        "pct_within_6h": 0.95,
        "ch_ntd_pct": 0.60,
        "ch_atw_pct": 0.30,
        "ch_chq_pct": 0.10,
        "avg_txn_amount": 47500.00,
        "sender_concentration": 0.85,
        "mobile_spike_ratio": 5.2,
        "days_since_kyc": 120,
        "fan_in_ratio": 0.88,
        "amt_exact_50k_pct": 0.42,
        "avg_balance_negative": 1,
        "kyc_doc_count": 1,
        "kyc_non_compliant": 1,
        "account_age_days": 30,
        "total_credit": 2500000.00,
        "net_flow": -1500000.00,
        "credit_debit_ratio": 0.625,
        "mean_passthrough_hours": 0.5,
        "channel_entropy": 0.8
    }
}

SAMPLE_MEDIUM_RISK_ACCOUNT = {
    "account_id": "ACC_MEDIUM_RISK_001",
    "features": {
        "is_frozen": 0,
        "unique_counterparties": 25,
        "monthly_cv": 0.45,
        "structuring_40k_50k_pct": 0.25,
        "pct_within_6h": 0.30,
        "ch_ntd_pct": 0.40,
        "ch_atw_pct": 0.35,
        "ch_chq_pct": 0.25,
        "avg_txn_amount": 45000.50,
        "sender_concentration": 0.65,
        "mobile_spike_ratio": 2.5,
        "days_since_kyc": 45,
        "fan_in_ratio": 0.55,
        "amt_exact_50k_pct": 0.10,
        "avg_balance_negative": 0,
        "kyc_doc_count": 3,
        "kyc_non_compliant": 0,
        "account_age_days": 180,
        "total_credit": 500000.00,
        "net_flow": -50000.00,
        "credit_debit_ratio": 0.85,
        "mean_passthrough_hours": 2.5,
        "channel_entropy": 1.2
    }
}

SAMPLE_LOW_RISK_ACCOUNT = {
    "account_id": "ACC_LOW_RISK_001",
    "features": {
        "is_frozen": 0,
        "unique_counterparties": 5,
        "monthly_cv": 0.10,
        "structuring_40k_50k_pct": 0.02,
        "pct_within_6h": 0.05,
        "ch_ntd_pct": 0.20,
        "ch_atw_pct": 0.50,
        "ch_chq_pct": 0.30,
        "avg_txn_amount": 25000.00,
        "sender_concentration": 0.40,
        "mobile_spike_ratio": 0.8,
        "days_since_kyc": 5,
        "fan_in_ratio": 0.20,
        "amt_exact_50k_pct": 0.00,
        "avg_balance_negative": 0,
        "kyc_doc_count": 5,
        "kyc_non_compliant": 0,
        "account_age_days": 365,
        "total_credit": 100000.00,
        "net_flow": 25000.00,
        "credit_debit_ratio": 1.50,
        "mean_passthrough_hours": 24.0,
        "channel_entropy": 1.8
    }
}

SAMPLE_RAW_DATA = {
    "account_id": "ACC123",
    "raw_data": {
        "account_age_days": 180,
        "avg_balance": 50000,
        "total_credit": 500000,
        "total_debit": 550000,
        "transactions": [
            {
                "timestamp": "2024-05-01T10:30:00Z",
                "amount": 45000,
                "passthrough_hours": 2.5,
                "channel": "NTD"
            },
            {
                "timestamp": "2024-05-01T11:45:00Z",
                "amount": 50000,
                "passthrough_hours": 1.2,
                "channel": "NTD"
            },
            {
                "timestamp": "2024-05-02T09:15:00Z",
                "amount": 45000,
                "passthrough_hours": 3.0,
                "channel": "ATW"
            }
        ],
        "channels": [
            {
                "name": "NTD",
                "transaction_count": 2
            },
            {
                "name": "ATW",
                "transaction_count": 1
            }
        ],
        "counterparties": [
            {
                "id": "CP001",
                "role": "receiver",
                "sender_id": "SENDER001"
            },
            {
                "id": "CP002",
                "role": "sender",
                "sender_id": "SENDER002"
            }
        ],
        "transaction_amounts": [45000, 50000, 45000],
        "kyc_data": {
            "days_since_kyc": 45,
            "doc_count": 3,
            "is_compliant": True
        }
    }
}

SAMPLE_BATCH_REQUEST = {
    "accounts": [
        SAMPLE_HIGH_RISK_ACCOUNT,
        SAMPLE_MEDIUM_RISK_ACCOUNT,
        SAMPLE_LOW_RISK_ACCOUNT
    ]
}


def print_request(endpoint: str, method: str, data: Dict[str, Any]):
    """Pretty print API request"""
    print(f"\n{'='*70}")
    print(f"Request: {method} {endpoint}")
    print(f"{'='*70}")
    print(json.dumps(data, indent=2))


def print_response(data: Dict[str, Any]):
    """Pretty print API response"""
    print(f"\n{'─'*70}")
    print("Response:")
    print(f"{'─'*70}")
    print(json.dumps(data, indent=2))


# Example curl commands
CURL_EXAMPLES = {
    "health_check": """
curl -X GET "http://localhost:8000/api/v1/health" \\
  -H "Accept: application/json"
    """,
    
    "single_prediction": """
curl -X POST "http://localhost:8000/api/v1/ml/predict" \\
  -H "Content-Type: application/json" \\
  -d '{
    "account_id": "ACC123",
    "features": {
      "is_frozen": 0,
      "unique_counterparties": 15,
      "monthly_cv": 0.45,
      "structuring_40k_50k_pct": 0.25,
      "pct_within_6h": 0.30,
      "ch_ntd_pct": 0.40,
      "ch_atw_pct": 0.35,
      "ch_chq_pct": 0.25,
      "avg_txn_amount": 45000.50,
      "sender_concentration": 0.65,
      "mobile_spike_ratio": 2.5,
      "days_since_kyc": 45,
      "fan_in_ratio": 0.55,
      "amt_exact_50k_pct": 0.10,
      "avg_balance_negative": 0,
      "kyc_doc_count": 3,
      "kyc_non_compliant": 0,
      "account_age_days": 180,
      "total_credit": 500000.00,
      "net_flow": -50000.00,
      "credit_debit_ratio": 0.85,
      "mean_passthrough_hours": 2.5,
      "channel_entropy": 1.2
    }
  }'
    """,
    
    "feature_engineering": """
curl -X POST "http://localhost:8000/api/v1/ml/feature-engineering" \\
  -H "Content-Type: application/json" \\
  -d '{
    "account_id": "ACC123",
    "raw_data": {
      "account_age_days": 180,
      "avg_balance": 50000,
      "total_credit": 500000,
      "total_debit": 550000,
      "transactions": [],
      "channels": [],
      "counterparties": [],
      "transaction_amounts": [],
      "kyc_data": {}
    }
  }'
    """,
    
    "batch_prediction": """
curl -X POST "http://localhost:8000/api/v1/ml/predict-batch" \\
  -H "Content-Type: application/json" \\
  -d '{
    "accounts": [
      {"account_id": "ACC123", "features": {...}},
      {"account_id": "ACC456", "features": {...}}
    ]
  }'
    """,
    
    "get_accounts": """
curl -X GET "http://localhost:8000/api/v1/db/accounts?limit=50" \\
  -H "Accept: application/json"
    """,
    
    "get_account_features": """
curl -X GET "http://localhost:8000/api/v1/db/account-features/ACC123" \\
  -H "Accept: application/json"
    """
}


if __name__ == "__main__":
    print("Trinetra API - Example Data and Requests")
    print("=" * 70)
    
    print("\nSample Accounts:")
    print("-" * 70)
    print("\n1. HIGH RISK ACCOUNT:")
    print_response(SAMPLE_HIGH_RISK_ACCOUNT)
    
    print("\n2. MEDIUM RISK ACCOUNT:")
    print_response(SAMPLE_MEDIUM_RISK_ACCOUNT)
    
    print("\n3. LOW RISK ACCOUNT:")
    print_response(SAMPLE_LOW_RISK_ACCOUNT)
    
    print("\n\nSample API Requests (curl):")
    print("=" * 70)
    for name, curl_cmd in CURL_EXAMPLES.items():
        print(f"\n{name.upper()}:")
        print(curl_cmd)
