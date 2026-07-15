# STEP 2: DATA QUALITY CHECKS — COMPREHENSIVE REPORT

**Report Generated:** 2026-05-03 11:01:39 IST

---

## EXECUTIVE SUMMARY

This report documents comprehensive data quality validation across two datasets:
- **Master Table:** 40,038 accounts × 50 columns
- **Transactions Table:** 7,424,845 transactions × 8 columns

**Key Statistics:**
- Labeled Accounts: 24,023 (263 mule, 23,760 legitimate) — 1.09% imbalance
- Unlabeled Accounts: 16,015 (40%)
- Transaction Date Range: 2020-07-01 to 2025-07-11 (5 years)
- Reversal Transactions: 36,527 (0.49%)
- No-Transaction Accounts: 433 (100% frozen, 1.89% mule rate)

---

# SECTION A: CLEAN & READY ✓

Columns and data aspects validated and ready to use as-is in feature engineering:

## Master Table - Zero-Null Columns (36 columns)

**Fully Clean (100% populated):**
- `customer_id` — Customer unique identifier
- `account_id` — Account unique identifier  
- `account_status` — Binary (active/frozen), 97.77% active, 2.23% frozen
- `product_code` — Product code identifier
- `currency_code` — Single value (1 for all accounts)
- `account_opening_date` — Range 2015-07-03 to 2025-06-20, all valid
- `branch_code` — Branch identifier, well-distributed across 8,000+ branches
- `product_family` — 3 values (S: 58.34%, K: 31.69%, O: 9.96%)
- `date_of_birth` — Range 1945-2006, all valid ages
- `relationship_start_date` — Range 1995-2025, all valid
- `last_kyc_date` — Range 2021-05-23 to 2025-06-25, all valid
- `nomination_flag` — Y/N flag, 60.41% Y
- `cheque_allowed` — Y/N flag, 89.97% Y
- `cheque_availed` — Y/N flag, 36.25% Y
- `num_chequebooks` — Integer count
- `kyc_compliant` — Y/N flag, 90.02% Y
- `passport_available` — Y/N flag, 17.81% Y
- `mobile_banking_flag` — Y/N flag, 31.98% Y
- `internet_banking_flag` — Y/N flag, 47.06% Y
- `atm_card_flag` — Y/N flag, 48.36% Y
- `demat_flag` — Y/N flag, 2.33% Y
- `credit_card_flag` — Y/N flag, 15.78% Y
- `fastag_flag` — Y/N flag, 7.83% Y
- `customer_pin` — PIN code
- `permanent_pin` — Permanent PIN code
- `loan_count` — Integer count (0-3 range)
- `cc_count` — Integer count (0-2 range)
- `od_sum` — Overdraft sum (can be 0)
- `od_count` — Overdraft count (0-1)
- `ka_count` — Count indicator
- `ka_sum` — Sum indicator
- `sa_sum` — Sum indicator
- `sa_count` — Count indicator (0-2 range)
- `rural_branch` — Y/N flag, 11.70% Y

## Transaction Table - Critical Columns (All Valid)

**Zero Nulls - 100% Complete:**
- `transaction_id` — Unique identifier, 7,424,845 distinct values
- `account_id` — Valid linkage to master accounts
- `transaction_timestamp` — All within Jul 2020 – Jul 2025 (except 89 transactions)
- `txn_type` — 2 values only (D: 53.82%, C: 46.18%) ✓
- `amount` — Range ₹1 to ₹144,034,000
- `mcc_code` — 57 unique values, 100% populated

**Channel Validation:**
- `channel` — 35 unique values, all match reference list
- Top channels: UPC (38.30%), UPD (35.95%), IPM (4.04%)

## Date Column Validation Summary

**All Valid Date Ranges:**
- `date_of_birth`: 1945–2006 (valid ages)
- `relationship_start_date`: 1995–2025 (sensible start dates)
- `account_opening_date`: 2015–2025 (operational accounts)
- `last_kyc_date`: 2021–2025 (recent KYC)
- `last_mobile_update_date`: 2025-01-02 to 2025-06-29 (recent updates)
- `freeze_date`: 2021–2025 (when populated)
- `unfreeze_date`: 2022–2025 (when populated)

