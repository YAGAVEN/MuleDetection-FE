# Financial Crime Detection Hackathon - Project Index

## Quick Navigation

### 📊 Data Files
- **master.csv** - 40,038 accounts with 50 attributes (linked labels, demographics, balances, products)
- **transactions_full.csv** - 7.4M transactions with account/timestamp/amount/counterparty data

Location: `/media/yagaven_25/coding/Data/Mule-data/`

### 🔧 Scripts
- **01_load_and_validate.py** - Main data loading, merging, and validation pipeline (production-ready)

Location: `/media/yagaven_25/coding/Data/scripts/`

### 📚 Documentation

#### For New Users
1. Start with: **scripts/README.md** - Overview, quick start, usage examples
2. Then read: **scripts/DATASET_REFERENCE.md** - Column definitions and data structure

#### For Detailed Analysis
- **scripts/DATA_LOADING_SUMMARY.md** - Comprehensive validation report with all 10 checks
- **STEP1_COMPLETION_REPORT.txt** - Executive summary and project completion report

### 📈 Dataset Overview

**40,038 Accounts** (as of May 3, 2026)
- Training: 24,023 (60%) with mule labels
- Test: 16,015 (40%) without labels
- Mule rate: 1.09% (highly imbalanced)

**7,424,845 Transactions** (July 2020 - July 2025)
- 5+ year historical window
- 98.92% of accounts have transactions
- All IDs unique, high data quality

**50 Account Attributes**
- Demographics, KYC, balances, products, freeze info, labels
- Comprehensive financial profile per account

### ✅ Status
- **Data Loading**: Complete
- **Data Validation**: 10/10 checks passed
- **Data Quality**: Excellent (no critical issues)
- **Production Ready**: YES

### 🚀 Next Steps
1. EDA - Analyze distributions and patterns
2. Feature Engineering - Create transaction-level features
3. Handle Class Imbalance - SMOTE or class weights
4. Model Development - XGBoost, LightGBM
5. Validation & Submission - Time-based splits

---

**Generated**: May 3, 2026  
**Version**: 1.0  
**Status**: ✅ Production Ready
