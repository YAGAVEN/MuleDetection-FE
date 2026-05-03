# Quick Reference: Financial Crime Detection Dataset

## Master Table (40,038 accounts)
**File:** `master.csv`  
**Size:** ~230 MB  
**Rows:** 40,038  
**Columns:** 50

### Column Categories

#### IDs & Status
- `customer_id` - Unique customer identifier (str)
- `account_id` - Unique account identifier (str)
- `account_status` - 'active' or 'frozen'

#### Account Details
- `product_code` - Product type
- `currency_code` - Currency (all '1' = single currency)
- `account_opening_date` - Account creation date
- `branch_code` - Home branch
- `branch_pin` - Branch PIN code
- `rural_branch` - Boolean flag

#### Balance & Financial Metrics
- `avg_balance` - Average account balance
- `monthly_avg_balance` - Monthly rolling average
- `quarterly_avg_balance` - Quarterly rolling average
- `daily_avg_balance` - Daily rolling average

#### KYC & Document Verification
- `kyc_compliant` - KYC status flag
- `last_kyc_date` - Last KYC update
- `pan_available` - PAN document flag
- `aadhaar_available` - Aadhaar document flag
- `passport_available` - Passport document flag

#### Account Features & Facilities
- `nomination_flag` - Has nomination registered
- `cheque_allowed` - Cheque facility enabled
- `cheque_availed` - Cheque facility used
- `num_chequebooks` - Number of cheque books issued

#### Digital Services
- `mobile_banking_flag` - Mobile banking enabled
- `internet_banking_flag` - Internet banking enabled
- `atm_card_flag` - ATM card issued
- `mobile_banking_flag` - Mobile banking active

#### Products Held
- `demat_flag` - Has demat account
- `credit_card_flag` - Has credit card
- `fastag_flag` - Has FASTAG

#### Loan & Credit Metrics
- `loan_sum` - Total outstanding loans
- `loan_count` - Number of loans
- `cc_sum` - Credit card outstanding
- `cc_count` - Number of credit cards
- `od_sum` - Overdraft outstanding
- `od_count` - Number of overdrafts
- `ka_sum`, `ka_count` - Kisan Account metrics
- `sa_sum`, `sa_count` - Savings Account metrics

#### Freeze Information
- `freeze_date` - Account freeze date (if frozen)
- `unfreeze_date` - Account unfreeze date (if unfrozen)

#### Customer Demographics
- `date_of_birth` - Customer birth date
- `relationship_start_date` - Customer relationship start
- `customer_pin` - Customer residential PIN
- `permanent_pin` - Permanent address PIN

#### Training Labels (for 24,023 training accounts)
- `is_mule` - Target: 1 if mule, 0 if not (NaN for test set)
- `mule_flag_date` - Date account flagged as mule
- `alert_reason` - Reason for alert
- `flagged_by_branch` - Flagging branch code

---

## Transaction Table (7.4M+ transactions)
**File:** `transactions_full.csv`  
**Size:** ~1.2 GB  
**Rows:** 7,424,845  
**Columns:** 8

### Columns
- `account_id` - Account (str) - Links to master.csv
- `transaction_id` - Unique transaction ID (str)
- `transaction_timestamp` - Date & time of transaction
- `transaction_type` - Type of transaction
- `counterparty_id` - Party on other end (str)
- `amount` - Transaction amount
- `currency_code` - Currency code
- `transaction_status` - Status ('success', etc.)

### Key Statistics
- **Date Range:** Jul 1, 2020 - Jul 11, 2025 (1,836 days / 5.03 years)
- **Unique Accounts:** 39,605
- **Negative Amounts:** 36,527 (0.49% - reversals)
- **All IDs Unique:** ✅

---

## Data Summary

### Accounts Breakdown
```
Total Accounts:          40,038
├─ Training (labeled):   24,023 (60%)
└─ Test (no labels):    16,015 (40%)

With Transactions:      39,605 (98.92%)
Without Transactions:      433 (1.08%)

Account Status:
├─ Active:              39,146 (97.78%)
└─ Frozen:                 892 (2.22%)
```

