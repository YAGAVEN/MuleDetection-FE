# Backend Service - Trinetra Mule Detection System

## Overview
FastAPI-based backend service for fraud detection with ML model integration, real-time SHAP explainability, and comprehensive reporting capabilities.

## Directory Structure

```
backend/
├── app/                    # Core application modules
│   ├── api/               # API route handlers
│   ├── services/          # Business logic services  
│   ├── models/            # ML models and artifacts
│   ├── schemas/           # Pydantic schemas
│   ├── utils/             # Utility functions
│   ├── validators/        # Data validators
│   ├── data/              # Data access layer
│   ├── hydra/             # Hydra configuration
│   ├── ml/                # ML pipeline components
│   ├── database.py        # Database configuration
│   ├── main.py            # FastAPI application entry point
│   └── schemas*.py        # Request/response schemas
├── docs/                  # Backend documentation
├── tests/                 # Test files
├── scripts/               # Runtime scripts (run.sh, run.bat)
├── reports/               # Generated reports (PDF, JSON)
│   ├── generated/         # Auto-generated SAR and network reports
│   ├── templates/         # Report templates
│   └── assets/           # Report assets (images, styles)
├── temp-data/            # Runtime temporary data
├── logs/                 # Application logs
├── archive/              # Archived ML results and artifacts
├── docker-compose.yml    # Docker configuration
├── Dockerfile           # Container image definition
└── requirements.txt     # Python dependencies (moved to docs)
```

## Key Components

### API Routes (`app/api/`)
- **Health & Monitoring**: System health endpoints
- **ML Models**: Model command center and prediction endpoints  
- **Ingestion**: Data ingestion and validation endpoints
- **Database**: Database operations endpoints
- **Authentication**: Security and auth endpoints

### Services (`app/services/`)
- **ML Models**: LightGBM, GNN, Ensemble predictors
- **SHAP**: Model explainability service
- **Auto SAR**: Suspicious Activity Report generation
- **Feature Engineering**: Feature extraction and pipeline
- **GAN Training**: Generative Adversarial Network training
- **Ingestion**: Data ingestion orchestration
- **Validation**: Data validation services
- **Storage**: File and data storage management

### ML Models (`app/models/`)
- **Runtime Models**: 
  - `lgbm_fold1.txt` - LightGBM trained model
  - `lightgbm_model.pkl` - LightGBM runtime artifact
  - `gnn_model.pkl` - GNN runtime artifact  
  - `ensemble_model.pkl` - Ensemble runtime artifact
  - `model_commander_center.json` - Model configuration

### Reports System
- **SAR Reports**: Suspicious Activity Report generation
- **Network Analysis**: Account network analysis reports
- **Model Reports**: ML model performance and comparison
- **SHAP Reports**: Feature contribution analysis reports

## Development Setup

### Local Development
```bash
# Using the project startup script
cd ..
./start-dev.sh

# Manual backend startup
cd backend
python3 -m venv venv
source venv/bin/activate  
pip install -r ../docs/backend_docs/requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker Development
```bash
cd backend
docker-compose up
```

## API Endpoints

### Health & Status
- `GET /health` - System health check
- `GET /api/status` - Detailed system status

### Model Operations  
- `POST /api/models/predict` - Single account prediction
- `POST /api/models/batch-predict` - Batch predictions
- `GET /api/models/stats` - Model statistics

### SHAP Explainability
- `POST /api/models/explain` - Generate SHAP explanation
- `POST /api/models/report` - Comprehensive model report
- `GET /api/models/explain/lgbm/{id}` - LightGBM explanation
- `GET /api/models/explain/gnn/{id}` - GNN explanation

### SAR Reports
- `POST /api/reports/sar` - Generate SAR report
- `GET /api/reports/status/{account_id}` - Report status

## Data Flow

1. **Input**: Transaction data via API endpoints
2. **Validation**: Data validation and feature extraction
3. **Prediction**: ML model ensemble scoring
4. **Explainability**: SHAP analysis and feature contributions
5. **Reporting**: Automated report generation
6. **Storage**: Results and reports persisted

## Configuration

### Environment Variables (`.env`)
- Database connections
- API credentials
- Model paths
- Logging configuration

### Model Configuration
- Model paths configured in `app/services/ml_models.py`
- Ensemble weights in runtime artifacts
- Feature names from trained models

## Logging

- **Application Logs**: `logs/auto_sar.log`
- **Pipeline Logs**: `logs/pipeline.log`
- **Ingestion Logs**: `logs/ingestion.log`
- **Hydra Logs**: `logs/auto_sar_hydra.log`

## Testing

Tests are located in `tests/` directory:
```bash
cd backend
python -m pytest tests/
```

## Cleanup & Organization

### Archived Components
- **ML Results**: Old training results moved to `archive/ml_results/`
- **Documentation**: Backend docs consolidated in `docs/`
- **Scripts**: Runtime scripts organized in `scripts/`

### Removed Duplicates
- Consolidated duplicate service directories
- Removed redundant route directories  
- Cleaned up temporary artifacts

## Dependencies

Key dependencies include:
- FastAPI & Uvicorn (web framework)
- LightGBM & scikit-learn (ML models)
- NetworkX (graph processing)
- ReportLab (PDF generation)
- Pandas & NumPy (data processing)

See `docs/backend_docs/requirements.txt` for complete list.

## Deployment

### Production Deployment
```bash
# Using Docker
docker build -t trinetra-backend .
docker run -p 8000:8000 trinetra-backend

# Using scripts
./scripts/run.sh
```

### Environment Configuration
Ensure `.env` file is properly configured with production settings.