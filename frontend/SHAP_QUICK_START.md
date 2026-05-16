# AUTOSAR SHAP Analysis - Quick Start

## 5-Minute Setup

### 1. Navigate to AUTOSAR
- Open the application dashboard
- Click on the AUTOSAR module in navigation
- You'll see two tabs: SAR Reports and SHAP Analysis

### 2. Click on SHAP Analysis Tab
The tab shows a professional blue-themed interface with:
- **Account Analysis** section with file upload
- **Generate SHAP Report** button
- Results display area

### 3. Prepare Your Data
Create a simple JSON file (`account.json`):

```json
{
  "account_id": "ACC_001",
  "features": {
    "is_frozen": 0,
    "unique_counterparties": 12,
    "monthly_cv": 40000,
    "structuring_40k_50k_pct": 10,
    "pct_within_6h": 5,
    "ch_incoming_pct": 50,
    "ch_outgoing_pct": 45,
    "sender_concentration": 0.4,
    "mobile_spike_ratio": 1.5,
    "days_since_kyc": 200,
    "account_age_days": 600,
    "behavioral_score": 0.6,
    "network_score": 0.5,
    "layering_score": 0.4,
    "velocity_score": 0.7,
    "geographic_risk": 0.3
  }
}
```

### 4. Upload File
1. Click on the upload area (or drag & drop)
2. Select your JSON file
3. See confirmation: ✓ account.json

### 5. Generate Report
Click **🔍 Generate SHAP Report**

### 6. Review Results
You'll see:
- **Top Row**: Prediction Score | Risk Level | Base Value | Model Used
- **Risk Increasing Features** (Green): What raises fraud risk
- **Risk Decreasing Features** (Blue): What lowers fraud risk
- **All Features**: Complete breakdown

## Understanding Results

### Color Codes
- 🟢 **Green** = Risk INCREASING (bad features)
- 🔵 **Blue** = Risk DECREASING (good features)
- 🟡 **Yellow** = Warning indicators
- 🔴 **Red** = Critical risk

### Key Metrics
- **Prediction Score**: 0-100 (higher = more risky)
- **SHAP Value**: Feature's contribution to the score
- **Contribution %**: Importance ranking

## Real Example

**Account**: ACC_2024_001  
**Prediction Score**: 72.5  
**Risk Level**: HIGH

Top Risk Factors:
1. High structuring pattern (28.4%)
2. Rapid transfers (22.1%)
3. High transaction velocity (19.5%)

Protective Factors:
- Long account age (-15.3%)
- Good compliance history (-11.2%)

**Conclusion**: Account shows high fraud risk due to suspicious patterns, despite having long history and compliance.

## Common Scenarios

### Scenario 1: New Account Alert
```
- account_age_days: 30
- unique_counterparties: 50+
- Result: HIGH risk (too many connections too quickly)
```

### Scenario 2: Normal Business Account
```
- account_age_days: 500+
- unique_counterparties: 5-10
- behavioral_score: 0.9
- Result: LOW risk (established, consistent behavior)
```

### Scenario 3: Potential Money Mule
```
- structuring_40k_50k_pct: 80%
- pct_within_6h: 70%
- velocity_score: 0.95
- Result: CRITICAL (all red flags present)
```

## Tips & Tricks

✅ **DO:**
- Upload realistic data
- Compare multiple accounts
- Check feature contributions
- Document findings

❌ **DON'T:**
- Use incomplete data
- Ignore negative features
- Make decisions on score alone
- Upload duplicate accounts frequently

## What Happens in Background

1. Frontend validates JSON
2. Sends to backend API
3. Backend extracts features
4. ML model (LightGBM + GNN) predicts
5. SHAP calculates explanations
6. Results formatted and displayed
7. Frontend renders visualizations

## API Flow

```
User Upload (JSON)
    ↓
Validation
    ↓
API: POST /api/v1/ml/explain
    ↓
ML Model Processing
    ↓
SHAP Computation
    ↓
Response with Features
    ↓
Visualization
```

## File Format Reference

### Minimum Required Fields
```json
{
  "account_id": "string",
  "features": {
    "is_frozen": 0/1,
    "unique_counterparties": number,
    "account_age_days": number
  }
}
```

### Optional Metadata
```json
{
  "customer_name": "string",
  "account_type": "Savings/Current/etc",
  "account_metadata": {
    "created_date": "YYYY-MM-DD",
    "kyc_status": "VERIFIED/PENDING",
    "compliance_status": "ACTIVE/FLAGGED"
  }
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| File won't upload | Check JSON format, validate online |
| Generation fails | Verify all features are numbers |
| No results shown | Check backend is running |
| Slow generation | Reduce batch size or check connection |

## Export & Sharing

Results can be:
- Screenshotted for reports
- Exported as JSON data
- Included in compliance documents
- Used for audit trails

## Next Steps

1. ✅ Try with sample data first
2. ✅ Upload your account data
3. ✅ Compare multiple accounts
4. ✅ Build monitoring dashboards
5. ✅ Integrate with workflows

---

**Pro Tip**: Save the sample JSON file and modify it with real data to get started immediately!

For detailed documentation, see [SHAP_EXPLAINER_GUIDE.md](SHAP_EXPLAINER_GUIDE.md)