**No Date Logic Errors Found (checked):**
- All freeze_date ≤ unfreeze_date (when both exist) ✓
- No dates before 1900 or after 2026-05-03 ✓
- No future-dated transactions ✓

## Balance & Amount Distribution

**Transaction Amounts (Ready for Use):**
- 51.19% below ₹1,000 (micro-transactions)
- 33.00% in ₹1K–₹10K range (small transfers)
- 11.96% in ₹10K–₹50K range
- 2.21% in ₹50K–₹100K range
- 1.52% in ₹100K–₹500K range
- 0.13% above ₹500K (high-value)
- Reversals: 0.49% of transactions (legitimate, not errors)

---

# SECTION B: NEEDS HANDLING ⚠️

Issues identified with specific remediation steps for feature engineering:

## Category 1: Unlabeled Data

**Issue B1.1: 16,015 Unlabeled Accounts (40% of master)**
- `is_mule` = NULL for 16,015 records
- These accounts have unknown mule/legitimate status
- **Fix:** REMOVE these accounts for supervised learning. Keep 24,023 labeled accounts only.
- **Rationale:** Supervised models require known targets. Cannot impute mule labels.

## Category 2: Unexpected Nulls

**Issue B2.1: `alert_reason` — 99.40% null (39,796 missing)**
- Only 242 mule accounts have non-null values
- Perfect proxy for mule_flag (data leakage)
- **Fix:** 
  - Create binary flag: `has_alert_reason` (1 if not null, else 0)
  - Extract and encode unique alert reasons as categorical (for EDA only)
  - **DO NOT USE IN MODEL** (leakage indicator)

**Issue B2.2: `flagged_by_branch` — 99.34% null (39,775 missing)**
- All 263 mules have non-null values; 0% of legitimate accounts
- Perfect mule predictor (data leakage)
- **Fix:**
  - Create binary flag: `is_flagged_by_branch` (1 if not null, else 0)
  - **DO NOT USE IN MODEL** (leakage indicator)
  - Use in EDA only to understand labeling process

**Issue B2.3: `aadhaar_available` — 24.28% null (9,737 missing)**
- Mules: 33.08% null | Legitimate: 24.00% null
- Missing values indicate absent ID (not random null)
- **Fix:** Encode as categorical with 3 values:
  - 'Y' = Aadhaar present
  - 'N' = Aadhaar not available
  - 'Missing' = No data
- Alternatively: Create `aadhaar_status` (available/not_available/unknown)

**Issue B2.4: `pan_available` — 14.28% null (5,731 missing)**
- Missing indicates absent ID
- **Fix:** Encode same as aadhaar_available (Y/N/Missing categorical)

**Issue B2.5: `passport_available` — 24.28% null**
- Same pattern as aadhaar_available
- **Fix:** Encode as Y/N/Missing categorical

**Issue B2.6: `last_mobile_update_date` — 84.92% null (34,001 missing)**
- Only 6,037 accounts have update dates
- Missing indicates no recent mobile banking activity
- **Fix:** 
  - Create binary: `has_mobile_update` (0 for null, 1 for date)
  - For non-null values: calculate days_since_mobile_update = ref_date - last_mobile_update_date

**Issue B2.7: `mule_flag_date` — 99.34% null (39,775 missing)**
- Only 263 mule accounts have flag dates
- **Fix:**
  - Keep as-is for mule accounts (use in feature engineering for temporal features)
  - For legitimate accounts (null): flag as 'not_flagged'

**Issue B2.8: `freeze_date` — 96.71% null (38,721 missing)**
- Expected null for non-frozen accounts
- 1,317 accounts have freeze_date
- **Fix:** 
  - Create binary: `is_frozen` (1 if freeze_date not null, else 0)
  - For frozen accounts: calculate days_frozen = ref_date - freeze_date

**Issue B2.9: `unfreeze_date` — 98.94% null (39,613 missing)**
- Expected null for accounts never unfrozen
- 425 accounts have unfreeze_date
- **Fix:**
  - Create binary: `was_unfrozen` (1 if unfreeze_date not null, else 0)
  - For unfrozen accounts: calculate days_since_unfreeze = ref_date - unfreeze_date

