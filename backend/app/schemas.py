"""Pydantic schemas for request/response validation"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class AccountBase(BaseModel):
    account_id: str
    customer_id: Optional[str] = None
    account_status: Optional[str] = None
    product_family: Optional[str] = None
    is_mule: Optional[int] = None
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    avg_balance: Optional[float] = None
    is_frozen: bool = False
    kyc_compliant: Optional[bool] = None
    rural_branch: Optional[bool] = None


class AccountResponse(AccountBase):
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AccountFeaturesBase(BaseModel):
    account_id: str
    is_frozen: int = 0
    unique_counterparties: Optional[int] = None
    monthly_cv: Optional[float] = None
    structuring_40k_50k_pct: Optional[float] = None
    pct_within_6h: Optional[float] = None
    ch_ntd_pct: Optional[float] = None
    ch_atw_pct: Optional[float] = None
    ch_chq_pct: Optional[float] = None
    avg_txn_amount: Optional[float] = None
    sender_concentration: Optional[float] = None
    mobile_spike_ratio: Optional[float] = None
    days_since_kyc: Optional[int] = None
    fan_in_ratio: Optional[float] = None
    amt_exact_50k_pct: Optional[float] = None
    avg_balance_negative: int = 0
    kyc_doc_count: Optional[int] = None
    kyc_non_compliant: int = 0
    account_age_days: Optional[int] = None
    total_credit: Optional[float] = None
    net_flow: Optional[float] = None
    credit_debit_ratio: Optional[float] = None
    mean_passthrough_hours: Optional[float] = None
    channel_entropy: Optional[float] = None


class MLScoresRequest(AccountFeaturesBase):
    pass


class MLScoresResponse(AccountFeaturesBase):
    lgbm_score: Optional[float] = None
    gnn_score: Optional[float] = None
    ensemble_score: Optional[float] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class FeatureEngineeringRequest(BaseModel):
    account_id: str
    raw_data: Dict[str, Any]


class FeatureEngineeringResponse(BaseModel):
    account_id: str
    features: Dict[str, float]
    feature_version: str = "v1.0"
    created_at: datetime


class MLPredictionRequest(BaseModel):
    account_id: str
    features: Dict[str, float]


class MLPredictionResponse(BaseModel):
    account_id: str
    lgbm_score: float
    gnn_score: float
    ensemble_score: float
    prediction_timestamp: datetime
    model_versions: Dict[str, str]


class BatchMLRequest(BaseModel):
    accounts: List[MLPredictionRequest]


class BatchMLResponse(BaseModel):
    total: int
    processed: int
    results: List[MLPredictionResponse]
    errors: Optional[List[Dict[str, Any]]] = None


class AlertBase(BaseModel):
    account_id: str
    alert_type: str
    severity: str
    title: str
    description: Optional[str] = None
    risk_score: Optional[float] = None


class AlertResponse(AlertBase):
    id: str
    is_read: bool = False
    is_actioned: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class SARReportBase(BaseModel):
    account_id: str
    report_id: str
    status: str = "draft"
    priority: Optional[str] = None
    risk_level: Optional[str] = None
    summary: Optional[str] = None
    confidence_score: Optional[float] = None
    suspicious_transactions: Optional[int] = None
    total_amount: Optional[float] = None
    report_json: Optional[Dict[str, Any]] = None
    filing_deadline: Optional[str] = None


class SARReportResponse(SARReportBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HealthCheckResponse(BaseModel):
    status: str
    timestamp: datetime
    database_connected: bool
    models_loaded: bool


class FeatureContribution(BaseModel):
    feature_name: str
    shap_value: float
    base_value: float
    contribution_percentage: float


class SHAPExplanationResponse(BaseModel):
    account_id: str
    prediction_score: float
    risk_level: str
    base_value: float
    feature_contributions: List[FeatureContribution]
    top_positive_features: List[FeatureContribution]
    top_negative_features: List[FeatureContribution]
    model_used: str
    explanation_timestamp: datetime
    
    class Config:
        from_attributes = True


class SHAPBatchExplanationRequest(BaseModel):
    accounts: List[MLPredictionRequest]
    top_features: int = 10


class SHAPBatchExplanationResponse(BaseModel):
    total: int
    processed: int
    explanations: List[SHAPExplanationResponse]
    errors: Optional[List[Dict[str, Any]]] = None


class ModelExplanationReport(BaseModel):
    """Explanation for a single model (LightGBM, GNN, or Ensemble)"""
    model_name: str
    prediction_score: float
    risk_level: str
    base_value: float
    top_contributing_features: List[FeatureContribution]
    feature_analysis: Dict[str, FeatureContribution]
    model_version: str
    timestamp: datetime


class ModelComparisonData(BaseModel):
    """Comparison data between models"""
    model_1: str
    model_2: str
    score_difference: float
    agreement_percentage: float
    disagreeing_features: List[str]
    average_feature_weight_diff: float


class SHAPModelReport(BaseModel):
    """Comprehensive SHAP report comparing LightGBM, GNN, and Ensemble"""
    account_id: str
    report_title: str
    report_description: str
    
    # Individual model explanations
    lgbm_explanation: ModelExplanationReport
    gnn_explanation: ModelExplanationReport
    ensemble_explanation: ModelExplanationReport
    
    # Comparisons
    lgbm_vs_gnn: ModelComparisonData
    lgbm_vs_ensemble: ModelComparisonData
    gnn_vs_ensemble: ModelComparisonData
    
    # Summary
    consensus_features: List[FeatureContribution]  # Features all models agree on
    conflicting_features: List[FeatureContribution]  # Features models disagree on
    overall_risk_assessment: str
    recommendations: List[str]
    
    report_generated_at: datetime
    shap_version: str
