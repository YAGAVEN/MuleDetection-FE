"""Full data analysis pipeline routes - Run predictions on newly ingested data"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging
import pandas as pd

router = APIRouter(prefix="/api/analysis", tags=["Data Analysis Pipeline"])
logger = logging.getLogger(__name__)


@router.post("/run-full-pipeline")
async def run_full_analysis_pipeline() -> Dict[str, Any]:
    """
    Run complete analysis pipeline on newly ingested data:
    1. Feature engineering on all accounts
    2. Model predictions (LightGBM + GNN ensemble)
    3. SHAP explanations
    4. Generate risk reports
    
    Use this after ingesting new data to regenerate all predictions and analyses.
    """
    try:
        logger.info("🚀 Starting full analysis pipeline on newly ingested data...")
        
        from ..services.storage_service import storage_service
        from ..services.feature_pipeline_service import feature_pipeline_service
        from ..services.prediction_pipeline_service import prediction_pipeline_service
        from ..services.shap_report_service import shap_report_service
        
        temp_dir = storage_service.temp_data_dir
        
        # Step 1: Load newly ingested master data
        logger.info("📥 Step 1/4: Loading newly ingested data...")
        master_file = temp_dir / "master.csv"
        
        if not master_file.exists():
            return {
                "status": "error",
                "message": "No ingested data found. Please upload master.csv and transactions_full.csv first",
                "steps_completed": []
            }
        
        try:
            master_df = pd.read_csv(master_file)
            logger.info(f"📊 Loaded {len(master_df)} accounts from master data")
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to load master.csv: {str(e)}",
                "steps_completed": []
            }
        
        # Step 2: Feature Engineering
        logger.info("🔧 Step 2/4: Feature Engineering...")
        feature_meta = await feature_pipeline_service.run()
        engineered_count = int(feature_meta.get("rows", 0))
        logger.info("✅ Feature engineering complete: %s/%s accounts", engineered_count, len(master_df))
        
        # Step 3: Model Predictions (runtime artifacts + model manager)
        logger.info("🤖 Step 3/4: Running ML Model Predictions...")
        prediction_summary = await prediction_pipeline_service.run()
        predictions_count = int(prediction_summary.get("total_accounts_scored", 0))
        logger.info("✅ Model predictions complete: %s/%s accounts", predictions_count, engineered_count)
        
        # Step 4: Generate SHAP Reports
        logger.info("📋 Step 4/4: Generating SHAP Explainability Reports...")
        try:
            shap_result = await shap_report_service.generate_model_reports_for_suspicious_accounts()
            logger.info(f"✅ SHAP reports generated")
        except Exception as e:
            logger.error(f"  ⚠️  SHAP report generation had issues: {e}")
        
        return {
            "status": "success",
            "message": "✅ Full analysis pipeline completed successfully!",
            "steps_completed": [
                f"📥 Data Loading: {len(master_df)} accounts",
                f"🔧 Feature Engineering: {engineered_count} accounts",
                f"🤖 Model Predictions: {predictions_count} accounts",
                f"📋 SHAP Reports: Generated for suspicious accounts"
            ],
            "total_accounts_processed": predictions_count,
            "next_action": "🔄 Click 'Refresh Data' in AutoSAR to see new high-risk accounts"
        }
        
    except Exception as e:
        logger.error(f"❌ Pipeline failed: {e}", exc_info=True)
        return {
            "status": "error",
            "message": f"Pipeline failed: {str(e)}",
            "steps_completed": [],
            "error_details": str(e)
        }


@router.get("/pipeline-status")
async def get_pipeline_status() -> Dict[str, Any]:
    """
    Get current pipeline status and latest analysis results
    """
    try:
        from ..services.storage_service import storage_service
        
        temp_dir = storage_service.temp_data_dir
        
        status = {
            "status": "unknown",
            "has_engineered_features": False,
            "has_predictions": False,
            "has_shap_reports": False,
            "accounts_with_predictions": 0,
            "high_risk_accounts": 0,
            "message": "Checking pipeline data..."
        }
        
        # Check what files exist
        engineered_features = temp_dir / "engineered_features.csv"
        if engineered_features.exists():
            try:
                df = pd.read_csv(engineered_features)
                status["has_engineered_features"] = True
                status["engineered_features_count"] = len(df)
            except:
                pass
        
        predictions = temp_dir / "predictions.csv"
        if predictions.exists():
            try:
                df = pd.read_csv(predictions)
                status["has_predictions"] = True
                status["accounts_with_predictions"] = len(df)
                # Try to count high-risk accounts
                try:
                    high_risk = len(df[df.get('is_suspicious', False) == 1]) if 'is_suspicious' in df.columns else 0
                    status["high_risk_accounts"] = high_risk
                except:
                    status["high_risk_accounts"] = 0
            except:
                pass
        
        shap_reports = temp_dir / "shap_model_reports.json"
        if shap_reports.exists():
            status["has_shap_reports"] = True
        
        if status["has_predictions"] and status["has_shap_reports"]:
            status["status"] = "ready"
            status["message"] = f"✅ Pipeline complete: {status['accounts_with_predictions']} accounts analyzed, {status['high_risk_accounts']} high-risk"
        elif status["has_predictions"]:
            status["status"] = "partial"
            status["message"] = f"⏳ Predictions available ({status['accounts_with_predictions']} accounts) but SHAP reports pending"
        else:
            status["status"] = "incomplete"
            status["message"] = "❌ No analysis data found. Run POST /api/analysis/run-full-pipeline after data ingestion"
        
        return status
        
    except Exception as e:
        logger.error(f"Error getting pipeline status: {e}")
        return {
            "status": "error",
            "message": f"Failed to get status: {str(e)}"
        }