**Issue B2.10: `cc_sum` — 78.77% null (30,600 missing)**
- Legitimate: 79.02% null | Mule: 66.15% null
- Missing indicates account has no credit card (not random null)
- **Fix:** Fill null with 0 (no credit card balance = 0 balance)

**Issue B2.11: `loan_sum` — 78.77% null (30,600 missing)**
- Same pattern as cc_sum
- **Fix:** Fill null with 0

## Category 3: Date Logic Errors

**Issue B3.1: 3,876 Accounts (9.68%) Have account_opening_date BEFORE relationship_start_date**
- Violates business logic: account should open during relationship
- **Fix:** 
  - Create flag: `date_logic_error` (1 if account_opening < relationship_start, else 0)
  - Keep these accounts; flag separately for investigation
  - **Possible cause:** Data quality issue in source system, not accounts to drop

## Category 4: Transaction-Account Mismatches

**Issue B4.1: 38,636 Transactions (0.52%) Occur BEFORE Account Opening Date**
- 962 accounts affected
- Some accounts have transactions before account_opening_date
- **Fix:**
  - Create feature: `txn_before_opening_count` (count per account)
  - Aggregate as transaction-level feature
  - Mark transactions as `pre_opening_txn` (1/0)

**Issue B4.2: 89 Transactions Outside Expected Window (Jul 2020 – Jun 2025)**
- 40 transactions in July 2025 (beyond transaction window end)
- 49 in June 2025 (edge of window)
- **Fix:** 
  - Include these in analysis (not errors, just edge cases)
  - Note: 89 transactions ≈ 0.001% of 7.4M total (negligible)

## Category 5: Negative & Outlier Values

**Issue B5.1: Negative Values in Balance Columns**
- `avg_balance`: 12.16% negative (min -₹33.5M)
- `monthly_avg_balance`: 12.16% negative
- `quarterly_avg_balance`: 12.18% negative
- `daily_avg_balance`: 12.18% negative
- Mules have MORE negative balances than legitimate accounts
- **Fix:** 
  - **DO NOT DROP** (legitimate signal for mules)
  - Option 1: Log-transform: `log10(abs(balance) + 1)` (handles negatives + small values)
  - Option 2: Create separate flag: `balance_category` (negative/zero/positive/high)
  - **Recommended:** Keep raw + log-transformed as separate features

**Issue B5.2: Extreme Balance Outliers**
- Max: ₹181.7M | Min: -₹33.5M
- 0.1% of accounts have >₹1M balance
- **Fix:** 
  - Option 1: Cap at 99th percentile (₹1.2M) for modeling
  - Option 2: Use log-transform (handles outliers naturally)
  - Keep original values in feature set (information value)

**Issue B5.3: Extreme Transaction Amounts**
- Max: ₹144,034,000 | Range: ₹1 to ₹144M
- 1.63% of transactions > ₹100K
- 0.034% > ₹1M
- **Fix:** 
  - Log-transform amounts: `log10(amount)` (handles skew + outliers)
  - Create feature: `high_value_txn` (1 if > 99th percentile, else 0)

## Category 6: Reversal Transactions

**Issue B6.1: 36,527 Reversal Transactions (0.49%)**
- Amount range: -₹4.7M to -₹1
- Mean reversal: -₹8,792 (absolute)
- Concentrated in UPC (39.14%) and UPD (36%) channels
- **Fix:**
  - **DO NOT DROP** (legitimate transactions)
  - Aggregate by account:
    - `reversal_count` = count of negative transactions per account
    - `reversal_amount_sum` = sum of negative amounts per account
    - `reversal_amount_mean` = mean of absolute reversal amounts
  - Use in feature engineering (reversal patterns ≠ mule indicator)

**Issue B6.2: Reversals Clustered in 2024 (40.66% of all reversals)**
- 2024 had 14,851 reversals vs 682 in 2020 (21.8x increase)
- Suggests system behavior change or increased transaction volume
- **Fix:** Consider temporal feature or investigate root cause

