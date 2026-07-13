# Trinetra Mule Detection Backend API

FastAPI-based backend for mule detection with ML model integration and Supabase database synchronization.

## Features

- **ML Predictions**: LightGBM, GNN, and Ensemble models for mule score prediction
- **Feature Engineering**: Automated feature extraction from raw transaction data
- **Database Sync**: Real-time synchronization with Supabase database
- **Batch Processing**: Process multiple accounts simultaneously
- **RESTful API**: Comprehensive endpoints for all operations
- **Health Monitoring**: Built-in health checks and status endpoints

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── health_routes.py      # Health check endpoints
│   │   ├── ml_routes.py          # ML prediction endpoints
│   │   └── db_routes.py          # Database sync endpoints
│   ├── services/
│   │   ├── feature_engineering.py  # Feature extraction pipeline
│   │   └── ml_models.py            # LightGBM, GNN, Ensemble models
│   ├── schemas.py                # Pydantic models
│   ├── database.py               # Supabase connection
│   └── main.py                   # FastAPI application
├── ml_results/                   # ML model outputs
│   ├── feature_engineering/      # Engineered features
│   ├── lgbm/                     # LightGBM predictions
│   ├── gnn/                      # GNN predictions
│   └── ensemble/                 # Ensemble predictions
├── logs/                         # Application logs
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment variables template
└── README.md                     # This file
```

## Quick Start

Get the API running in 3 steps:

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Generate sample data for testing
python -m scripts.generate_sample_data

# 3. Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then visit [http://localhost:8000/docs](http://localhost:8000/docs) to explore the API.

## Installation

1. **Create virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Generate sample data** (optional, for testing):
   ```bash
   python -m scripts.generate_sample_data
   ```
   This generates:
   - `backend/data/transactions.csv` - 500 sample transactions with realistic Indian banking data
   - `backend/data/account_features.csv` - 50 sample account risk profiles

5. **Run the server**:
   ```bash
   python -m app.main
   # or
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Endpoints

### Health & Status
- `GET /` - Root endpoint
- `GET /api/v1/health` - Health check
- `GET /api/v1/status` - Detailed status

### ML Predictions
- `POST /api/v1/ml/predict` - Single prediction
- `POST /api/v1/ml/predict-batch` - Batch predictions
- `POST /api/v1/ml/predict-and-save` - Predict and save to DB
- `GET /api/v1/ml/model-info` - Model information

### Feature Engineering
- `POST /api/v1/ml/feature-engineering` - Engineer features from raw data
- `GET /api/v1/ml/features/{account_id}` - Get engineered features

### Database Operations
- `GET /api/v1/db/accounts` - List accounts
- `GET /api/v1/db/accounts/{account_id}` - Get account
- `POST /api/v1/db/accounts` - Create account
- `PUT /api/v1/db/accounts/{account_id}` - Update account
- `GET /api/v1/db/account-features/{account_id}` - Get features
- `POST /api/v1/db/account-features` - Save features
- `POST /api/v1/db/account-features/batch` - Batch save features
- `GET /api/v1/db/alerts` - List alerts
- `POST /api/v1/db/alerts` - Create alert
- `GET /api/v1/db/sar-reports` - List SAR reports
- `POST /api/v1/db/sar-reports` - Create SAR report
- `GET /api/v1/db/sync-status` - Sync status

## Usage Examples

### 1. Single Prediction
```bash
curl -X POST "http://localhost:8000/api/v1/ml/predict" \
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

### 2. Feature Engineering
```bash
curl -X POST "http://localhost:8000/api/v1/ml/feature-engineering" \
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

### 3. Predict and Save
```bash
curl -X POST "http://localhost:8000/api/v1/ml/predict-and-save" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "ACC123",
    "features": {
      ...feature dictionary...
    }
  }'
```

### 4. Batch Predictions
```bash
curl -X POST "http://localhost:8000/api/v1/ml/predict-batch" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

## ML Model Components

### 1. LightGBM (60% weight)
- Gradient boosting model trained on structured features
- Focuses on transaction patterns and account behavior
- Scores: 0-100

### 2. GNN (Graph Neural Network) (40% weight)
- Graph-based network analysis
- Focuses on counterparty relationships and topology
- Scores: 0-100

### 3. Ensemble
- Weighted combination: 60% LightGBM + 40% GNN
- Final risk score: 0-100
- Risk levels:
  - LOW: 0-25
  - MEDIUM: 25-50
  - HIGH: 50-75
  - CRITICAL: 75-100

## ML Results Storage

Results are automatically saved in the `ml_results/` directory:

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

Each JSON file contains:
- Account ID
- Model version
- Score/predictions
- Timestamp
- Features used

## Database Integration

### Tables Used
- `accounts` - Account master data
- `account_features` - Engineered features and model scores
- `transactions` - Transaction details
- `alerts` - Risk alerts
- `sar_reports` - Suspicious Activity Reports
- `audit_log` - Audit trail

### Row-Level Security
- Authenticated users can view accounts and features
- Admins can upsert data
- All operations are logged

## Error Handling

The API returns standard HTTP status codes:
- `200` - Success
- `400` - Bad request
- `404` - Not found
- `500` - Server error
- `503` - Service unavailable

Error responses include descriptive messages:
```json
{
  "detail": "Feature engineering failed: <error details>"
}
```

## Performance Considerations

- Batch predictions are optimized for throughput
- Feature engineering caches results
- Database queries use efficient indexing
- ML models run in-memory for speed

## Security

- CORS enabled for frontend access
- Trusted host middleware
- Supabase Row-Level Security (RLS) policies
- Environment variables for sensitive data
- No credentials in code

## Development

### Running with hot reload
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Running tests
```bash
pytest tests/ -v
```

### Checking code quality
```bash
flake8 app/
black app/
```

## Deployment

### Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Setup for Production
```bash
cp .env.example .env
# Edit .env with production credentials
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=WARNING
```

## Troubleshooting

### Supabase Connection Issues
- Verify SUPABASE_URL and SUPABASE_KEY in .env
- Check network connectivity
- Ensure service role key has proper permissions

### Model Loading Issues
- Check that numpy, pandas, scikit-learn are installed
- Verify LightGBM and PyTorch installation
- Check available memory

### Feature Engineering Issues
- Ensure raw data has expected structure
- Check for missing or null values
- Verify data types in raw_data

## Future Enhancements

- [ ] Real GBM model loading from saved artifacts
- [ ] Real GNN model with PyTorch Geometric
- [ ] Model retraining pipeline
- [ ] Advanced performance metrics
- [ ] Real-time streaming predictions
- [ ] Model A/B testing framework
- [ ] Advanced alerting system
- [ ] Dashboard integration

## Support

For issues or questions, contact the development team.

## License

Proprietary - All rights reserved
