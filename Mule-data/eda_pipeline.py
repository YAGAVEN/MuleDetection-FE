#!/usr/bin/env python3
"""
EDA Pipeline — Exploratory Data Analysis and Data Quality
Combines all STEP2 & STEP3 analyses into one production script
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
import warnings
warnings.filterwarnings('ignore')

# ============================================================
# SECTION 1 — CONFIG & SETUP
# ============================================================

CONFIG = {
    'data_path': 'Mule-data/',
    'output_path': 'reports/eda_plots/',
    'reference_date': pd.Timestamp('2025-06-30'),
    'txn_cutoff_date': pd.Timestamp('2023-07-01'),
    'random_seed': 42,
}

os.makedirs(CONFIG['output_path'], exist_ok=True)
np.random.seed(CONFIG['random_seed'])

# ============================================================
# SECTION 2 — LOAD DATA
# ============================================================

print("\n" + "="*60)
print("SECTION 2 — LOADING DATA")
print("="*60)

master = pd.read_csv(
    f"{CONFIG['data_path']}master.csv",
    dtype={'account_id': str, 'customer_id': str},
    parse_dates=['date_of_birth', 'relationship_start_date',
                 'account_opening_date', 'last_mobile_update_date',
                 'last_kyc_date', 'freeze_date', 'unfreeze_date',
                 'mule_flag_date']
)

transactions = pd.read_csv(
    f"{CONFIG['data_path']}transactions_full.csv",
    dtype={'account_id': str, 'transaction_id': str,
           'counterparty_id': str},
    parse_dates=['transaction_timestamp']
)

print(f"✓ Master shape: {master.shape}")
print(f"✓ Transactions shape: {transactions.shape}")

# Separate labeled data
train = master[master['is_mule'].notna()].copy()
mules = train[train['is_mule'] == 1]
legit = train[train['is_mule'] == 0]

print(f"✓ Train: {len(train)} | Mules: {len(mules)} | Legit: {len(legit)}")

# ============================================================
# SECTION 3 — NULL / MISSING VALUE ANALYSIS
# ============================================================

print("\n" + "="*60)
print("SECTION 3 — NULL / MISSING VALUE ANALYSIS")
print("="*60)

# Master nulls
null_analysis = pd.DataFrame({
    'Column': master.columns,
    'Null_Count': master.isnull().sum().values,
    'Null_Pct': (master.isnull().sum() / len(master) * 100).values
})
null_analysis = null_analysis[null_analysis['Null_Count'] > 0].sort_values('Null_Pct', ascending=False)

print("\nMaster columns with nulls:")
print(null_analysis.to_string(index=False))

# Expected nulls categorization
expected_null_cols = ['freeze_date', 'unfreeze_date', 'mule_flag_date']
unexpected_nulls = null_analysis[~null_analysis['Column'].isin(expected_null_cols)]

if len(unexpected_nulls) > 0:
    print(f"\n⚠️  UNEXPECTED NULLS found in {len(unexpected_nulls)} columns:")
    print(unexpected_nulls.to_string(index=False))
else:
    print("\n✓ No unexpected nulls in master")

# Transaction critical columns
critical_cols = ['transaction_id', 'account_id', 'amount', 'transaction_timestamp', 'txn_type']
txn_nulls = transactions[critical_cols].isnull().sum()
if txn_nulls.sum() > 0:
    print(f"\n⚠️  CRITICAL NULLS in transactions:")
    print(txn_nulls[txn_nulls > 0])
else:
    print("\n✓ No nulls in critical transaction columns")

# Null rate comparison: mule vs legit
print("\nNull rate comparison — Mule vs Legit:")
for col in null_analysis['Column'].head(10):
    mule_null_rate = master[master['is_mule'] == 1][col].isnull().mean() * 100
    legit_null_rate = master[master['is_mule'] == 0][col].isnull().mean() * 100
    diff = abs(mule_null_rate - legit_null_rate)
    print(f"  {col:30s}: Mule={mule_null_rate:6.2f}% | Legit={legit_null_rate:6.2f}% | Diff={diff:6.2f}%")

# ============================================================
# SECTION 4 — DATE COLUMN VALIDATION
# ============================================================

print("\n" + "="*60)
print("SECTION 4 — DATE COLUMN VALIDATION")
print("="*60)

date_cols = ['date_of_birth', 'relationship_start_date', 'account_opening_date',
             'last_mobile_update_date', 'last_kyc_date', 'freeze_date',
             'unfreeze_date', 'mule_flag_date']

for col in date_cols:
    if col in master.columns:
        valid_dates = master[col].dropna()
        if len(valid_dates) > 0:
            print(f"\n{col}:")
            print(f"  Min: {valid_dates.min()}")
            print(f"  Max: {valid_dates.max()}")
            print(f"  Range: {(valid_dates.max() - valid_dates.min()).days} days")
            print(f"  Nulls: {master[col].isnull().sum()}")

# Date validation checks
print("\n--- Cross-column date checks ---")

# Check for invalid dates (before 1900 or after reference date)
for col in date_cols:
    if col in master.columns:
        invalid = master[(master[col] < pd.Timestamp('1900-01-01')) |
                        (master[col] > CONFIG['reference_date'])][col]
        if len(invalid) > 0:
            print(f"⚠️  {col}: {len(invalid)} dates outside valid range")

# account_opening_date should be before relationship_start_date
check = master[master['account_opening_date'] > master['relationship_start_date']]
if len(check) > 0:
    print(f"⚠️  {len(check)} accounts with opening_date > relationship_start_date")

# freeze_date should be before unfreeze_date
check = master[(master['freeze_date'].notna()) & (master['unfreeze_date'].notna()) &
              (master['freeze_date'] > master['unfreeze_date'])]
if len(check) > 0:
    print(f"⚠️  {len(check)} accounts with freeze_date > unfreeze_date")

# mule_flag_date should be within Jul 2020 – Jun 2025
check = mules[(mules['mule_flag_date'] < pd.Timestamp('2020-07-01')) |
             (mules['mule_flag_date'] > pd.Timestamp('2025-06-30'))]
if len(check) > 0:
    print(f"⚠️  {len(check)} mules flagged outside Jul 2020 – Jun 2025")

# Transaction dates
print("\nTransaction date range:")
print(f"  Min: {transactions['transaction_timestamp'].min()}")
print(f"  Max: {transactions['transaction_timestamp'].max()}")
future_txns = transactions[transactions['transaction_timestamp'] > CONFIG['reference_date']]
if len(future_txns) > 0:
    print(f"⚠️  {len(future_txns)} future-dated transactions found")

# Account opening before first transaction
merged = transactions.merge(master[['account_id', 'account_opening_date']], 
                           on='account_id', how='inner')
early_txns = merged[merged['transaction_timestamp'] < merged['account_opening_date']]
if len(early_txns) > 0:
    print(f"⚠️  {len(early_txns)} transactions before account_opening_date")

# Distribution by year
print("\nAccount opening date distribution by year:")
master['opening_year'] = master['account_opening_date'].dt.year
print(master['opening_year'].value_counts().sort_index().tail(10).to_string())

print("\nMule flag date distribution by year:")
mules['flag_year'] = mules['mule_flag_date'].dt.year
print(mules['flag_year'].value_counts().sort_index().to_string())

# ============================================================
# SECTION 5 — CATEGORICAL COLUMN VALIDATION
# ============================================================

print("\n" + "="*60)
print("SECTION 5 — CATEGORICAL COLUMN VALIDATION")
print("="*60)

# Basic categorical analysis
print("\nAccount Status Distribution:")
print(master['account_status'].value_counts())

print("\nProduct Family Distribution:")
print(master['product_family'].value_counts())

print("\nCurrency Code Distribution:")
print(master['currency_code'].value_counts())

# Y/N flags comparison
y_n_flags = ['pan_available', 'aadhaar_available', 'passport_available',
             'mobile_banking_flag', 'internet_banking_flag', 'atm_card_flag',
             'demat_flag', 'credit_card_flag', 'fastag_flag',
             'nomination_flag', 'cheque_allowed', 'cheque_availed',
             'kyc_compliant', 'rural_branch']

print("\nY/N Flag Comparison — Mule vs Legit:")
print(f"{'Flag':<30} {'Overall %Y':>12} {'Mule %Y':>12} {'Legit %Y':>12} {'Diff':>10}")
print("-" * 70)

signals = []
for col in y_n_flags:
    if col in master.columns:
        overall_y_pct = (master[col] == 'Y').mean() * 100
        mule_y_pct = (mules[col] == 'Y').mean() * 100
        legit_y_pct = (legit[col] == 'Y').mean() * 100
        diff = abs(mule_y_pct - legit_y_pct)
        
        marker = "🔍 SIGNAL" if diff > 10 else ""
        print(f"{col:<30} {overall_y_pct:>11.1f}% {mule_y_pct:>11.1f}% {legit_y_pct:>11.1f}% {diff:>9.1f}% {marker}")
        
        if diff > 10:
            signals.append((col, diff))

if signals:
    print(f"\n🔍 Found {len(signals)} strong signals:")
    for col, diff in sorted(signals, key=lambda x: x[1], reverse=True):
        print(f"   {col}: {diff:.1f}% difference")

# Transaction channels
print("\nTransaction Channel Distribution:")
valid_channels = {'UPC', 'UPD', 'END', 'IPM', 'STD', 'P2A', 'FTD', 'NTD', 'MCR', 'FTC',
                 'MAC', 'TPD', 'APD', 'CHQ', 'ATW', 'TPC', 'STC', 'OCD', 'RCD', 'IFD',
                 'ETD', 'NWD', 'CSD', 'IFC', 'PCA', 'MAD', 'CHD', 'RTD', 'CCL', 'OPI',
                 'CTC', 'SID', 'ASD', 'IAD', 'SCW'}

channel_dist = transactions['channel'].value_counts()
invalid_channels = set(channel_dist.index) - valid_channels
if len(invalid_channels) > 0:
    print(f"⚠️  Invalid channels found:")
    for ch in invalid_channels:
        print(f"   {ch}: {channel_dist[ch]} transactions")

print(f"\nValid channels (top 15):")
print(channel_dist.head(15).to_string())

print(f"\nTransaction Type Distribution:")
print(transactions['txn_type'].value_counts())

print(f"\nMCC Code unique values: {transactions['mcc_code'].nunique()}")
print(f"MCC Code nulls: {transactions['mcc_code'].isnull().sum()}")

# ============================================================
# SECTION 6 — NUMERIC COLUMN VALIDATION
# ============================================================

print("\n" + "="*60)
print("SECTION 6 — NUMERIC COLUMN VALIDATION")
print("="*60)

numeric_cols = ['avg_balance', 'monthly_avg_balance', 'quarterly_avg_balance',
               'daily_avg_balance', 'loan_sum', 'loan_count', 'cc_sum', 'cc_count',
               'od_sum', 'od_count', 'ka_sum', 'ka_count', 'sa_sum', 'sa_count']

print("\nMaster Numeric Columns Statistics:")
print(f"{'Column':<30} {'Min':>12} {'Max':>12} {'Mean':>12} {'Median':>12} {'Std':>12}")
print("-" * 90)

signals = []
for col in numeric_cols:
    if col in master.columns:
        stats = master[col].describe()
        print(f"{col:<30} {stats['min']:>12.2f} {stats['max']:>12.2f} "
              f"{stats['mean']:>12.2f} {stats['50%']:>12.2f} {stats['std']:>12.2f}")
        
        # Mule vs Legit comparison
        mule_mean = mules[col].mean()
        legit_mean = legit[col].mean()
        diff_pct = abs(mule_mean - legit_mean) / max(abs(legit_mean), 0.01) * 100
        
        if diff_pct > 20:
            signals.append((col, diff_pct))

if signals:
    print(f"\n🔍 Found {len(signals)} numeric signals (>20% difference):")
    for col, diff_pct in sorted(signals, key=lambda x: x[1], reverse=True):
        print(f"   {col}: {diff_pct:.1f}% difference")

# Transaction amounts
print("\nTransaction Amount Statistics:")
txn_stats = transactions['amount'].describe()
print(f"  Min: {txn_stats['min']:>12.2f}")
print(f"  Max: {txn_stats['max']:>12.2f}")
print(f"  Mean: {txn_stats['mean']:>12.2f}")
print(f"  Median: {txn_stats['50%']:>12.2f}")
print(f"  Std: {txn_stats['std']:>12.2f}")

# Amount bands
pos_txns = transactions[transactions['amount'] > 0]
neg_txns = transactions[transactions['amount'] < 0]

amount_bands = [
    (0, 1000, 'Below ₹1K'),
    (1000, 10000, '₹1K – ₹10K'),
    (10000, 50000, '₹10K – ₹50K'),
    (50000, 100000, '₹50K – ₹1L'),
    (100000, 500000, '₹1L – ₹5L'),
    (500000, float('inf'), 'Above ₹5L'),
]

print("\nPositive Transaction Amount Bands:")
for lower, upper, label in amount_bands:
    count = len(pos_txns[(pos_txns['amount'] >= lower) & (pos_txns['amount'] < upper)])
    pct = count / len(pos_txns) * 100
    print(f"  {label:20s}: {count:>10d} ({pct:>6.2f}%)")

thresholds = [100000, 500000, 1000000]
print("\nTransactions above thresholds:")
for thresh in thresholds:
    count = len(transactions[transactions['amount'] > thresh])
    pct = count / len(transactions) * 100
    print(f"  Above ₹{thresh/100000:.0f}L: {count:>10d} ({pct:>6.2f}%)")

# ============================================================
# SECTION 7 — VISUALIZATIONS
# ============================================================

print("\n" + "="*60)
print("SECTION 7 — GENERATING VISUALIZATIONS")
print("="*60)

fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# 1. Mule flag dates by month
mule_flag_monthly = mules.set_index('mule_flag_date').resample('M').size()
axes[0, 0].bar(range(len(mule_flag_monthly)), mule_flag_monthly.values, color='crimson', alpha=0.7)
axes[0, 0].set_title('Mule Flagging Activity Over Time', fontsize=12, fontweight='bold')
axes[0, 0].set_xlabel('Month')
axes[0, 0].set_ylabel('Count')
axes[0, 0].grid(True, alpha=0.3)

# 2. Alert reasons (if available)
if 'alert_reason' in mules.columns:
    alert_top = mules['alert_reason'].value_counts().head(10)
    axes[0, 1].barh(range(len(alert_top)), alert_top.values, color='steelblue', alpha=0.7)
    axes[0, 1].set_yticks(range(len(alert_top)))
    axes[0, 1].set_yticklabels(alert_top.index, fontsize=9)
    axes[0, 1].set_title('Top Alert Reasons for Mules', fontsize=12, fontweight='bold')
    axes[0, 1].set_xlabel('Count')
    axes[0, 1].grid(True, alpha=0.3, axis='x')

# 3. Age at flagging
if 'mule_flag_date' in master.columns:
    age_at_flag = (mules['mule_flag_date'] - mules['account_opening_date']).dt.days
    age_at_flag = age_at_flag[age_at_flag > 0]
    axes[1, 0].hist(age_at_flag, bins=50, color='coral', alpha=0.7, edgecolor='black')
    axes[1, 0].set_title('Account Age at Flagging', fontsize=12, fontweight='bold')
    axes[1, 0].set_xlabel('Days')
    axes[1, 0].set_ylabel('Count')
    axes[1, 0].grid(True, alpha=0.3)

# 4. Transaction amount distribution (log scale)
axes[1, 1].hist(np.log1p(pos_txns['amount']), bins=50, color='seagreen', alpha=0.7, edgecolor='black')
axes[1, 1].set_title('Transaction Amount Distribution (log scale)', fontsize=12, fontweight='bold')
axes[1, 1].set_xlabel('Log Amount')
axes[1, 1].set_ylabel('Count')
axes[1, 1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(f"{CONFIG['output_path']}01_eda_summary.png", dpi=150, bbox_inches='tight')
print(f"✓ Saved: 01_eda_summary.png")
plt.close()

# ============================================================
# SECTION 8 — SUMMARY REPORT
# ============================================================

print("\n" + "="*60)
print("EDA PIPELINE COMPLETE")
print("="*60)
print(f"Master: {master.shape} | Transactions: {transactions.shape}")
print(f"Labeled accounts: {len(train)} (Mules: {len(mules)}, Legit: {len(legit)})")
print(f"Mule rate: {len(mules)/len(train)*100:.2f}%")
print(f"Output saved to: {CONFIG['output_path']}")