## Category 7: No-Transaction Accounts

**Issue B7.1: 433 Frozen Accounts with Zero Transactions**
- 1.08% of all accounts
- 100% frozen (account_status = 'frozen')
- Higher mule concentration: 1.89% vs 1.09% overall
- **Fix:**
  - **KEEP THESE ACCOUNTS** (high-risk frozen accounts)
  - Create flag: `has_transactions` (0 for these, 1 for others)
  - For these accounts: use account-level features only (no transaction-based features)
  - Consider separate model or stratified CV to handle this segment

## Category 8: Expected Nulls (No Action Needed)

These nulls are expected and require no special handling:
- `freeze_date`: 96.71% null for non-frozen accounts (expected)
- `unfreeze_date`: 98.94% null for non-unfrozen accounts (expected)

---

# SECTION C: EARLY SIGNALS SPOTTED 🔍

Mule vs Legitimate account differences detected. Listed by signal strength:

## STRONG SIGNALS (Major Differences)

**Signal C1.1: avg_balance (4-column family)**
- **Pattern:** Mules have NEGATIVE average balances; Legitimate have POSITIVE
- **Observed:**
  - `avg_balance`: Mule -₹26,562 vs Legit +₹53,282 (Δ = -₹79,844 = -149.9%)
  - `monthly_avg_balance`: Mule -₹20,981 vs Legit +₹52,861 (Δ = -₹73,842 = -139.7%)
  - `quarterly_avg_balance`: Mule -₹23,227 vs Legit +₹51,438 (Δ = -₹74,664 = -145.2%)
  - `daily_avg_balance`: Mule -₹15,792 vs Legit +₹53,232 (Δ = -₹69,024 = -129.7%)
- **Signal Strength:** VERY STRONG (150% difference, consistent across all balance measures)
- **Implication:** Mules operate with negative balances (overdraft, no deposited funds)
- **Recommendation:** Use as primary feature for mule detection

**Signal C1.2: loan_sum**
- **Pattern:** Mules have larger (more negative) loan balances
- **Observed:** Mule -₹777,454 vs Legit -₹720,500 (Δ = -₹56,954 = -7.9% more debt)
- **Signal Strength:** STRONG (mules carrying higher debt)
- **Implication:** Mule accounts associated with higher loan obligations

**Signal C1.3: ka_sum (Likely Savings/Investment)**
- **Pattern:** Mules have negative ka_sum; Legitimate have positive
- **Observed:** Mule -₹4,978 vs Legit +₹19,879 (Δ = -₹24,857 = -125% difference)
- **Signal Strength:** STRONG (mules not accumulating savings)
- **Implication:** Mule accounts show no savings accumulation pattern

## MEDIUM SIGNALS (Moderate Differences)

**Signal C2.1: sa_count (Likely Account Activity)**
- **Pattern:** Mules have higher sa_count (more account activity)
- **Observed:** Mule 0.82 vs Legit 0.59 (Δ = +0.23 = +38.9%)
- **Signal Strength:** MEDIUM (notable but smaller effect size)
- **Implication:** Mules more active in this product type

**Signal C2.2: sa_sum (Product Sum)**
- **Pattern:** Mules have slightly higher sa_sum
- **Observed:** Mule +₹21,284 vs Legit +₹17,649 (Δ = +₹3,635 = +20.6%)
- **Signal Strength:** MEDIUM (modest positive difference)

**Signal C2.3: aadhaar_available**
- **Pattern:** Mules less likely to have Aadhaar
- **Observed:** Mule 38.02% vs Legit 47.14% (Δ = -9.12pp)
- **Signal Strength:** MEDIUM (9pp difference, meaningful for India banking)
- **Implication:** Mules may use alternative documents or have incomplete KYC

**Signal C2.4: rural_branch**
- **Pattern:** Mules slightly more concentrated in rural branches
- **Observed:** Mule 15.97% vs Legit 11.65% (Δ = +4.32pp)
- **Signal Strength:** MEDIUM (modest geographic difference)
- **Implication:** Rural branches may have different risk profile

