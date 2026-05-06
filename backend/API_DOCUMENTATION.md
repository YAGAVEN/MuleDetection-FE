# Trinetra API Documentation

## Overview

The Trinetra Mule Detection API provides machine learning-powered endpoints for:
1. **Feature Engineering** - Transform raw transaction data into ML features
2. **ML Predictions** - Get mule detection scores from LightGBM, GNN, and Ensemble models
3. **Database Operations** - Sync predictions and data with Supabase

## Models

### 1. LightGBM (Gradient Boosting)
- **Purpose**: Structured feature-based prediction
- **Weight**: 60%
- **Features**: Transaction patterns, account behavior, timing anomalies
- **Output**: Score 0-100

### 2. GNN (Graph Neural Network)
- **Purpose**: Network topology analysis
- **Weight**: 40%
- **Features**: Counterparty relationships, fan-in/out ratios, network density
- **Output**: Score 0-100

### 3. Ensemble
- **Purpose**: Combined prediction
- **Formula**: 0.6 × LightGBM_score + 0.4 × GNN_score
- **Output**: Score 0-100

## Risk Levels
- **LOW**: 0-25
- **MEDIUM**: 25-50
- **HIGH**: 50-75
- **CRITICAL**: 75-100

## API Endpoints

### Health & Monitoring

#### GET /
Returns API information and available endpoints.

**Response**:
```json
{
  "name": "Trinetra Mule Detection API",
  "version": "1.0.0",
  "description": "ML-powered mule account detection system",
  "endpoints": {...}
}
```

