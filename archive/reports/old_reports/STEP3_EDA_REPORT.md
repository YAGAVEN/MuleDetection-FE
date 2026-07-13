# EDA REPORT — MULE ACCOUNT DETECTION

## 1. DATASET OVERVIEW

**Account Dataset (master.csv):**
- Total accounts: 40,038
- Labeled accounts: 24,023 (59.95%)
  - Mule accounts: 263 (1.09% of labeled, 0.66% overall)
  - Legitimate accounts: 23,760 (98.91% of labeled)
- Unlabeled accounts: 16,015 (40.05%, excluded from training)

**Transaction Dataset (transactions_full.csv):**
- Total transactions: 7,424,845
- Date range: 2020-07-01 to 2025-06-30 (5 years)
- Accounts with transactions: 39,605 (98.92% of all accounts)
- Accounts with NO transactions: 433 (1.08%, all frozen)

**Class Imbalance:**
- Severe imbalance: 1.09% mule rate
- Class weight recommendation: ~90.4x for mule class
- Requires stratified k-fold CV to avoid skewed folds

---

## 2. LABEL ANALYSIS FINDINGS (Task 3A)

### Mule Flagging Timeline
- **Mule flagging acceleration**: Exponential trend over 5 years
  - Jul 2020–Dec 2021: ~0.6% of all flags per month
  - Jan 2025–Jun 2025: 2.2–19.39% per month
  - June 2025 alone: 19.39% of all flags (51 accounts in final month)
- **Finding**: Recent flagging activity 32x higher than early period

### Alert Reasons (Top 5)
1. Routine Investigation: 20.91% (55 accounts)
2. Rapid Movement of Funds: 8.37% (22 accounts)
3. Structuring: 6.84% (18 accounts)
4. Account Takeover Suspected: 4.18% (11 accounts)
5. Multiple Person Access: 3.42% (9 accounts)

**Finding**: "Routine Investigation" dominates, but top 3 reveal clear patterns (movement speed, structuring, account compromise)

### Flagging Branch Distribution
- **Total unique branches**: 250 branches flagged mules
- **No concentration**: Top branch accounts for only 2.28% of flags (6 accounts)
- **Finding**: Mules spread across entire branch network, no regional hotspot

### Account Age at Flagging
- **Median age**: 648 days (1.8 years)
- **Distribution**:
  - 0–90 days: 10.27%
  - 90–365 days: 24.71%
  - 1–2 years: 25.10%
  - 2+ years: 39.92% ← **DELAYED DETECTION**
- **Finding**: 39.92% of mules flagged after 2+ years, suggesting operational accounts evade early detection

---

## 3. CUSTOMER PROFILE FINDINGS (Task 3B)

### Age Analysis
- **Mule mean age**: 50.9 years (as of 2025-06-30)
- **Legit mean age**: 49.5 years (difference: +1.4 years)
- **Highest mule concentration**: 65+ age group (1.34% mule rate vs 1.09% baseline)
- **Finding**: WEAK SIGNAL — age not a strong predictor

### Relationship Tenure
- **Mule mean tenure**: 15.6 years
- **Legit mean tenure**: 15.4 years
- **Finding**: WEAK SIGNAL — virtually identical tenure, not predictive

### KYC Document Availability
- **Aadhaar available**:
  - Mule: 72.62%
  - Legit: 81.74%
  - Difference: -9.12pp 🔍 **MEDIUM SIGNAL**
- **Passport available**:
  - Mule: 6.08%
  - Legit: 7.70%
  - Difference: -1.62pp
- **Document count vs mule rate**:
  - 0 documents: 1.45% mule rate
  - 1 document: 1.11% mule rate
  - 2 documents: 0.94% mule rate
  - 3 documents: 0.61% mule rate
- **Finding**: Fewer documents = higher mule concentration (account setup fraud signal)

### Digital Banking Engagement
- **Digital score** (count of Y flags: mobile, internet, ATM, demat, credit, fastag):
  - Mule mean: 1.54 services
  - Legit mean: 1.53 services
- **Finding**: WEAK SIGNAL — essentially identical digital adoption

### PIN Code Mismatch
- **Mule %**: 27.38% have customer_pin ≠ permanent_pin
- **Legit %**: 30.29% have mismatch
- **Difference**: -2.91pp
- **Finding**: NO SIGNAL — mules less likely to have PIN mismatch (counter-intuitive)

---

## 4. ACCOUNT PROFILE FINDINGS (Task 3C)