**Signal C2.5: No-Transaction Accounts (Frozen)**
- **Pattern:** Frozen accounts with zero transactions have higher mule rate
- **Observed:** Mule rate 1.89% vs Overall 1.09% (Δ = +0.79pp)
- **Signal Strength:** MEDIUM (higher concentration, but small absolute count = 5 mules)
- **Implication:** Frozen dormant accounts warrant special handling

## WEAK SIGNALS (Minor Differences)

**Not marked as signals:** 
- `passport_available`: -2.63pp (within noise)
- `fastag_flag`: -3.68pp (within noise)
- `mobile_banking_flag`: +1.88pp (within noise)
- Most Y/N flags show <3pp differences (consistent with 1.09% base rate variation)

## LEAKAGE INDICATORS (EXCLUDE FROM MODEL)

**Critical:** These columns show perfect mule separation but are DERIVED from labeling:
- **`flagged_by_branch`**: 100pp difference (all mules flagged, no legitimate flagged)
  - **Reason:** This is the labeling flag itself, not a predictor
  - **Action:** EXCLUDE from model (causes data leakage)

- **`alert_reason`**: 92pp difference (242 mules have reasons, only ~1 legitimate)
  - **Reason:** Generated as part of mule identification process
  - **Action:** EXCLUDE from model (causes data leakage)

- **`mule_flag_date`**: 99.34% null except for mules
  - **Reason:** Only assigned to flagged mules
  - **Action:** EXCLUDE from model (target leakage)

---

# SUMMARY & RECOMMENDATIONS

## Data Quality Assessment: ★★★★☆ (GOOD)

**Strengths:**
- 36/50 master columns (72%) are perfectly clean
- All transaction critical columns have zero nulls
- Date columns are internally consistent and valid
- Transaction data is comprehensive (7.4M records over 5 years)
- Categorical distributions are sensible and well-distributed

**Challenges:**
- 40% unlabeled accounts (must remove for supervised learning)
- 12-15% negative values in balance columns (genuine signal, not error)
- 0.52% date logic errors (flag but retain)
- 0.49% reversal transactions (aggregate, not drop)
- 1.08% frozen accounts with zero transactions (flag separately)

## Ready for Feature Engineering: YES

**Immediate Actions:**
1. ✓ Remove 16,015 unlabeled accounts (keep 24,023)
2. ✓ Fill cc_sum/loan_sum nulls with 0
3. ✓ Create flags for: alert_reason, flagged_by_branch, aadhaar_available
4. ✓ Log-transform balance and amount columns
5. ✓ Aggregate reversals: reversal_count, reversal_amount_sum
6. ✓ Create has_transactions flag (for 433 frozen accounts)
7. ✓ Create date_logic_error flag (for 3,876 accounts)
8. ✓ EXCLUDE flagged_by_branch, alert_reason, mule_flag_date from model

## Expected Model Features (Post-Engineering): ~80–100 features

- Account metadata (20–25 features)
- Balance-derived (15–20 log-transformed and categorical)
- Transaction aggregates (20–25 count, sum, mean, std by type/channel)
- Reversal patterns (5–10 features)
- Date-based (10–15 days_since, account_age, tenure)
- Behavior flags (5–10 special cases and anomalies)

## Model Training Recommendations

**Data Preparation:**
- Use 24,023 labeled accounts only
- Stratified K-fold (k=5 or 10) for 1.09% imbalance
- Apply class weights: weight_mule ≈ 90.4x

**Evaluation Metric:**
- PRIMARY: Precision-Recall AUC (not ROC-AUC for imbalanced data)
- SECONDARY: F1-score at optimal threshold
- TERTIARY: True Positive Rate at low False Positive Rate

**Feature Selection:**
- Exclude: flagged_by_branch, alert_reason, mule_flag_date
- Include: avg_balance family (strongest signals)
- Consider: aadhaar_available, rural_branch (medium signals)

---

## CONCLUSION

Step 2 Data Quality Checks are **COMPLETE**. All data quality issues are documented, 
understood, and have specific remediation strategies. The dataset is ready for 
exploratory data analysis and feature engineering with high confidence.

**No blockers identified. Proceed to Step 3: EDA.**