### Mule Distribution (Training Set)
```
Mule Accounts:           263 (1.09%) ⚠️ IMBALANCED
Non-Mule:            23,760 (98.91%)
Class Imbalance Ratio:  1:90
```

### Data Quality Flags
- ✅ No duplicate accounts
- ✅ No duplicate transactions
- ✅ All dates parsed correctly
- ✅ Single currency (no conversion needed)
- ✅ 98.92% transaction coverage
- ⚠️ Highly imbalanced positive class (1.09%)
- ⚠️ ~99% of test accounts have no label (expected)
- ⚠️ Many sparse features (loans, docs, etc.)

---

## NULL Patterns

### Expected High-Null Columns (>50%)
- `freeze_date` (96.71%) - Most accounts never frozen
- `unfreeze_date` (98.94%) - Most accounts never unfrozen
- `mule_flag_date` (99.34%) - Only for mules
- `alert_reason` (99.40%) - Only for flagged accounts
- `is_mule` (40.00%) - Test set has no labels

### Sparse Features (<30%)
- `loan_sum` (78.73% null)
- `cc_sum` (84.24% null)
- `last_mobile_update_date` (84.92% null)
- `aadhaar_available` (24.28% null)

### Well-Populated Columns (<10% null)
- All core account attributes
- All account status columns
- All product holding indicators

---

## Key Features for Mule Detection

### High-Value Features (Expected)
- `account_status` - Frozen accounts more likely mules
- `transaction patterns` - High velocity, volume
- `counterparty_diversity` - Mules have many counterparties
- `amount patterns` - Round amounts, regular patterns
- `account_age` - Newer accounts higher risk
- `kyc_compliant` - Incomplete KYC correlated
- `transaction_type` - Certain types higher risk

### Low-Value Features (Sparse)
- Individual loan/credit card flags (too sparse)
- Specific document types (missing for many)
- Freeze dates (only for tiny subset)

---

## Usage Guide

### Load Master Table
```python
import pandas as pd

master = pd.read_csv('master.csv', dtype={'account_id': str, 'customer_id': str})
print(master.shape)  # (40038, 50)
```

### Load Transactions
```python
transactions = pd.read_csv('transactions_full.csv', 
                           dtype={'account_id': str, 'transaction_id': str},
                           parse_dates=['transaction_timestamp'])
print(transactions.shape)  # (7424845, 8)
```

### Access Training/Test Sets
```python
train = master[master['is_mule'].notna()]  # 24,023 accounts
test = master[master['is_mule'].isna()]     # 16,015 accounts

print(f"Mules: {train['is_mule'].sum()}, Non-Mules: {(train['is_mule']==0).sum()}")
```

### Aggregate Transactions per Account
```python
trans_summary = transactions.groupby('account_id').agg({
    'transaction_id': 'count',           # transaction count
    'amount': ['sum', 'mean', 'std'],    # amount stats
    'counterparty_id': 'nunique'         # unique counterparties
}).reset_index()
trans_summary.columns = ['account_id', 'trans_count', 'amount_sum', 'amount_mean', 'amount_std', 'unique_counterparties']

# Merge with master
master_enriched = master.merge(trans_summary, on='account_id', how='left')
```

---

## File Locations
- Master: `/media/yagaven_25/coding/Data/Mule-data/master.csv`
- Transactions: `/media/yagaven_25/coding/Data/Mule-data/transactions_full.csv`
- Script: `/media/yagaven_25/coding/Data/scripts/01_load_and_validate.py`

---

## Next Steps
1. **EDA** - Analyze distributions, correlations, patterns
2. **Feature Engineering** - Create transaction-level features, aggregate stats
3. **Feature Selection** - Identify predictive features
4. **Model Development** - Train with class imbalance handling
5. **Validation** - Use time-based split for realistic evaluation
6. **Submission** - Predict on test set

---

*Last Updated: May 3, 2026*