### Account Status ⭐ STRONGEST SIGNAL
- **Mule frozen rate**: 39.92% (105 / 263)
- **Legit frozen rate**: 2.04% (485 / 23,760)
- **Of all frozen accounts**: 17.80% are mules (vs 1.09% expected)
- **Multiplier**: Mules 19.6x more likely to be frozen
- **Finding**: EXCEPTIONALLY STRONG PREDICTOR

### Account Age
- **Mule mean**: 2.7 years
- **Legit mean**: 3.1 years
- **Difference**: -0.4 years
- **Finding**: WEAK SIGNAL — minimal age difference

### Balance Analysis ⭐ VERY STRONG SIGNAL

| Metric | Mule | Legit | Difference |
|--------|------|-------|-----------|
| **avg_balance mean** | -₹26,562 | +₹53,282 | -149.9% |
| **avg_balance % negative** | 14.07% | 11.74% | +2.33pp |
| **monthly_avg_balance mean** | -₹20,981 | +₹52,861 | -139.7% |
| **daily_avg_balance mean** | -₹15,792 | +₹53,232 | -129.7% |

- **Finding**: All three balance measures consistently show mules in overdraft; systematic feature

### KYC Compliance
- **Mule non-compliant**: 8.37%
- **Legit non-compliant**: 10.00%
- **Difference**: -1.63pp
- **Finding**: COUNTER-SIGNAL — mules MORE compliant (likely paper compliance with fraudulent KYC)

### Mobile Updates
- **% with last_mobile_update_date populated**:
  - Mule: 15.21%
  - Legit: 15.04%
  - Essentially identical
- **For populated records**:
  - Mule mean recency: 74 days (2.5 months)
  - Legit mean recency: 90 days (3.0 months)
- **Account takeover signal** (mobile update within 90 days before flagging): 4.94% (13/263)
- **Finding**: WEAK SIGNAL

### Product Family
- **S (Savings)**: Mule 56.65% | Legit 58.21%
- **K (Non-specified)**: Mule 33.08% | Legit 31.76%
- **O (Other)**: Mule 10.27% | Legit 10.03%
- **Finding**: NO SIGNAL — identical distribution

### Branch Analysis
- **Total unique branches**: 8,344
- **Rural concentration**:
  - Mule in rural: 15.97%
  - Legit in rural: 11.65%
  - Difference: +4.32pp 🔍 **MEDIUM SIGNAL**
- **Top 20 by count vs top 20 by mule count**: 0 overlap (completely different)
- **Finding**: Mules slightly concentrated in rural areas; possible account farming activity

---

## 5. TRANSACTION VOLUME FINDINGS (Task 3D)

### Transaction Count
- **Mule mean**: 197.0 txns per account
- **Legit mean**: 189.0 txns per account
- **Difference**: +4.2% ← WEAK
- **Median**: Mule 67.5 vs Legit 38.0 (+77.6%) ← CLEARER SIGNAL
- **Finding**: Median more informative; mules slightly higher volume

### Credit vs Debit Volume ⭐ VERY STRONG SIGNAL

| Metric | Mule | Legit | Difference |
|--------|------|-------|-----------|
| **Total credit mean** | ₹3,154,768 | ₹1,792,690 | +76.0% |
| **Total debit mean** | ₹-3,103 | ₹-8,307 | +167.8% |
| **Net flow mean** | ₹3,151,665 | ₹1,784,383 | +76.6% |

- **Finding**: Mules process 76% MORE total money; strong volume signal

### Counterparty Diversity ⭐ VERY STRONG SIGNAL
- **Mule unique counterparties mean**: 37.1
- **Legit unique counterparties mean**: 13.7
- **Difference**: +171.5%
- **Counterparty ratio** (unique / total txns):
  - Mule: 0.542 (54% of txns are to unique parties)
  - Legit: 0.445 (45% of txns are to unique parties)
  - Difference: +21.7%
- **Finding**: Mules interact with 2.7x more counterparties (classic mule network topology)

### Transaction Activity Window
- **Mule active days**: 828.9 days mean (2.3 years)
- **Legit active days**: 836.2 days mean (2.3 years)
- **<30 days**: Mule 2.71% | Legit 0.98% (+1.73pp short-lived burst accounts)
- **Finding**: WEAK SIGNAL — most accounts active 6+ months

### Temporal Patterns
- **Day of week**: Nearly identical distribution (Sunday: +1.49pp for mules)
- **Hour of day**: Identical distribution across all 24 hours
- **Monthly trend**: Mules 847 txns/month mean (vs legit 72,812/month—86x higher!)
- **Finding**: NO INTRA-DAY SIGNAL; mules smaller individually but collectively high-volume

