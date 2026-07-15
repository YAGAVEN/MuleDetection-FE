# Trinetra Mule Detection System

A comprehensive fraud detection system using Machine Learning (LightGBM, GNN) and Graph Neural Networks for mule account detection with real-time SHAP explainability.

## Project Structure

```
IOB-CyberNova/
├── backend/              # FastAPI backend service
│   ├── app/             # Core application modules
│   ├── services/        # Business logic services
│   ├── routes/          # API endpoints
│   ├── tests/           # Backend test files
│   └── requirements.txt # Python dependencies
├── frontend/            # React frontend application
│   ├── src/            # React components and pages
│   └── public/         # Static assets
├── docs/               # Project documentation
│   ├── backend_docs/  # Backend-specific documentation
│   └── *.md           # General project documentation
├── tests/             # Test files
├── archive/           # Archived files and artifacts
│   ├── models/        # Old training artifacts
│   ├── reports/       # Old ML results and reports
│   ├── scripts/       # Archived scripts
│   └── old_prompts/   # Old prompt files
├── Mule-data/         # Data processing workspace
│   ├── models/        # Essential model files (lgbm_fold1.txt)
│   ├── features/      # Feature extraction pipeline
│   ├── gan_training/  # GAN training workspace
│   └── gnn/          # GNN training workspace
├── scripts/           # Data loading and validation scripts
├── submissions/       # Generated submission data
└── start-dev.sh       # Development startup script
```

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Git

### Development Setup

1. **Start Development Environment:**
   ```bash
   ./start-dev.sh
   ```
   This starts both backend (port 8000) and frontend (port 5173)

2. **Manual Backend Setup:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Manual Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev -- --host 0.0.0.0 --port 5173
   ```

## Core Features

### ML Models
- **LightGBM**: Gradient boosting model for transaction pattern analysis
- **GNN**: Graph Neural Network for network topology analysis  
- **Ensemble**: Weighted combination of both models
- **SHAP**: Real-time explainability for model predictions

### API Endpoints
- Health monitoring endpoints
- Batch prediction endpoints
- SHAP explanation endpoints
- Model comparison reports
- Real-time scoring endpoints

## Model Files

### Essential Runtime Models
- `backend/app/models/lgbm_fold1.txt` - LightGBM trained model
- `backend/app/models/lightgbm_model.pkl` - LightGBM runtime artifact
- `backend/app/models/gnn_model.pkl` - GNN runtime artifact
- `backend/app/models/ensemble_model.pkl` - Ensemble runtime artifact

### Archived Training Artifacts
Training artifacts and old models have been moved to `archive/models/training_artifacts/` for reference but are not used in runtime.

## Documentation

- **General Documentation**: `docs/` directory
- **Backend Documentation**: `docs/backend_docs/`
- **API Documentation**: `docs/backend_docs/API_DOCUMENTATION.md`
- **Quick Start Guides**: `docs/backend_docs/QUICK_REFERENCE.md`

## Tests

- **Root Tests**: `tests/` directory
- **Backend Tests**: `backend/tests/` directory

## Data Processing

- **Raw Data**: `Mule-data/` directory
- **Feature Extraction**: `Mule-data/feature_extraction_pipeline.py`
- **LightGBM Pipeline**: `Mule-data/lightgbm_pipeline.py`
- **EDA Pipeline**: `Mule-data/eda_pipeline.py`

## Cleanup Summary

This project has been organized to:
- **Archive**: Old training artifacts, reports, and unused scripts
- **Document**: All documentation consolidated in `docs/`
- **Test**: Test files organized in proper test directories
- **Clean**: Removed duplicate and unnecessary files
- **Structure**: Clear separation between runtime and archival data

## Development Workflow

1. **Feature Development**: Work in `backend/` and `frontend/`
2. **Testing**: Use organized test directories
3. **Documentation**: Update relevant docs in `docs/`
4. **Model Training**: Use `Mule-data/` workspace
5. **Deployment**: Runtime models are in `backend/app/models/`

## License

See LICENSE file for details.