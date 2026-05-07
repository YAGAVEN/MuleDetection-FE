"""Health check and general API endpoints"""
from fastapi import APIRouter, HTTPException
from datetime import datetime

from ..schemas import HealthCheckResponse
from ..database import get_db_service
from ..services.ml_models import get_model_manager

router = APIRouter(prefix="/api/v1", tags=["Health"])

db_service = get_db_service()
model_manager = get_model_manager()


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Check API and database health"""
    try:
        # Test database connection
        db_connected = False
        try:
            result = db_service.get_all('accounts', limit=1)
            db_connected = result.data is not None or result.data == []
        except:
            db_connected = False

        # Check models
        models_loaded = model_manager.models_loaded

        return HealthCheckResponse(
            status="healthy",
            timestamp=datetime.now(),
            database_connected=db_connected,
            models_loaded=models_loaded
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Health check failed: {str(e)}")


@router.get("/status")
async def get_status():
    """Get detailed status information"""
    try:
        model_stats = model_manager.get_model_stats()
        
        return {
            "api": "running",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
            "models": model_stats,
            "endpoints": {
                "ml_predictions": "/api/v1/ml/predict",
                "batch_predictions": "/api/v1/ml/predict-batch",
                "feature_engineering": "/api/v1/ml/feature-engineering",
                "database": "/api/v1/db",
                "accounts": "/api/v1/db/accounts",
                "features": "/api/v1/db/account-features",
                "alerts": "/api/v1/db/alerts",
                "sar_reports": "/api/v1/db/sar-reports"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": "Trinetra Mule Detection API",
        "version": "1.0.0",
        "description": "ML-powered mule account detection with Supabase integration",
        "docs": "/docs",
        "openapi": "/openapi.json"
    }