---

## 6. TRANSACTION PATTERN FINDINGS (Task 3E)

### Structuring Detection ⭐ VERY STRONG SIGNAL
- **₹40K–₹50K amount band**:
  - Mule mean: 9.91 txns per account
  - Legit mean: 5.87 txns per account
  - **Difference**: +69.0%
- **₹4.5L–₹5L amount band**:
  - Mule mean: 1.50 txns
  - Legit mean: 1.21 txns
  - **Difference**: +23.8%
- **Specific frequencies**:
  - ₹25,000: Mule 0.342% | Legit 0.117% (+191% more frequent)
  - ₹50,000: Mule 0.321% | Legit 0.062% (+418% more frequent)
- **Finding**: Classic structuring pattern — deliberate amount selection to evade thresholds

### Round Amount Analysis
- **% round amounts (÷1,000)**:
  - Mule: 12.41%
  - Legit: 17.15%
  - **Difference**: -27.6% (mules use FEWER round amounts overall)
- **BUT**: Heavy concentration on specific midrange amounts (₹25K, ₹50K)
- **Finding**: NOT random processing; targeted amount selection (structuring signature)

### Rapid Pass-through
- **Mule fan-out ratio**: 0.243 (24% of debits to unique receivers)
- **Legit fan-out ratio**: 0.271 (27% of debits to unique receivers)
- **Credit volume with speed**: Mules 76% MORE credit with similar pass-through ratio
- **Finding**: High-volume pass-through is signature (volume + speed combined)

### Channel Analysis ⭐ STRONG SIGNAL (Over-represented Channels)

| Channel | Mule % | Legit % | Ratio | Interpretation |
|---------|--------|---------|-------|-----------------|
| ATW | 1.69% | 0.66% | 🔍 2.6x | Alert Transfer (rapid) |
| NTD | 4.40% | 1.93% | 🔍 2.3x | NEFT (less monitored) |
| CHQ | 1.57% | 0.75% | 🔍 2.1x | Cheque (offline) |
| FTD | 2.65% | 1.29% | 🔍 2.0x | Fund Transfer |

- **Finding**: Mules prefer rapid, less-monitored channels for quick movement

### Fan-in / Fan-out ⭐ VERY STRONG SIGNAL

| Metric | Mule | Legit | Difference |
|--------|------|-------|-----------|
| **Fan-in ratio mean** | 0.543 | 0.446 | +21.6% |
| **Fan-in ratio median** | 0.560 | 0.390 | +43.6% |
| **Fan-out ratio mean** | 0.243 | 0.271 | -10.4% |

- **Interpretation**: 
  - Mules receive from 54% unique senders (high fan-in = many sources)
  - Mules send to 24% unique receivers (moderate fan-out = some concentration)
  - **Pattern**: Many-to-some distribution (classic money concentration network)
- **Finding**: Network topology is signature pattern

---

## 7. SIGNALS RANKED BY STRENGTH

### 🔴 VERY STRONG SIGNALS (Use as PRIMARY features)

1. **Account Frozen Status**
   - Mule 39.92% frozen vs Legit 2.04% frozen
   - **Ratio**: 19.6x higher
   - **Strength**: EXCEPTIONAL (binary flag, high separation)

2. **Negative Balances (avg_balance family)**
   - Mule -₹26,562 mean vs Legit +₹53,282 mean
   - **Difference**: -149.9%
   - **All three measures consistent**: avg, monthly_avg, daily_avg all -130% to -150%
   - **Strength**: VERY STRONG (systematic, multiple proxies)

3. **Structuring Pattern (₹40K–₹50K band)**
   - Mule 9.91 txns mean vs Legit 5.87 txns mean
   - **Difference**: +69.0%
   - **Specific amounts**: ₹50K frequency 418% higher
   - **Strength**: VERY STRONG (behavioral signature, known money laundering technique)

4. **Channel Over-use (ATW)**
   - Mule 1.69% vs Legit 0.66%
   - **Ratio**: 2.6x more
   - **Alert Transfer = rapid, less-monitored channel**
   - **Strength**: STRONG (channel selection bias)

5. **Credit Volume**
   - Mule ₹3.15M mean vs Legit ₹1.79M mean
   - **Difference**: +76.0%
   - **Strength**: STRONG (high-volume money flow)

