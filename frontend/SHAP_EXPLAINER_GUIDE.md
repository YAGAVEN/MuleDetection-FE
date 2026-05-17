# AUTOSAR - SHAP Model Explainer Guide

## Overview

The **AUTOSAR** system is an advanced fraud detection and explainability platform that combines Suspicious Activity Report (SAR) generation with cutting-edge SHAP (SHapley Additive exPlanations) model interpretability.

## Features

### 1. SAR (Suspicious Activity Report) Generation
- Automated detection of suspicious financial patterns
- AI-powered analysis of transaction behaviors
- Regulatory compliance validation
- Geographic risk assessment with interactive maps
- PDF export capabilities

### 2. SHAP Analysis (Machine Learning Explainability)
- Upload account data in JSON format
- Get detailed feature importance analysis
- Understand which factors increase/decrease fraud risk
- Feature contribution visualization with SHAP values

## Getting Started

### Accessing AUTOSAR

1. Navigate to the AUTOSAR page from the main dashboard
2. You'll see two tabs:
   - **📋 SAR Reports** - Traditional suspicious activity reporting
   - **🔬 SHAP Analysis** - ML model explainability

### Using SHAP Analysis

#### Step 1: Prepare Your Account Data

Create a JSON file with account features. Here's the required structure:

```json
{
  "account_id": "ACC_2024_001",
  "customer_name": "John Doe",
  "account_type": "Savings",
  "features": {
    "is_frozen": 0,
    "unique_counterparties": 15,
    "monthly_cv": 45230.50,
    "structuring_40k_50k_pct": 12.5,
    "pct_within_6h": 8.3,
    "ch_incoming_pct": 42.1,
    "ch_outgoing_pct": 38.9,
    "sender_concentration": 0.35,
    "mobile_spike_ratio": 2.1,
    "days_since_kyc": 180,
    "avg_transaction_amount": 5420.25,
    "max_transaction_amount": 45000.00,
    "transaction_count_30d": 127,
    "high_risk_counterparties": 3,
    "international_transactions": 5,
    "rapid_transfers": 8,
    "account_age_days": 547,
    "behavioral_score": 0.62,
    "network_score": 0.58,
    "layering_score": 0.45,
    "velocity_score": 0.71,
    "geographic_risk": 0.35
  }
}
```

#### Step 2: Upload the JSON File

1. Click on the **SHAP Analysis** tab
2. Click on the upload area or drag & drop your JSON file
3. The system will validate and display the account ID

#### Step 3: Generate Report

1. Click the **🔍 Generate SHAP Report** button
2. The system will:
   - Send the data to the backend ML model
   - Calculate prediction scores (LightGBM, GNN, Ensemble)
   - Generate SHAP explanations
   - Visualize feature contributions

#### Step 4: Interpret the Results

The report displays:

- **Prediction Score**: Overall fraud risk score (0-100)
- **Risk Level**: LOW, MEDIUM, HIGH, or CRITICAL
- **Base Value**: Average prediction baseline
- **Model Used**: Ensemble (LightGBM + GNN)

##### Feature Analysis

**Risk Increasing Features (Green)**
- Features that push the risk score UP
- Higher SHAP values indicate stronger contribution
- Example: High structuring patterns, rapid transfers

**Risk Decreasing Features (Blue)**
- Features that push the risk score DOWN
- Indicate protective/legitimate behaviors
- Example: Long account age, verified KYC status

**All Contributions**
- Complete list of all features and their impact
- Contribution percentage to overall prediction
- SHAP values with base values

## Understanding SHAP Values

### What is SHAP?

SHAP (SHapley Additive exPlanations) is a game-theoretic approach to explaining machine learning predictions. It assigns each feature an importance value based on its contribution to the final prediction.

### SHAP Value Interpretation

- **Positive SHAP value**: Feature increases fraud risk
- **Negative SHAP value**: Feature decreases fraud risk
- **Magnitude**: Larger absolute value = stronger contribution
- **Contribution %**: Percentage of total model decision

### Example

```
Feature: "structuring_40k_50k_pct"
SHAP Value: 15.5
Contribution: 28.4%
Interpretation: Transactions just under threshold account for 28.4% 
                of the elevated fraud risk for this account
```

