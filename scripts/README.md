# Financial Crime Detection Hackathon - Data Pipeline

## Overview
This directory contains the data loading and validation pipeline for the financial crime detection hackathon. The pipeline loads 12 CSV files, merges them into a master account table, validates data quality, and produces analysis-ready datasets.

## Files

### Main Script
- **`01_load_and_validate.py`** - Primary data loading and validation script
  - Loads all 12 input files
  - Performs 5-way merge to create master table
  - Runs 10 validation checks
  - Saves 2 output files

### Documentation
- **`README.md`** - This file (overview and usage guide)
- **`DATA_LOADING_SUMMARY.md`** - Detailed validation report with all 10 checks
- **`DATASET_REFERENCE.md`** - Quick reference guide for the datasets

## Quick Start

### Run the Pipeline
```bash
cd /media/yagaven_25/coding/Data
python3 scripts/01_load_and_validate.py
```

### Execution Time
~180 seconds (3 minutes)

### Output Files
Two CSV files are created in `/media/yagaven_25/coding/Data/Mule-data/`:
1. **`master.csv`** - 40,038 accounts × 50 columns (~230 MB)
2. **`transactions_full.csv`** - 7,424,845 transactions × 8 columns (~1.2 GB)

## Input Data Structure

### Single Files
- `customers.csv` (39,988 rows) - Customer demographics
- `accounts.csv` (40,038 rows) - Account attributes & balances
- `customer_account_linkage.csv` (40,038 rows) - Customer-account mapping
- `product_details.csv` (39,988 rows) - Product holdings
- `train_labels.csv` (24,023 rows) - Mule labels for training
- `test_accounts.csv` (16,015 rows) - Test account IDs

### Transaction Files (6 parts)
- `transactions_part_0.csv` through `transactions_part_5.csv`
- Combined: 7,424,845 transactions

## Merge Strategy

```
customer_account_linkage (40,038)
    ↓ merge on account_id
accounts (40,038)
    ↓ merge on customer_id
customers (39,988)
    ↓ merge on customer_id
product_details (39,988)
    ↓ LEFT merge on account_id
train_labels (24,023)
    ↓
MASTER (40,038 rows, 50 columns)
```

## Data Quality Checks

All 10 validation checks have been implemented:

1. **NULL COUNT** - Column-by-column null analysis
2. **DUPLICATE ACCOUNT IDs** - Ensures uniqueness
3. **LABEL COVERAGE** - Train/test split verification
4. **MULE RATE** - Class distribution analysis
5. **TRANSACTION COVERAGE** - Account-transaction linkage
6. **DATE RANGE** - Transaction temporal span
7. **CURRENCY CHECK** - Currency code distribution
8. **NEGATIVE AMOUNTS** - Reversal detection
9. **DUPLICATE TRANSACTION IDs** - Transaction uniqueness
10. **ACCOUNT STATUS** - Status distribution

## Key Statistics

### Accounts
- Total: 40,038
- Training (labeled): 24,023 (60%)
- Test (unlabeled): 16,015 (40%)
- With transactions: 39,605 (98.92%)
- Mule rate: 1.09% (263 mules)

### Transactions
- Total: 7,424,845
- Date range: Jul 2020 - Jul 2025 (5.03 years)
- Unique accounts: 39,605
- Reversals: 36,527 (0.49%)

## Data Quality Status

✅ **PASSED** - All validation checks successful, no critical issues

- ✓ All files loaded without error
- ✓ All joins successful (no unmatched records)
- ✓ No duplicate accounts or transactions
- ✓ Date parsing successful
- ✓ Nulls follow expected patterns
- ✓ High transaction coverage (98.92%)
- ✓ Data spans 5+ years

⚠️ **NOTES** (Expected, not issues)
- Highly imbalanced positive class (1.09% mule rate)
- Many sparse features (loans, documents, freeze dates)
- 40% of dataset is test set (no labels)

## Usage Examples