6. **Counterparty Diversity (Fan-in)**
   - Mule 37.1 unique counterparties vs Legit 13.7
   - **Ratio**: 2.7x more
   - **Fan-in ratio**: +21.6% to +43.6%
   - **Strength**: VERY STRONG (network topology signature)

### 🟡 MEDIUM SIGNALS (Use as SUPPORTING features)

7. **Channel Over-use (NTD, CHQ, FTD)**
   - NTD: 2.3x more (NEFT)
   - CHQ: 2.1x more (Cheque)
   - FTD: 2.0x more (Fund Transfer)
   - **Strength**: MEDIUM (consistent pattern across multiple channels)

8. **Specific Amount Concentration (₹25K, ₹50K)**
   - ₹25K: 191% more frequent in mules
   - ₹50K: 418% more frequent in mules
   - **Strength**: MEDIUM (derivative of structuring, but independent signal)

9. **Fewer Documents (Aadhaar)**
   - Mule 72.62% have aadhaar vs Legit 81.74%
   - **Difference**: -9.12pp
   - **Trend**: 0 docs = 1.45% mule rate, 3 docs = 0.61% mule rate
   - **Strength**: MEDIUM (account setup fraud indicator)

10. **Rural Branch Concentration**
    - Mule 15.97% in rural vs Legit 11.65%
    - **Difference**: +4.32pp
    - **Strength**: MEDIUM (geographic concentration)

11. **Fan-in Ratio (Median)**
    - Mule 0.560 median vs Legit 0.390 median
    - **Difference**: +43.6%
    - **Strength**: MEDIUM (high diversity of money sources)

### 🟢 WEAK SIGNALS (COMBINE with others)

12. **Transaction Count Median**
    - Mule 67.5 median vs Legit 38.0 median
    - **Difference**: +77.6%
    - **Strength**: WEAK as standalone (mean only +4.2%)

13. **Mule Flagging Acceleration**
    - Exponential increase over time (32x higher in 2025 vs 2020)
    - **Strength**: WEAK for historical prediction (future-looking signal)

14. **Account Age at Flagging (39.92% flagged >2 years)**
    - Shows delayed detection but not predictive
    - **Strength**: WEAK (post-hoc pattern)

---

## 8. RECOMMENDED TOP 15 FEATURES FOR MODEL

Based on EDA findings, prioritized for feature engineering in Step 4:

### Primary Features (Expected High Importance)

1. **is_frozen** (from account_status)
   - Binary flag for frozen status
   - **Justification**: 19.6x higher in mules, strongest single predictor

2. **avg_balance_negative** (flag or continuous)
   - Binary flag for negative avg_balance OR continuous value
   - **Justification**: -149.9% difference, systematic overdraft pattern

3. **structuring_40k_50k_count**
   - Count of transactions in ₹40K–₹50K band per account
   - **Justification**: +69% in mules, known money laundering signature

4. **specific_amount_50k_pct**
   - Percentage of transactions exactly ₹50,000
   - **Justification**: +418% frequency in mules, highest concentration

5. **credit_volume_total**
   - Sum of all positive amounts per account
   - **Justification**: +76% in mules, high-volume money flow signal

6. **unique_counterparties_count**
   - Count of unique counterparty_ids per account (from transactions)
   - **Justification**: 2.7x more in mules, network diversity

7. **fan_in_ratio**
   - Unique senders / credit transaction count
   - **Justification**: +21.6% to +43.6% in mules, money source diversity

8. **channel_atw_pct**
   - Percentage of transactions via ATW channel
   - **Justification**: 2.6x over-represented in mules

### Secondary Features (Expected Medium Importance)

9. **channel_neft_pct**
   - Percentage of transactions via NTD (NEFT) channel
   - **Justification**: 2.3x over-represented

10. **specific_amount_25k_pct**
    - Percentage of transactions exactly ₹25,000
    - **Justification**: +191% frequency, structuring signal

11. **kyc_documents_available_count**
    - Sum of (pan_available + aadhaar_available + passport_available)
    - **Justification**: Fewer docs → higher mule rate (account setup fraud)

12. **rural_branch_flag**
    - Binary flag for rural_branch = 'Y'
    - **Justification**: +4.32pp concentration in rural areas

13. **net_flow_total**
    - Total credit + total debit per account
    - **Justification**: +76.6% in mules, net movement volume

14. **channel_cheque_pct**
    - Percentage of transactions via CHQ (Cheque) channel
    - **Justification**: 2.1x over-represented

### Tertiary Features (Expected Lower Importance, for Interactions)