#### GET /api/v1/health
Health check endpoint. Returns database and model status.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-05-06T09:48:53.797+05:30",
  "database_connected": true,
  "models_loaded": true
}
```

#### GET /api/v1/status
Get detailed system status and model information.

**Response**:
```json
{
  "api": "running",
  "timestamp": "2024-05-06T09:48:53.797+05:30",
  "version": "1.0.0",
  "models": {
    "ensemble_model": "ensemble_v1.0",
    "lgbm_model": "lgbm_v1.0",
    "gnn_model": "gnn_v1.0",
    "lgbm_features": 23,
    "ensemble_weights": {
      "lgbm": 0.6,
      "gnn": 0.4
    },
    "loaded": true
  },
  "endpoints": {...}
}
```

---

### ML Predictions

#### POST /api/v1/ml/predict
Single account prediction without saving to database.

**Request**:
```json
{
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
}
```

**Response**:
```json
{
  "account_id": "ACC123",
  "lgbm_score": 65.5,
  "gnn_score": 72.3,
  "ensemble_score": 68.1,
  "prediction_timestamp": "2024-05-06T09:48:53.797+05:30",
  "model_versions": {
    "lgbm": "lgbm_v1.0",
    "gnn": "gnn_v1.0",
    "ensemble": "ensemble_v1.0"
  }
}
```

#### POST /api/v1/ml/predict-batch
Batch predictions for multiple accounts.

**Request**:
```json
{
  "accounts": [
    {
      "account_id": "ACC123",
      "features": {...}
    },
    {
      "account_id": "ACC456",
      "features": {...}
    }
  ]
}
```

**Response**:
```json
{
  "total": 2,
  "processed": 2,
  "results": [
    {
      "account_id": "ACC123",
      "lgbm_score": 65.5,
      "gnn_score": 72.3,
      "ensemble_score": 68.1,
      "prediction_timestamp": "2024-05-06T09:48:53.797+05:30",
      "model_versions": {...}
    },
    {
      "account_id": "ACC456",
      "lgbm_score": 32.1,
      "gnn_score": 28.7,
      "ensemble_score": 30.8,
      "prediction_timestamp": "2024-05-06T09:48:54.123+05:30",
      "model_versions": {...}
    }
  ],
  "errors": null
}
```

#### POST /api/v1/ml/predict-and-save
Get prediction and save scores to Supabase database.

**Request**: Same as `/predict`

**Response**: Same as `/predict`

**Side Effects**:
- Saves features to `account_features` table
- Updates `accounts` table with risk_score and risk_level
- Saves individual model outputs to files

#### GET /api/v1/ml/model-info
Get detailed information about loaded models.

**Response**:
```json
{
  "ensemble_model": "ensemble_v1.0",
  "lgbm_model": "lgbm_v1.0",
  "gnn_model": "gnn_v1.0",
  "lgbm_features": 23,
  "ensemble_weights": {
    "lgbm": 0.6,
    "gnn": 0.4
  },
  "loaded": true
}
```

---

### Feature Engineering

#### POST /api/v1/ml/feature-engineering
Extract and engineer features from raw transaction data.

**Request**:
```json
{
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
        "passthrough_hours": 2.5
      }
    ],
    "channels": [
      {
        "name": "NTD",
        "transaction_count": 5
      }
    ],
    "counterparties": [
      {
        "id": "CP001",
        "role": "receiver",
        "sender_id": "SENDER001"
      }
    ],
    "transaction_amounts": [45000, 50000, 45000],
    "kyc_data": {
      "days_since_kyc": 45,
      "doc_count": 3,
      "is_compliant": true
    }
  }
}
```

**Response**:
```json
{
  "account_id": "ACC123",
  "features": {
    "account_age_days": 180,
    "avg_balance": 50000,
    "avg_balance_negative": 0,
    "total_credit": 500000,
    "credit_debit_ratio": 0.909,
    "net_flow": -50000,
    "pct_within_6h": 0.8,
    "mean_passthrough_hours": 2.5,
    "monthly_cv": 0.02,
    "ch_ntd_pct": 1.0,
    "channel_entropy": 0.0,
    "unique_counterparties": 1,
    "fan_in_ratio": 1.0,
    "sender_concentration": 1.0,
    "structuring_40k_50k_pct": 0.667,
    "amt_exact_50k_pct": 0.333,
    "days_since_kyc": 45,
    "kyc_doc_count": 3,
    "kyc_non_compliant": 0
  },
  "feature_version": "v1.0",
  "created_at": "2024-05-06T09:48:53.797+05:30"
}
```

#### GET /api/v1/ml/features/{account_id}
Retrieve previously engineered features for an account.

**Response**:
```json
{
  "account_id": "ACC123",
  "features": {...},
  "version": "v1.0",
  "timestamp": "2024-05-06T09:48:53.797+05:30"
}
```

---

### Database Operations

#### GET /api/v1/db/accounts
Get all accounts (with pagination).

**Query Parameters**:
- `limit` (int, default: 100, max: 1000) - Number of records

**Response**:
```json
[
  {
    "account_id": "ACC123",
    "customer_id": "CUST001",
    "account_status": "active",
    "product_family": "savings",
    "is_mule": 1,
    "risk_score": 68.1,
    "risk_level": "HIGH",
    "avg_balance": 50000.00,
    "is_frozen": false,
    "kyc_compliant": true,
    "rural_branch": false,
    "created_at": "2024-05-01T00:00:00Z",
    "updated_at": "2024-05-06T09:48:53.797+05:30"
  }
]
```

#### GET /api/v1/db/accounts/{account_id}
Get a single account by ID.

**Response**: Single account object

#### POST /api/v1/db/accounts
Create a new account.

**Request**: Account object

**Response**: Created account object

#### PUT /api/v1/db/accounts/{account_id}
Update an existing account.

**Request**: Account object with updated fields

**Response**: Updated account object

#### GET /api/v1/db/account-features/{account_id}
Get engineered features for an account.

**Response**:
```json
{
  "account_id": "ACC123",
  "is_frozen": 0,
  "unique_counterparties": 15,
  "monthly_cv": 0.45,
  ...
  "lgbm_score": 65.5,
  "gnn_score": 72.3,
  "ensemble_score": 68.1,
  "updated_at": "2024-05-06T09:48:53.797+05:30"
}
```

#### POST /api/v1/db/account-features
Save or update account features.

**Request**: Features object

**Response**: Saved features object

#### POST /api/v1/db/account-features/batch
Batch save features for multiple accounts.

**Request**:
```json
[
  {
    "account_id": "ACC123",
    "features": {...}
  },
  {
    "account_id": "ACC456",
    "features": {...}
  }
]
```

**Response**:
```json
{
  "total": 2,
  "saved": 2,
  "data": [...]
}
```

#### GET /api/v1/db/alerts
Get alerts (optionally filtered).

**Query Parameters**:
- `limit` (int, default: 100, max: 1000)
- `account_id` (string, optional)
- `severity` (string, optional: "LOW", "MEDIUM", "HIGH", "CRITICAL")

#### POST /api/v1/db/alerts
Create a new alert.

**Request**:
```json
{
  "account_id": "ACC123",
  "alert_type": "HIGH_RISK_SCORE",
  "severity": "HIGH",
  "title": "High Risk Score Detected",
  "description": "Account exceeded 50 threshold",
  "risk_score": 68.1
}
```

#### GET /api/v1/db/sar-reports
Get SAR (Suspicious Activity) reports.

**Query Parameters**:
- `limit` (int)
- `status` (string: "draft", "validated", "filed", "rejected")
- `account_id` (string)

#### POST /api/v1/db/sar-reports
Create a new SAR report.

**Request**:
```json
{
  "account_id": "ACC123",
  "report_id": "SAR-2024-001",
  "status": "draft",
  "priority": "HIGH",
  "risk_level": "HIGH",
  "summary": "Suspicious structuring activity detected",
  "confidence_score": 0.92,
  "suspicious_transactions": 5,
  "total_amount": 250000.00
}
```

#### GET /api/v1/db/sync-status
Get database synchronization status.

**Response**:
```json
{
  "status": "connected",
  "timestamp": "2024-05-06T09:48:53.797+05:30",
  "table_counts": {
    "accounts": 5000,
    "account_features": 4950,
    "alerts": 128
  }
}
```

---

## Feature List

### Transaction Features
- `monthly_cv` - Coefficient of variation for monthly amounts
- `structuring_40k_50k_pct` - % of transactions in 40k-50k range
- `pct_within_6h` - % of transactions within 6 hours
- `mean_passthrough_hours` - Average time between receiving and sending

### Channel Features
- `ch_ntd_pct` - % of National Transfer via Demand
- `ch_atw_pct` - % of ATW (Account Transfer Web)
- `ch_chq_pct` - % of Cheque
- `channel_entropy` - Diversity of channels used

### Network Features
- `unique_counterparties` - Number of unique counterparties
- `fan_in_ratio` - Proportion of incoming relationships
- `sender_concentration` - Herfindahl index of senders

### Account Features
- `is_frozen` - Account frozen status
- `avg_balance_negative` - Is average balance negative
- `kyc_non_compliant` - KYC non-compliance flag
- `account_age_days` - Age of account in days
- `days_since_kyc` - Days since KYC verification

### Financial Features
- `total_credit` - Total credit amount
- `net_flow` - Net flow (credit - debit)
- `credit_debit_ratio` - Credit to debit ratio
- `avg_txn_amount` - Average transaction amount

### Anomaly Features
- `mobile_spike_ratio` - Ratio of mobile transactions
- `amt_exact_50k_pct` - % of exact 50k transactions

---

## Error Handling

All errors return appropriate HTTP status codes and error messages:

**400 Bad Request**:
```json
{
  "detail": "No features provided for prediction"
}
```

**404 Not Found**:
```json
{
  "detail": "Account not found"
}
```

**500 Internal Server Error**:
```json
{
  "detail": "Prediction failed: <error details>"
}
```

**503 Service Unavailable**:
```json
{
  "detail": "Database connection failed"
}
```

---

## Usage Examples

### Python
```python
import requests

BASE_URL = "http://localhost:8000"

# Get prediction
response = requests.post(
    f"{BASE_URL}/api/v1/ml/predict",
    json={
        "account_id": "ACC123",
        "features": {...}
    }
)
result = response.json()
print(f"Ensemble Score: {result['ensemble_score']}")

# Save to database
response = requests.post(
    f"{BASE_URL}/api/v1/ml/predict-and-save",
    json={...}
)
```

### cURL
```bash
curl -X POST "http://localhost:8000/api/v1/ml/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "ACC123",
    "features": {...}
  }'
```

### JavaScript/Fetch
```javascript
const response = await fetch('http://localhost:8000/api/v1/ml/predict', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    account_id: 'ACC123',
    features: {...}
  })
});
const result = await response.json();
console.log(`Ensemble Score: ${result.ensemble_score}`);
```

---

## Rate Limiting

No rate limiting currently applied. For production, implement rate limiting based on:
- Requests per minute per IP
- Requests per minute per API key
- Batch size limits

---

## Versioning

API version: `v1`  
Current endpoint base: `/api/v1/`

---

## Support & Updates

Check `/api/v1/status` endpoint for current system status and available updates.
