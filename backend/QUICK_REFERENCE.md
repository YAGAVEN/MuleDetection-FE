# Quick Reference Guide

## Starting the Backend

### Linux/Mac
```bash
cd backend
bash run.sh
```

### Windows
```bash
cd backend
run.bat
```

### Manual Start
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn app.main:app --reload
```

### Docker
```bash
cd backend
docker-compose up --build
```

**API Available at**: http://localhost:8000

---

## Core Endpoints

### Health
```bash
# Check if API is running
curl http://localhost:8000/api/v1/health
```

### Single Prediction
```bash
curl -X POST http://localhost:8000/api/v1/ml/predict \
  -H "Content-Type: application/json" \
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
```

### Predict & Save to Database
```bash
curl -X POST http://localhost:8000/api/v1/ml/predict-and-save \
  -H "Content-Type: application/json" \
  -d '{"account_id": "ACC123", "features": {...}}'
```

### Feature Engineering
```bash
curl -X POST http://localhost:8000/api/v1/ml/feature-engineering \
  -H "Content-Type: application/json" \
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
```

### Batch Predictions
```bash
curl -X POST http://localhost:8000/api/v1/ml/predict-batch \
  -H "Content-Type: application/json" \
  -d '{
    "accounts": [
      {"account_id": "ACC123", "features": {...}},
      {"account_id": "ACC456", "features": {...}}
    ]
  }'
```

### Get Accounts
```bash
curl http://localhost:8000/api/v1/db/accounts?limit=50
```

### Get Account Features
```bash
curl http://localhost:8000/api/v1/db/account-features/ACC123
```

### Get Alerts
```bash
curl http://localhost:8000/api/v1/db/alerts
```

---

## Response Examples

### Prediction Response
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

### Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2024-05-06T09:48:53.797+05:30",
  "database_connected": true,
  "models_loaded": true
}
```

---

## Risk Levels

Based on ensemble score:
- **LOW**: 0-25
- **MEDIUM**: 25-50
- **HIGH**: 50-75
- **CRITICAL**: 75-100

---

## Feature Requirements

Minimum features needed for prediction:
- is_frozen
- unique_counterparties
- monthly_cv
- structuring_40k_50k_pct
- pct_within_6h
- ch_ntd_pct, ch_atw_pct, ch_chq_pct
- avg_txn_amount
- sender_concentration
- mobile_spike_ratio
- days_since_kyc
- fan_in_ratio
- amt_exact_50k_pct
- avg_balance_negative
- kyc_doc_count
- kyc_non_compliant
- account_age_days
- total_credit
- net_flow
- credit_debit_ratio
- mean_passthrough_hours
- channel_entropy

---

## Configuration

### Environment File (.env)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

Location: `backend/.env`

---

## ML Results Storage

Predictions are saved to:
```
ml_results/
├── feature_engineering/
│   └── {account_id}_features.json
├── lgbm/
│   └── {account_id}_prediction.json
├── gnn/
│   └── {account_id}_prediction.json
└── ensemble/
    └── {account_id}_ensemble.json
```

---

## Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Main documentation |
| `API_DOCUMENTATION.md` | Complete API reference |
| `DEPLOYMENT.md` | Deployment guide |
| `EXAMPLES.py` | Sample data and requests |
| `IMPLEMENTATION_SUMMARY.md` | What was built |
| `QUICK_REFERENCE.md` | This file |

---

## Common Tasks

### Check API Status
```bash
curl http://localhost:8000/api/v1/status
```

### Run Sample Predictions
```bash
python EXAMPLES.py
```

### View Logs
```bash
# Docker
docker-compose logs -f backend

# Direct
tail -f logs/app.log
```

### Stop Backend
```bash
# Docker
docker-compose down

# Manual
Ctrl+C in terminal
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port 8000
lsof -i :8000
kill -9 <PID>
```

### Module Not Found
```bash
# Reinstall dependencies
pip install -r requirements.txt
```

### Supabase Connection Failed
1. Check .env file has correct credentials
2. Verify SUPABASE_URL format
3. Test connectivity: `curl https://your-project.supabase.co`

### Docker Issues
```bash
# Clean and rebuild
docker-compose down -v
docker-compose up --build
```

---

## Python Usage

```python
import requests
import json

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
print(f"Score: {result['ensemble_score']}")
```

---

## JavaScript/Fetch Usage

```javascript
const BASE_URL = "http://localhost:8000";

// Get prediction
const response = await fetch(
  `${BASE_URL}/api/v1/ml/predict`,
  {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      account_id: 'ACC123',
      features: {...}
    })
  }
);

const result = await response.json();
console.log(`Score: ${result.ensemble_score}`);
```

---

## Database Tables

**Accounts**: `accounts`
- account_id, customer_id, account_status
- is_mule, risk_score, risk_level
- avg_balance, is_frozen, kyc_compliant

**Features**: `account_features`
- account_id, 23 feature columns
- lgbm_score, gnn_score, ensemble_score

**Transactions**: `transactions`
- transaction_id, account_id, counterparty_id
- amount, txn_type, channel, suspicious_score

**Alerts**: `alerts`
- id, account_id, alert_type, severity
- title, description, risk_score, is_read

**Reports**: `sar_reports`
- id, account_id, report_id, status
- priority, risk_level, summary, confidence_score

---

## Performance Tips

1. **Batch Processing**: Use `/predict-batch` for multiple accounts
2. **Caching**: Features are cached after engineering
3. **Database**: Use limits and filters to reduce data transfer
4. **Async**: API handles requests asynchronously

---

## Support Resources

- Interactive Docs: http://localhost:8000/docs (Swagger UI)
- ReDoc: http://localhost:8000/redoc
- OpenAPI Schema: http://localhost:8000/openapi.json

---

## Version Info

- **API Version**: 1.0.0
- **FastAPI**: 0.104.1
- **Python**: 3.11+
- **Models**: LightGBM v1.0, GNN v1.0, Ensemble v1.0