### Load Master Table
```python
import pandas as pd
master = pd.read_csv('Mule-data/master.csv', dtype={'account_id': str})
print(master.shape)  # (40038, 50)
print(master.columns.tolist())
```

### Filter Training/Test Sets
```python
train = master[master['is_mule'].notna()]  # 24,023 rows
test = master[master['is_mule'].isna()]    # 16,015 rows
```

### Load Transactions
```python
transactions = pd.read_csv('Mule-data/transactions_full.csv', 
                           dtype={'account_id': str, 'transaction_id': str},
                           parse_dates=['transaction_timestamp'])
print(transactions.shape)  # (7424845, 8)
```

### Aggregate Transaction Features
```python
trans_agg = transactions.groupby('account_id').agg({
    'transaction_id': 'count',
    'amount': ['sum', 'mean', 'std', 'min', 'max'],
    'counterparty_id': 'nunique',
    'transaction_timestamp': ['min', 'max']
}).reset_index()

# Merge with master
master = master.merge(trans_agg, on='account_id', how='left')
```

## Column Reference

### Master Table Columns (50)

**Core IDs**
- account_id, customer_id

**Account & Branch**
- account_status, account_opening_date, product_code, currency_code, branch_code, branch_pin, rural_branch

**Balance Metrics**
- avg_balance, monthly_avg_balance, quarterly_avg_balance, daily_avg_balance

**KYC & Updates**
- kyc_compliant, last_kyc_date, last_mobile_update_date, pan_available, aadhaar_available, passport_available

**Account Features**
- nomination_flag, cheque_allowed, cheque_availed, num_chequebooks

**Digital Services**
- mobile_banking_flag, internet_banking_flag, atm_card_flag, demat_flag, credit_card_flag, fastag_flag

**Holdings**
- loan_sum, loan_count, cc_sum, cc_count, od_sum, od_count, ka_sum, ka_count, sa_sum, sa_count

**Location**
- customer_pin, permanent_pin

**Freeze Info**
- freeze_date, unfreeze_date

**Customer**
- date_of_birth, relationship_start_date

**Labels (Training Only)**
- is_mule, mule_flag_date, alert_reason, flagged_by_branch

### Transaction Table Columns (8)
- account_id, transaction_id, transaction_timestamp, transaction_type, counterparty_id, amount, currency_code, transaction_status

## Validation Report

For detailed validation results including all 10 checks, see:
- `DATA_LOADING_SUMMARY.md` - Full report with check details

## Next Steps

1. **Exploratory Data Analysis (EDA)**
   - Analyze distributions of key features
   - Identify correlations with mule label
   - Detect outliers and anomalies

2. **Feature Engineering**
   - Aggregate transaction patterns (count, velocity, amounts)
   - Network analysis (counterparty relationships)
   - Time-based features (seasonality, trends)
   - Risk scores from account attributes

3. **Model Development**
   - Address class imbalance (SMOTE, class weights)
   - Feature selection and engineering
   - Model training (XGBoost, LightGBM, etc.)
   - Hyperparameter optimization

4. **Validation Strategy**
   - Time-based train-test split
   - Temporal cross-validation
   - Realistic evaluation metrics

5. **Prediction & Submission**
   - Generate predictions on test set
   - Format for submission

## Requirements

```
pandas>=1.0.0
numpy>=1.18.0
```

## Installation
```bash
pip3 install pandas numpy
```

## Script Execution Log

**Last Run:** May 3, 2026
- Status: ✅ SUCCESSFUL
- Duration: ~180 seconds
- All checks: PASSED
- Files created: 2
- Data integrity: ✓ Verified

## Support

For issues or questions:
1. Check `DATA_LOADING_SUMMARY.md` for validation details
2. Check `DATASET_REFERENCE.md` for column definitions
3. Review script output in `01_load_and_validate.py`

---

**Dataset Version:** 1.0  
**Status:** Production Ready ✅  
**Last Updated:** May 3, 2026