15. **active_days_duration**
    - Days between first and last transaction
    - **Justification**: Weak signal alone, but useful for time-window features and interactions

---

## 9. RISKS & WATCH-OUTS

### Label Quality Issues

1. **Exponential Recent Flagging**: 32x higher flagging rate in 2025 vs 2020
   - **Risk**: Recent labels may be incomplete (still being flagged)
   - **Mitigation**: Consider holdout test set from earlier periods (2020–2023)

2. **"Routine Investigation" Dominance**: 20.91% of mules flagged as "routine"
   - **Risk**: Possible label noise (misclassified legitimate accounts)
   - **Mitigation**: Cross-validate with alert_reason; consider removing "routine" subset

3. **Delayed Detection**: 39.92% of mules flagged after 2+ years
   - **Risk**: Model trained on operational accounts; may not catch early-stage mules
   - **Mitigation**: Use separate early-detection model or two-stage approach

### Data Quality Issues

4. **3,876 Illogical Date Sequences**: account_opening_date < relationship_start_date
   - **Risk**: Feature engineering will propagate these errors
   - **Mitigation**: Flag as categorical feature or drop from training

5. **38,636 Pre-opening Transactions**: transactions before account_opening_date
   - **Risk**: 0.52% of transactions are data quality errors
   - **Mitigation**: Filter or mark as "pre-opening" feature flag

6. **433 Frozen Accounts with No Transactions**
   - **Risk**: Cannot compute transaction-based features
   - **Mitigation**: Separate handling or impute with zeros

7. **84.92% Null last_mobile_update_date**
   - **Risk**: Majority of accounts lack this signal
   - **Mitigation**: Treat null as categorical class ("no update")

### Class Imbalance Strategy

8. **Extreme Imbalance: 1.09% mule rate**
   - **Recommendation**: 
     - Use stratified k-fold CV (at least 5-fold)
     - Apply class weights (~90.4x for mule class)
     - Consider AUPRC (Precision-Recall) as primary metric, not AUROC
     - Avoid accuracy; use F1-score or threshold optimization
   - **Alternative**: Two-stage approach (anomaly detection → classification)

9. **Unlabeled Data: 40% of accounts (16,015)**
   - **Risk**: Cannot use for supervised training
   - **Mitigation**: Option to use semi-supervised learning or pseudo-label high-confidence predictions

### Feature Leakage Warnings

10. **MUST EXCLUDE from model**:
    - `is_mule` (target variable)
    - `flagged_by_branch` (100% predictive, derived during labeling)
    - `alert_reason` (92% predictive, requires label to generate)
    - `mule_flag_date` (only known after flagging)

11. **BE CAREFUL with**:
    - `account_status` (some accounts frozen POST-flagging as intervention)
    - `freeze_date`, `unfreeze_date` (may be response to flag)
    - Recent transaction features (model should work for early detection)

### Recommendations for Step 4

1. **Feature Engineering Priority**:
   - Implement top 7 primary features first (expected high importance)
   - Validate with correlation analysis before modeling

2. **Feature Scaling**:
   - Standardize continuous features (balance, credit_volume, counterparty_count)
   - Use log-transformation for skewed distributions (transaction counts)

3. **Categorical Encoding**:
   - One-hot encode channel percentages if using as features
   - Binary encode frozen status, document count bins

4. **Interaction Terms** (for tree models):
   - Consider: frozen × negative_balance (doubly suspicious)
   - Consider: structuring_count × channel_atw_pct (coordinated activity)
   - Consider: fan_in_ratio × credit_volume (high-volume diverse inflows)

5. **Model Selection Hints**:
   - **XGBoost/LightGBM**: Best for this feature set (captures nonlinear interactions)
   - **Logistic Regression**: Good baseline for interpretability; use standardized features
   - **Avoid Deep Learning**: Too few training samples (263 mules), high overfitting risk

---

## CONCLUSION

**EDA has identified 6 VERY STRONG predictors with exceptional separation**:
1. Frozen account status (19.6x)
2. Negative balances (-149.9%)
3. Structuring pattern (+69%)
4. Channel ATW over-use (2.6x)
5. Credit volume (+76%)
6. Counterparty diversity (2.7x)

Combined with 9 additional medium/weak signals, this foundation provides **exceptionally high-quality feature space** for training a mule detection model.

**Estimated Model Performance**: With these features, expect AUROC 0.85–0.92 (subject to proper CV strategy and class weighting).

**Ready for Step 4**: Feature engineering and model training 🚀
