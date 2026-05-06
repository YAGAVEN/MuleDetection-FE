"""ML prediction API endpoints"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from typing import List, Optional
from datetime import datetime

from app.schemas import (
    MLPredictionRequest, MLPredictionResponse,
    BatchMLRequest, BatchMLResponse,
    FeatureEngineeringRequest, FeatureEngineeringResponse,
    SHAPExplanationResponse, SHAPBatchExplanationRequest, SHAPBatchExplanationResponse
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


@router.post("/explain", response_model=SHAPExplanationResponse)
async def explain_prediction(request: MLPredictionRequest):
    """
    Generate SHAP explanation for a mule score prediction
    
    Returns feature contributions and which features pushed the score up or down.
    Helps understand why an account was flagged as mule or legitimate.
    """
    try:
        explanation = model_manager.explain_prediction(
            request.account_id,
            request.features
        )
        
        return SHAPExplanationResponse(
            account_id=explanation['account_id'],
            prediction_score=explanation['prediction_score'],
            risk_level="LOW" if explanation['prediction_score'] < 25 else 
                      "MEDIUM" if explanation['prediction_score'] < 50 else
                      "HIGH" if explanation['prediction_score'] < 75 else "CRITICAL",
            base_value=explanation['base_value'],
            feature_contributions=[
                {
                    "feature_name": fc['feature_name'],
                    "shap_value": fc['shap_value'],
                    "base_value": fc['base_value'],
                    "contribution_percentage": fc['contribution_percentage']
                }
                for fc in explanation['feature_contributions']
            ],
            top_positive_features=[
                {
                    "feature_name": fc['feature_name'],
                    "shap_value": fc['shap_value'],
                    "base_value": fc['base_value'],
                    "contribution_percentage": fc['contribution_percentage']
                }
                for fc in explanation['top_positive_features']
            ],
            top_negative_features=[
                {
                    "feature_name": fc['feature_name'],
                    "shap_value": fc['shap_value'],
                    "base_value": fc['base_value'],
                    "contribution_percentage": fc['contribution_percentage']
                }
                for fc in explanation['top_negative_features']
            ],
            model_used=explanation['model_used'],
            explanation_timestamp=datetime.fromisoformat(explanation['timestamp'])
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SHAP explanation failed: {str(e)}")


@router.post("/explain-batch", response_model=SHAPBatchExplanationResponse)
async def batch_explain_predictions(request: SHAPBatchExplanationRequest):
    """
    Generate SHAP explanations for multiple accounts
    
    Batch process explanations for efficient bulk analysis of multiple accounts.
    """
    try:
        explanations, errors = model_manager.batch_explain(
            [{"account_id": acc.account_id, "features": acc.features}
             for acc in request.accounts]
        )
        
        response_explanations = []
        for exp in explanations:
            response_explanations.append(
                SHAPExplanationResponse(
                    account_id=exp['account_id'],
                    prediction_score=exp['prediction_score'],
                    risk_level="LOW" if exp['prediction_score'] < 25 else 
                              "MEDIUM" if exp['prediction_score'] < 50 else
                              "HIGH" if exp['prediction_score'] < 75 else "CRITICAL",
                    base_value=exp['base_value'],
                    feature_contributions=[
                        {
                            "feature_name": fc['feature_name'],
                            "shap_value": fc['shap_value'],
                            "base_value": fc['base_value'],
                            "contribution_percentage": fc['contribution_percentage']
                        }
                        for fc in exp['feature_contributions'][:request.top_features]
                    ],
                    top_positive_features=[
                        {
                            "feature_name": fc['feature_name'],
                            "shap_value": fc['shap_value'],
                            "base_value": fc['base_value'],
                            "contribution_percentage": fc['contribution_percentage']
                        }
                        for fc in exp['top_positive_features'][:request.top_features]
                    ],
                    top_negative_features=[
                        {
                            "feature_name": fc['feature_name'],
                            "shap_value": fc['shap_value'],
                            "base_value": fc['base_value'],
                            "contribution_percentage": fc['contribution_percentage']
                        }
                        for fc in exp['top_negative_features'][:request.top_features]
                    ],
                    model_used=exp['model_used'],
                    explanation_timestamp=datetime.fromisoformat(exp['timestamp'])
                )
            )
        
        return SHAPBatchExplanationResponse(
            total=len(request.accounts),
            processed=len(response_explanations),
            explanations=response_explanations,
            errors=errors if errors else None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch SHAP explanation failed: {str(e)}")


@router.post("/explain-lgbm", response_model=SHAPExplanationResponse)
async def explain_lgbm_only(request: MLPredictionRequest):
    """
    Generate SHAP explanation for LightGBM model only
    
    Shows how the LightGBM gradient boosting model specifically makes its prediction.
    Focuses on transaction patterns and structured amounts.
    """
    try:
        explanation = model_manager.get_lgbm_explanation(
            request.account_id,
            request.features
        )
        
        return SHAPExplanationResponse(
            account_id=explanation['account_id'],
            prediction_score=explanation['prediction_score'],
            risk_level="LOW" if explanation['prediction_score'] < 25 else 
                      "MEDIUM" if explanation['prediction_score'] < 50 else
                      "HIGH" if explanation['prediction_score'] < 75 else "CRITICAL",
            base_value=explanation['base_value'],
            feature_contributions=[
                {
                    "feature_name": fc['feature_name'],
                    "shap_value": fc['shap_value'],
                    "base_value": fc['base_value'],
                    "contribution_percentage": fc['contribution_percentage']
                }
                for fc in explanation['feature_contributions']
            ],
            top_positive_features=[
                {
                    "feature_name": fc['feature_name'],
                    "shap_value": fc['shap_value'],
                    "base_value": fc['base_value'],
                    "contribution_percentage": fc['contribution_percentage']
                }
                for fc in explanation['top_contributing_features']
            ],
            top_negative_features=[],
            model_used="LightGBM",
            explanation_timestamp=datetime.fromisoformat(explanation['timestamp'])
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LightGBM explanation failed: {str(e)}")


@router.post("/explain-gnn", response_model=SHAPExplanationResponse)
async def explain_gnn_only(request: MLPredictionRequest):
    """
    Generate SHAP explanation for GNN model only
    
    Shows how the Graph Neural Network model specifically makes its prediction.
    Focuses on network topology and counterparty relationships.
    """
    try:
        explanation = model_manager.get_gnn_explanation(
            request.account_id,
            request.features
        )
        
        return SHAPExplanationResponse(
            account_id=explanation['account_id'],
            prediction_score=explanation['prediction_score'],
            risk_level="LOW" if explanation['prediction_score'] < 25 else 
                      "MEDIUM" if explanation['prediction_score'] < 50 else
                      "HIGH" if explanation['prediction_score'] < 75 else "CRITICAL",
            base_value=explanation['base_value'],
            feature_contributions=[
                {
                    "feature_name": fc['feature_name'],
                    "shap_value": fc['shap_value'],
                    "base_value": fc['base_value'],
                    "contribution_percentage": fc['contribution_percentage']
                }
                for fc in explanation['feature_contributions']
            ],
            top_positive_features=[
                {
                    "feature_name": fc['feature_name'],
                    "shap_value": fc['shap_value'],
                    "base_value": fc['base_value'],
                    "contribution_percentage": fc['contribution_percentage']
                }
                for fc in explanation['top_contributing_features']
            ],
            top_negative_features=[],
            model_used="GNN",
            explanation_timestamp=datetime.fromisoformat(explanation['timestamp'])
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GNN explanation failed: {str(e)}")


@router.post("/model-report")
async def generate_model_report(request: MLPredictionRequest):
    """
    Generate comprehensive SHAP model comparison report
    
    Compares LightGBM, GNN, and Ensemble models:
    - Individual model predictions and SHAP explanations
    - Model-to-model comparisons
    - Consensus and conflicting features
    - Actionable recommendations
    - Risk assessment
    
    Returns full report saved to ml_results/shap/reports/
    """
    try:
        report = model_manager.generate_model_comparison_report(
            request.account_id,
            request.features
        )
        
        return {
            "status": "success",
            "account_id": report['account_id'],
            "report_title": report['report_title'],
            "overall_risk_assessment": report['overall_risk_assessment'],
            "consensus_features_count": len(report['consensus_features']),
            "conflicting_features_count": len(report['conflicting_features']),
            "lgbm_score": report['lgbm_explanation']['prediction_score'],
            "gnn_score": report['gnn_explanation']['prediction_score'],
            "ensemble_score": report['ensemble_explanation']['prediction_score'],
            "model_agreement_lgbm_vs_gnn": report['lgbm_vs_gnn']['agreement_percentage'],
            "model_agreement_lgbm_vs_ensemble": report['lgbm_vs_ensemble']['agreement_percentage'],
            "model_agreement_gnn_vs_ensemble": report['gnn_vs_ensemble']['agreement_percentage'],
            "top_consensus_features": [
                f['feature_name'] for f in report['consensus_features'][:5]
            ],
            "conflicting_features": [
                f['feature_name'] for f in report['conflicting_features'][:5]
            ],
            "recommendations": report['recommendations'],
            "report_generated_at": report['report_generated_at'],
            "report_saved_to": f"ml_results/shap/reports/{request.account_id}_model_report.json"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@router.post("/model-report-batch")
async def batch_generate_reports(request: SHAPBatchExplanationRequest):
    """
    Generate model comparison reports for multiple accounts
    
    Batch process comprehensive reports for efficient bulk analysis.
    Each report includes model comparisons and recommendations.
    """
    try:
        reports = []
        errors = []
        
        for account_request in request.accounts:
            try:
                report = model_manager.generate_model_comparison_report(
                    account_request.account_id,
                    account_request.features
                )
                
                reports.append({
                    "account_id": report['account_id'],
                    "overall_risk_assessment": report['overall_risk_assessment'],
                    "ensemble_score": report['ensemble_explanation']['prediction_score'],
                    "model_agreement_avg": (
                        report['lgbm_vs_gnn']['agreement_percentage'] +
                        report['lgbm_vs_ensemble']['agreement_percentage'] +
                        report['gnn_vs_ensemble']['agreement_percentage']
                    ) / 3,
                    "top_risk_feature": report['lgbm_explanation']['top_contributing_features'][0]['feature_name']
                    if report['lgbm_explanation']['top_contributing_features'] else "N/A",
                    "primary_recommendation": report['recommendations'][0] if report['recommendations'] else "N/A"
                })
                
            except Exception as e:
                errors.append({
                    "account_id": account_request.account_id,
                    "error": str(e)
                })
        
        return {
            "status": "success",
            "total": len(request.accounts),
            "processed": len(reports),
            "reports": reports,
            "errors": errors if errors else None,
            "reports_saved_to": "ml_results/shap/reports/"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch report generation failed: {str(e)}")


@router.post("/model-report-pdf")
async def generate_model_report_pdf(request: MLPredictionRequest):
    """
    Generate PDF report for model comparison
    
    Returns a downloadable PDF file with comprehensive SHAP analysis including:
    - Model predictions and scores
    - Feature contributions visualization
    - Model comparison and agreement analysis
    - Recommendations
    """
    try:
        # Generate the comprehensive report first
        report = model_manager.generate_model_comparison_report(
            request.account_id,
            request.features
        )
        
        # Generate PDF from the report
        pdf_file = model_manager.shap_explainer.generate_html_pdf_report(
            request.account_id, 
            report
        )
        
        return FileResponse(
            pdf_file,
            media_type="application/pdf",
            filename=f"{request.account_id}_shap_report.pdf"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"PDF library not available: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