## Account Features Reference

### Transaction Behavior Features
- `unique_counterparties`: Number of unique transaction partners
- `monthly_cv`: Monthly coefficient of variation
- `structuring_40k_50k_pct`: % transactions in 40-50k range
- `pct_within_6h`: % transactions within 6 hours
- `transaction_count_30d`: Number of transactions in 30 days

### Channel Distribution Features
- `ch_incoming_pct`: % incoming transactions by channel
- `ch_outgoing_pct`: % outgoing transactions by channel
- `sender_concentration`: Concentration of senders

### Risk Score Features
- `behavioral_score`: Account behavior risk (0-1)
- `network_score`: Network connectivity risk (0-1)
- `layering_score`: Money laundering layering risk (0-1)
- `velocity_score`: Transaction velocity risk (0-1)
- `geographic_risk`: Geographic location risk (0-1)

### Account Characteristics
- `account_age_days`: Days since account opening
- `days_since_kyc`: Days since KYC verification
- `is_frozen`: Account frozen status (0/1)
- `high_risk_counterparties`: Count of high-risk connections
- `international_transactions`: Number of cross-border transfers

## Sample Files

A sample account JSON file is available at:
```
/public/sample-account.json
```

You can:
1. Download and modify it with your own data
2. Use it as a template for batch processing
3. Upload multiple accounts for comparison

## API Integration

### Backend Endpoint

The SHAP analysis connects to:
```
POST /api/v1/ml/explain
```

**Request:**
```json
{
  "account_id": "ACC_2024_001",
  "features": { /* feature object */ }
}
```

**Response:**
```json
{
  "account_id": "ACC_2024_001",
  "prediction_score": 72.5,
  "risk_level": "HIGH",
  "base_value": 45.2,
  "feature_contributions": [...],
  "top_positive_features": [...],
  "top_negative_features": [...],
  "model_used": "Ensemble (LightGBM + GNN)",
  "explanation_timestamp": "2024-01-15T10:30:00Z"
}
```

### Batch Endpoint

For analyzing multiple accounts:
```
POST /api/v1/ml/explain-batch
```

## Advanced Features

### Risk Thresholds
- **LOW**: Score < 25
- **MEDIUM**: Score 25-50
- **HIGH**: Score 50-75
- **CRITICAL**: Score ≥ 75

### Model Information
- **LightGBM**: Gradient boosting model for quick predictions
- **GNN**: Graph neural network for network-based analysis
- **Ensemble**: Combined predictions for robustness

## Best Practices

1. **Data Quality**: Ensure all features are numeric and normalized
2. **Regular Updates**: Refresh predictions monthly for monitoring accounts
3. **Interpretation**: Always combine SHAP with domain expertise
4. **Threshold Tuning**: Adjust risk thresholds based on your institution's risk appetite
5. **Documentation**: Keep records of all SHAP analyses for audit trails

## Troubleshooting

### Issue: "Invalid JSON file"
- **Solution**: Validate JSON format using online validators
- Ensure all required fields are present
- Check for proper data types (numbers vs strings)

### Issue: "File upload failed"
- **Solution**: Check file size (< 5MB recommended)
- Try a different file format (ensure it's .json)
- Clear browser cache and try again

### Issue: "Generation timeout"
- **Solution**: Check backend connectivity
- Try with a smaller account dataset
- Verify all features are valid numbers

## Performance Optimization

### For Single Accounts
- Fast generation: ~1-2 seconds
- Real-time analysis possible
- Ideal for interactive investigation

### For Batch Processing
- Use batch endpoint for multiple accounts
- Processing time scales with batch size
- Recommended batch size: 100-500 accounts

## Compliance & Documentation

All SHAP analyses are logged for:
- Regulatory compliance (GDPR, CCPA)
- Audit trails
- Model governance
- Explainability documentation

## Contact & Support

For issues or feature requests:
1. Check the troubleshooting section
2. Review backend logs for detailed errors
3. Contact your system administrator
4. Submit issues to the development team

---

**Version**: 1.0  
**Last Updated**: January 2024  
**Model Version**: Ensemble v1.0.5
