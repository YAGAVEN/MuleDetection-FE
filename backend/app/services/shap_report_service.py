"""SHAP Model Report generation service"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import json
import pandas as pd
import logging
from pathlib import Path

from .storage_service import storage_service
from .ml_models import SHAPExplainer

logger = logging.getLogger(__name__)


class SHAPReportService:
    def __init__(self) -> None:
        self.temp_dir = storage_service.temp_data_dir
        self.shap_explainer = SHAPExplainer()

    async def generate_model_reports_for_suspicious_accounts(self) -> Dict[str, Any]:
        """
        Generate SHAP model reports for all suspicious accounts
        Uses engineered features to explain predictions
        
        Returns:
            Dictionary with report generation results
        """
        try:
            # Load engineered features
            features_csv = self.temp_dir / "engineered_features.csv"
            if not features_csv.exists():
                raise FileNotFoundError("engineered_features.csv not found")

            features_df = pd.read_csv(features_csv)

            # Load predictions
            predictions_csv = self.temp_dir / "predictions.csv"
            if not predictions_csv.exists():
                raise FileNotFoundError("predictions.csv not found")

            predictions_df = pd.read_csv(predictions_csv)

            # Merge features with predictions
            merged_df = features_df.merge(
                predictions_df,
                on='account_id',
                how='inner'
            )

            # Filter suspicious accounts (is_suspicious == 1)
            suspicious_df = merged_df[merged_df['is_suspicious'] == 1].copy()

            if suspicious_df.empty:
                logger.info("No suspicious accounts found for SHAP analysis")
                return {
                    "status": "success",
                    "total_suspicious": 0,
                    "reports_generated": 0,
                    "message": "No suspicious accounts to analyze"
                }

            # Sort by ensemble_score (highest risk first)
            suspicious_df = suspicious_df.sort_values(
                'ensemble_score', ascending=False
            )

            # Generate reports for top suspicious accounts (limit to 50 for performance)
            top_accounts = suspicious_df.head(50)

            reports = []
            errors = []

            for idx, row in top_accounts.iterrows():
                try:
                    account_id = str(row['account_id'])
                    
                    # Extract feature columns (exclude prediction columns)
                    exclude_cols = [
                        'account_id', 'lightgbm_score', 'gnn_score', 
                        'ensemble_score', 'risk_level', 'is_suspicious'
                    ]
                    
                    feature_cols = [col for col in row.index if col not in exclude_cols]
                    features_dict = {
                        col: float(row[col]) if pd.notna(row[col]) else 0.0 
                        for col in feature_cols
                    }

                    # Generate SHAP explanation
                    explanation = self.shap_explainer.explain_prediction(
                        account_id=account_id,
                        features=features_dict,
                        prediction_score=float(row['ensemble_score']),
                        model_used='ensemble'
                    )

                    # Create model report
                    report = {
                        "account_id": account_id,
                        "ensemble_score": float(row['ensemble_score']),
                        "risk_level": str(row['risk_level']),
                        "gnn_score": float(row['gnn_score']),
                        "lightgbm_score": float(row['lightgbm_score']),
                        "shap_explanation": explanation,
                        "top_risk_features": explanation['top_contributing_features'][:10],
                        "generated_at": datetime.now(timezone.utc).isoformat()
                    }

                    reports.append(report)

                except Exception as e:
                    logger.error(f"Error generating report for {account_id}: {e}")
                    errors.append({
                        "account_id": account_id,
                        "error": str(e)
                    })

            # Save reports
            reports_path = self.temp_dir / "shap_model_reports.json"
            with open(reports_path, 'w') as f:
                json.dump({
                    "total_suspicious": len(suspicious_df),
                    "reports_generated": len(reports),
                    "accounts": reports,
                    "generated_at": datetime.now(timezone.utc).isoformat()
                }, f, indent=2)

            logger.info(f"Generated {len(reports)} SHAP model reports")

            return {
                "status": "success",
                "total_suspicious": int(len(suspicious_df)),
                "reports_generated": len(reports),
                "errors": errors if errors else None,
                "reports_path": str(reports_path),
                "message": f"Generated SHAP reports for {len(reports)} suspicious accounts"
            }

        except Exception as e:
            logger.error(f"SHAP report generation failed: {e}")
            raise

    async def get_model_reports(self, limit: int = 50) -> Dict[str, Any]:
        """
        Retrieve generated SHAP model reports
        
        Args:
            limit: Maximum number of reports to return
            
        Returns:
            Dictionary with reports and metadata
        """
        try:
            reports_path = self.temp_dir / "shap_model_reports.json"
            
            if not reports_path.exists():
                return {
                    "status": "success",
                    "reports": [],
                    "message": "No SHAP reports available. Run feature extraction first."
                }

            with open(reports_path, 'r') as f:
                data = json.load(f)

            # Limit results
            reports = data.get('accounts', [])[:limit]

            return {
                "status": "success",
                "total_suspicious": data.get('total_suspicious', 0),
                "total_reports": data.get('reports_generated', 0),
                "showing": len(reports),
                "reports": reports,
                "generated_at": data.get('generated_at')
            }

        except Exception as e:
            logger.error(f"Error retrieving model reports: {e}")
            raise

    async def get_account_explanation(self, account_id: str) -> Dict[str, Any]:
        """
        Get SHAP explanation for a specific account
        
        Args:
            account_id: Account ID to get explanation for
            
        Returns:
            Account explanation and model report
        """
        try:
            reports_path = self.temp_dir / "shap_model_reports.json"
            
            if not reports_path.exists():
                raise FileNotFoundError("No SHAP reports available")

            with open(reports_path, 'r') as f:
                data = json.load(f)

            # Find account
            for report in data.get('accounts', []):
                if str(report['account_id']) == str(account_id):
                    return {
                        "status": "success",
                        "report": report
                    }

            raise ValueError(f"Account {account_id} not found in reports")

        except Exception as e:
            logger.error(f"Error retrieving account explanation: {e}")
            raise


shap_report_service = SHAPReportService()
