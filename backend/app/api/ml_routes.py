"""ML prediction API endpoints"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime

from app.schemas import (
    MLPredictionRequest, MLPredictionResponse,
    BatchMLRequest, BatchMLResponse,
    FeatureEngineeringRequest, FeatureEngineeringResponse
)
from app.services.ml_models import get_model_manager
from app.services.feature_engineering import FeatureEngineer
from app.database import get_db_service

router = APIRouter(prefix="/api/v1/ml", tags=["ML Predictions"])

# Initialize services
model_manager = get_model_manager()
feature_engineer = FeatureEngineer()


@router.post("/predict", response_model=MLPredictionResponse)
async def predict_mule_score(request: MLPredictionRequest):
    """
    Predict mule score for a single account
    
    Input features should include:
    - is_frozen, unique_counterparties, monthly_cv
    - structuring_40k_50k_pct, pct_within_6h, ch_*_pct
    - sender_concentration, mobile_spike_ratio, days_since_kyc
    - And other account features
    """
    try:
        result = model_manager.predict_mule_score(
            request.account_id,
            request.features
        )

        response = MLPredictionResponse(
            account_id=result['account_id'],
            lgbm_score=result['lgbm_score'],
            gnn_score=result['gnn_score'],
            ensemble_score=result['ensemble_score'],
            prediction_timestamp=datetime.fromisoformat(result['timestamp']),
            model_versions={
                'lgbm': model_manager.ensemble.lgbm.model_version,
                'gnn': model_manager.ensemble.gnn.model_version,
                'ensemble': model_manager.ensemble.model_version
            }
        )
        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/predict-batch", response_model=BatchMLResponse)
async def batch_predict(request: BatchMLRequest):
    """
    Batch predict mule scores for multiple accounts
    """
    try:
        results, errors = model_manager.batch_predict(
            [{"account_id": acc.account_id, "features": acc.features}
             for acc in request.accounts]
        )

        response_results = [
            MLPredictionResponse(
                account_id=r['account_id'],
                lgbm_score=r['lgbm_score'],
                gnn_score=r['gnn_score'],
                ensemble_score=r['ensemble_score'],
                prediction_timestamp=datetime.fromisoformat(r['timestamp']),
                model_versions={
                    'lgbm': model_manager.ensemble.lgbm.model_version,
                    'gnn': model_manager.ensemble.gnn.model_version,
                    'ensemble': model_manager.ensemble.model_version
                }
            )
            for r in results
        ]

        return BatchMLResponse(
            total=len(request.accounts),
            processed=len(response_results),
            results=response_results,
            errors=errors if errors else None
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@router.post("/predict-and-save", response_model=MLPredictionResponse)
async def predict_and_save(request: MLPredictionRequest):
    """
    Predict mule score and save to Supabase database
    """
    try:
        db_service = get_db_service()
        
        # Get prediction
        result = model_manager.predict_mule_score(
            request.account_id,
            request.features
        )

        # Update account features in database with scores
        update_data = {
            'account_id': request.account_id,
            'lgbm_score': result['lgbm_score'],
            'gnn_score': result['gnn_score'],
            'ensemble_score': result['ensemble_score'],
            **request.features
        }

        db_service.upsert('account_features', update_data)

        # Update main account table with risk score and level
        ensemble_score = result['ensemble_score']
        risk_level = 'LOW'
        if ensemble_score >= 75:
            risk_level = 'CRITICAL'
        elif ensemble_score >= 50:
            risk_level = 'HIGH'
        elif ensemble_score >= 25:
            risk_level = 'MEDIUM'

        db_service.update(
            'accounts',
            {
                'risk_score': ensemble_score,
                'risk_level': risk_level
            },
            {'account_id': request.account_id}
        )

        response = MLPredictionResponse(
            account_id=result['account_id'],
            lgbm_score=result['lgbm_score'],
            gnn_score=result['gnn_score'],
            ensemble_score=result['ensemble_score'],
            prediction_timestamp=datetime.fromisoformat(result['timestamp']),
            model_versions={
                'lgbm': model_manager.ensemble.lgbm.model_version,
                'gnn': model_manager.ensemble.gnn.model_version,
                'ensemble': model_manager.ensemble.model_version
            }
        )
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction and save failed: {str(e)}")


@router.get("/model-info")
async def get_model_info():
    """Get information about loaded models"""
    return model_manager.get_model_stats()


@router.post("/feature-engineering", response_model=FeatureEngineeringResponse)
async def engineer_features(request: FeatureEngineeringRequest):
    """
    Extract and engineer features from raw data
    
    Input raw_data can include:
    - account_age_days, avg_balance
    - total_credit, total_debit
    - transactions: list of transaction objects
    - channels: list of channel objects
    - counterparties: list of counterparty objects
    - transaction_amounts: list of amounts
    - kyc_data: dict with KYC info
    """
    try:
        features = feature_engineer.engineer_features(request.raw_data)
        feature_engineer.save_features(request.account_id, features)

        return FeatureEngineeringResponse(
            account_id=request.account_id,
            features=features,
            feature_version=feature_engineer.feature_version,
            created_at=datetime.now()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feature engineering failed: {str(e)}")


@router.get("/features/{account_id}")
async def get_engineered_features(account_id: str):
    """Retrieve previously engineered features for an account"""
    try:
        features_data = feature_engineer.load_features(account_id)
        if features_data:
            return features_data
        else:
            raise HTTPException(status_code=404, detail="Features not found for this account")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
