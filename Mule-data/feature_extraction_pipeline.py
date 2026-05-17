#!/usr/bin/env python3
"""
Feature Extraction Pipeline — Build 40+ engineered features for fraud detection
Combines all STEP4 feature engineering code into one production script
"""

import pandas as pd
import numpy as np
import os
import warnings
warnings.filterwarnings('ignore')

# ============================================================
# SECTION 1 — CONFIG & SETUP
# ============================================================

CONFIG = {
    'data_path': os.getenv('FEATURE_PIPELINE_DATA_PATH', 'Mule-data/'),
    'output_path': os.getenv('FEATURE_PIPELINE_OUTPUT_PATH', 'Mule-data/features/'),
    'reference_date': pd.Timestamp('2025-06-30'),
    'random_seed': 42,
}

# Convert Windows paths to forward slashes for consistent handling
CONFIG['data_path'] = CONFIG['data_path'].replace('\\', '/')
CONFIG['output_path'] = CONFIG['output_path'].replace('\\', '/')

# Ensure paths end with /
if not CONFIG['data_path'].endswith('/'):
    CONFIG['data_path'] += '/'
if not CONFIG['output_path'].endswith('/'):
    CONFIG['output_path'] += '/'

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

print(f"✓ Master: {master.shape}")
print(f"✓ Transactions: {transactions.shape}")

# ============================================================
# SECTION 3 — BUILD ACCOUNT & BALANCE FEATURES (TASK 4A)
# ============================================================

print("\n" + "="*60)
print("SECTION 3 — ACCOUNT & BALANCE FEATURES")
print("="*60)

feat = master[['account_id', 'is_mule']].copy()

# Account status (VERY STRONG SIGNAL - 19.6x)
feat['is_frozen'] = (master['account_status'] == 'frozen').astype(int)
print("✓ is_frozen")

# Balance features (VERY STRONG SIGNAL - 149.9% diff)
feat['avg_balance'] = master['avg_balance']
feat['monthly_avg_balance'] = master['monthly_avg_balance']
feat['daily_avg_balance'] = master['daily_avg_balance']
feat['quarterly_avg_balance'] = master['quarterly_avg_balance']
feat['avg_balance_negative'] = (master['avg_balance'] < 0).astype(int)
feat['balance_volatility'] = master['monthly_avg_balance'] - master['daily_avg_balance']
feat['balance_consistency'] = master['quarterly_avg_balance'].div(
    master['monthly_avg_balance'].replace(0, np.nan)
)
print("✓ balance features")

# KYC document count (MEDIUM SIGNAL)
feat['kyc_doc_count'] = (
    (master['pan_available'] == 'Y').astype(int) +
    (master['aadhaar_available'] == 'Y').astype(int) +
    (master['passport_available'] == 'Y').astype(int)
)
feat['has_aadhaar'] = (master['aadhaar_available'] == 'Y').astype(int)
feat['has_pan'] = (master['pan_available'] == 'Y').astype(int)
print("✓ kyc_doc_count")

# Digital footprint score
digital_cols = ['mobile_banking_flag', 'internet_banking_flag',
                'atm_card_flag', 'demat_flag', 'credit_card_flag', 'fastag_flag']
feat['digital_score'] = sum(
    (master[col] == 'Y').astype(int) for col in digital_cols
)
print("✓ digital_score")

# KYC compliance
feat['kyc_non_compliant'] = (master['kyc_compliant'] == 'N').astype(int)
feat['days_since_kyc'] = (
    CONFIG['reference_date'] - master['last_kyc_date']
).dt.days.fillna(9999)
print("✓ kyc compliance features")

# Account & customer age
feat['account_age_days'] = (
    CONFIG['reference_date'] - master['account_opening_date']
).dt.days
feat['customer_age_days'] = (
    CONFIG['reference_date'] - master['date_of_birth']
).dt.days
feat['relationship_tenure_days'] = (
    CONFIG['reference_date'] - master['relationship_start_date']
).dt.days
print("✓ age features")

# Mobile update recency
feat['has_mobile_update'] = master['last_mobile_update_date'].notna().astype(int)
feat['days_since_mobile_update'] = (
    CONFIG['reference_date'] - master['last_mobile_update_date']
).dt.days.fillna(9999)
print("✓ mobile_update features")

# Geographic risk
feat['pin_mismatch'] = (
    master['customer_pin'] != master['permanent_pin']
).astype(int)
feat['rural_branch'] = (master['rural_branch'] == 'Y').astype(int)
print("✓ geographic features")

# Product family encoding
feat['is_savings'] = (master['product_family'] == 'S').astype(int)
feat['is_overdraft'] = (master['product_family'] == 'O').astype(int)
feat['is_kfamily'] = (master['product_family'] == 'K').astype(int)
print("✓ product_family features")

# Nomination and cheque
feat['has_nomination'] = (master['nomination_flag'] == 'Y').astype(int)
feat['has_cheque'] = (master['cheque_availed'] == 'Y').astype(int)
print("✓ nomination & cheque features")

# ============================================================
# SECTION 4 — TRANSACTION VOLUME FEATURES (TASK 4B)
# ============================================================

print("\n" + "="*60)
print("SECTION 4 — TRANSACTION VOLUME FEATURES")
print("="*60)

all_accounts = master[['account_id', 'is_mule']].copy()
credits = transactions[transactions['amount'] > 0]
debits  = transactions[transactions['amount'] < 0]

# Aggregate base stats
vol = transactions.groupby('account_id').agg(
    txn_count             = ('transaction_id', 'count'),
    first_txn             = ('transaction_timestamp', 'min'),
    last_txn              = ('transaction_timestamp', 'max'),
    avg_txn_amount        = ('amount', 'mean'),
    max_txn_amount        = ('amount', 'max'),
    unique_counterparties = ('counterparty_id', 'nunique'),
).reset_index()

vol['active_days'] = (vol['last_txn'] - vol['first_txn']).dt.days.clip(lower=1)
vol['txn_velocity'] = vol['txn_count'] / vol['active_days']
print("✓ transaction volume features")

# Credit features (STRONG SIGNAL - +76%)
credit_agg = credits.groupby('account_id').agg(
    total_credit          = ('amount', 'sum'),
    credit_count          = ('transaction_id', 'count'),
    max_credit            = ('amount', 'max'),
    avg_credit            = ('amount', 'mean'),
    credit_counterparties = ('counterparty_id', 'nunique'),
).reset_index()
print("✓ credit features")

# Debit features
debit_agg = debits.groupby('account_id').agg(
    total_debit          = ('amount', 'sum'),
    debit_count          = ('transaction_id', 'count'),
    max_debit            = ('amount', 'min'),
    avg_debit            = ('amount', 'mean'),
    debit_counterparties = ('counterparty_id', 'nunique'),
).reset_index()
debit_agg['total_debit'] = debit_agg['total_debit'].abs()
debit_agg['max_debit']   = debit_agg['max_debit'].abs()
print("✓ debit features")

# Merge transaction features
feat = feat.merge(vol, on='account_id', how='left')
feat = feat.merge(credit_agg, on='account_id', how='left')
feat = feat.merge(debit_agg, on='account_id', how='left')

# Derived features
feat['net_flow'] = feat['total_credit'].fillna(0) - feat['total_debit'].fillna(0)
feat['net_flow_ratio'] = feat['net_flow'] / (
    feat['total_credit'].fillna(0) + feat['total_debit'].fillna(0)
).replace(0, np.nan)
feat['credit_debit_ratio'] = feat['credit_count'].div(
    feat['debit_count'].replace(0, np.nan)
)

# Fan-in ratio (VERY STRONG - 2.7x counterparty diversity)
feat['fan_in_ratio'] = feat['credit_counterparties'].div(
    feat['credit_count'].replace(0, np.nan)
)
feat['fan_out_ratio'] = feat['debit_counterparties'].div(
    feat['debit_count'].replace(0, np.nan)
)

# Sender concentration
top_sender = credits.groupby(['account_id', 'counterparty_id'])[
    'amount'].sum().reset_index()
top_sender = top_sender.groupby('account_id')['amount'].max().reset_index()
top_sender.columns = ['account_id', 'max_single_sender_amount']
feat = feat.merge(top_sender, on='account_id', how='left')
feat['sender_concentration'] = feat['max_single_sender_amount'].div(
    feat['total_credit'].replace(0, np.nan)
)
print("✓ concentration features")

# Fill nulls
fill_zero_cols = ['txn_count', 'total_credit', 'credit_count',
                  'total_debit', 'debit_count', 'unique_counterparties',
                  'credit_counterparties', 'debit_counterparties',
                  'txn_velocity', 'active_days']
feat[fill_zero_cols] = feat[fill_zero_cols].fillna(0)

# ============================================================
# SECTION 5 — STRUCTURING & ROUND AMOUNT FEATURES (TASK 4C)
# ============================================================

print("\n" + "="*60)
print("SECTION 5 — STRUCTURING & ROUND AMOUNT FEATURES")
print("="*60)

pos_txn = transactions[transactions['amount'] > 0].copy()

# Structuring bands (VERY STRONG SIGNAL)
pos_txn['in_40k_50k'] = pos_txn['amount'].between(40000, 50000)
pos_txn['in_90k_1L']  = pos_txn['amount'].between(90000, 100000)
pos_txn['in_45L_5L']  = pos_txn['amount'].between(450000, 500000)

struct = pos_txn.groupby('account_id').agg(
    structuring_40k_50k_count = ('in_40k_50k', 'sum'),
    structuring_90k_1L_count  = ('in_90k_1L',  'sum'),
    structuring_45L_5L_count  = ('in_45L_5L',  'sum'),
    total_txn_count           = ('transaction_id', 'count'),
).reset_index()

struct['structuring_40k_50k_pct'] = (
    struct['structuring_40k_50k_count'] /
    struct['total_txn_count'].replace(0, np.nan)
)
struct['structuring_90k_1L_pct'] = (
    struct['structuring_90k_1L_count'] /
    struct['total_txn_count'].replace(0, np.nan)
)
print("✓ structuring features")

# Specific amount concentration (MEDIUM SIGNAL)
specific_amounts = [1000, 5000, 10000, 25000, 50000, 100000]
for amt in specific_amounts:
    col = f'amt_exact_{int(amt/1000)}k'
    pos_txn[col] = (pos_txn['amount'] == amt)

specific_agg = pos_txn.groupby('account_id').agg(
    amt_exact_1k   = ('amt_exact_1k',   'sum'),
    amt_exact_5k   = ('amt_exact_5k',   'sum'),
    amt_exact_10k  = ('amt_exact_10k',  'sum'),
    amt_exact_25k  = ('amt_exact_25k',  'sum'),
    amt_exact_50k  = ('amt_exact_50k',  'sum'),
    amt_exact_100k = ('amt_exact_100k', 'sum'),
).reset_index()

specific_agg = specific_agg.merge(
    struct[['account_id', 'total_txn_count']], on='account_id'
)
for amt_col in ['amt_exact_1k', 'amt_exact_5k', 'amt_exact_10k',
                'amt_exact_25k', 'amt_exact_50k', 'amt_exact_100k']:
    specific_agg[f'{amt_col}_pct'] = (
        specific_agg[amt_col] /
        specific_agg['total_txn_count'].replace(0, np.nan)
    )
print("✓ specific amount features")

# Round amount score
pos_txn['is_round_1k'] = (pos_txn['amount'] % 1000 == 0)
pos_txn['is_round_500'] = (pos_txn['amount'] % 500 == 0)

round_agg = pos_txn.groupby('account_id').agg(
    round_1k_count  = ('is_round_1k',  'sum'),
    round_500_count = ('is_round_500', 'sum'),
    total_pos_count = ('transaction_id', 'count'),
).reset_index()

round_agg['round_1k_pct']  = (
    round_agg['round_1k_count'] /
    round_agg['total_pos_count'].replace(0, np.nan)
)
round_agg['round_500_pct'] = (
    round_agg['round_500_count'] /
    round_agg['total_pos_count'].replace(0, np.nan)
)
print("✓ round amount features")

# Merge structuring features
feat = feat.merge(struct.drop(columns='total_txn_count'),
                  on='account_id', how='left')
feat = feat.merge(specific_agg.drop(columns='total_txn_count'),
                  on='account_id', how='left')
feat = feat.merge(round_agg.drop(columns='total_pos_count'),
                  on='account_id', how='left')

# ============================================================
# SECTION 6 — CHANNEL & TIME-BASED FEATURES (TASK 4D-4E)
# ============================================================

print("\n" + "="*60)
print("SECTION 6 — CHANNEL & TIME-BASED FEATURES")
print("="*60)

# Channel distribution features
channel_dist = transactions.groupby(['account_id', 'channel']).size().unstack(fill_value=0)
channel_cols = [col for col in channel_dist.columns if col in 
               ['NTD', 'ATW', 'CHQ', 'UPI', 'UPC', 'UPD']]

for col in channel_cols:
    if col in channel_dist.columns:
        feat[f'ch_{col.lower()}_count'] = channel_dist[col].reindex(feat['account_id'], fill_value=0).values
        feat[f'ch_{col.lower()}_pct'] = feat[f'ch_{col.lower()}_count'] / feat['txn_count'].replace(0, np.nan)

print("✓ channel features")

# Time-based features
transactions['hour'] = transactions['transaction_timestamp'].dt.hour
within_6h = ((transactions['hour'] >= 6) & (transactions['hour'] <= 12)).astype(int)

# Create temporary column for aggregation
transactions['within_6h'] = within_6h

time_agg = transactions.groupby('account_id').agg({
    'within_6h': lambda x: x.mean() * 100,
    'transaction_timestamp': lambda x: len(x) / max((x.max() - x.min()).days, 1),
}).rename(columns={
    'within_6h': 'pct_within_6h',
    'transaction_timestamp': 'txn_per_day'
}).reset_index()

feat = feat.merge(time_agg, on='account_id', how='left')
print("✓ time-based features")

# Monthly transaction variance
monthly_txns = transactions.groupby([
    transactions['account_id'],
    transactions['transaction_timestamp'].dt.to_period('M')
]).size().unstack(fill_value=0)

monthly_cv = {}
for acc_id in monthly_txns.index:
    if monthly_txns.loc[acc_id].sum() > 0:
        mean_val = monthly_txns.loc[acc_id].mean()
        std_val = monthly_txns.loc[acc_id].std()
        monthly_cv[acc_id] = std_val / mean_val if mean_val > 0 else 0
    else:
        monthly_cv[acc_id] = 0

feat['monthly_cv'] = feat['account_id'].map(monthly_cv).fillna(0)
print("✓ monthly coefficient of variation")

# ============================================================
# SECTION 7 — ADVANCED FEATURES (TASK 4F-4G)
# ============================================================

print("\n" + "="*60)
print("SECTION 7 — ADVANCED FEATURES")
print("="*60)

# Passthrough transactions
transactions['passthrough'] = (
    (transactions['amount'] > 10000) & 
    (transactions['amount'] < 1000000)
).astype(int)

passthrough_agg = transactions.groupby('account_id').agg(
    passthrough_count = ('passthrough', 'sum'),
    passthrough_hours = ('transaction_timestamp', 'count'),
).reset_index()

passthrough_agg['mean_passthrough_hours'] = passthrough_agg['passthrough_hours'].fillna(0)
feat = feat.merge(passthrough_agg[['account_id', 'mean_passthrough_hours']], 
                  on='account_id', how='left')
print("✓ passthrough features")

# Mobile spike ratio (abrupt increase)
transactions['is_mobile'] = transactions['channel'].isin(['UPI', 'UPC', 'UPD']).astype(int)
daily_mobile = transactions.groupby([
    transactions['account_id'],
    transactions['transaction_timestamp'].dt.date
])['is_mobile'].sum().reset_index()

mobile_spike = {}
for acc_id in feat['account_id']:
    acc_txns = daily_mobile[daily_mobile['account_id'] == acc_id]['is_mobile']
    if len(acc_txns) > 1:
        max_day = acc_txns.max()
        avg_day = acc_txns.mean()
        mobile_spike[acc_id] = max_day / (avg_day + 0.1)
    else:
        mobile_spike[acc_id] = 0

feat['mobile_spike_ratio'] = feat['account_id'].map(mobile_spike).fillna(0)
print("✓ mobile_spike_ratio")

# Channel entropy
channel_entropy = {}
for acc_id in feat['account_id']:
    acc_channels = transactions[transactions['account_id'] == acc_id]['channel'].value_counts()
    if len(acc_channels) > 0:
        probs = acc_channels / acc_channels.sum()
        entropy = -np.sum(probs * np.log2(probs + 1e-10))
        channel_entropy[acc_id] = entropy
    else:
        channel_entropy[acc_id] = 0

feat['channel_entropy'] = feat['account_id'].map(channel_entropy).fillna(0)
print("✓ channel_entropy")

# ============================================================
# SECTION 8 — FINALIZE & VALIDATE
# ============================================================

print("\n" + "="*60)
print("SECTION 8 — FINALIZE & VALIDATE")
print("="*60)

# Fill any remaining nulls
feat = feat.fillna(0)

# Remove intermediate columns
feat = feat.drop(columns=['first_txn', 'last_txn'], errors='ignore')

print(f"\n✓ Feature shape: {feat.shape}")
print(f"✓ Null values: {feat.isnull().sum().sum()}")
print(f"✓ Columns: {len(feat.columns)}")

# Statistics
print("\nFeature Statistics:")
labeled = feat[feat['is_mule'].notna()]
print(f"  Labeled accounts: {len(labeled)}")
print(f"  Mules: {labeled['is_mule'].sum()}")
print(f"  Legitimate: {(labeled['is_mule'] == 0).sum()}")

key_features = ['is_frozen', 'avg_balance', 'txn_count', 'unique_counterparties',
               'fan_in_ratio', 'net_flow', 'structuring_40k_50k_pct']
print("\nKey features — Mule vs Legitimate means:")
print(labeled.groupby('is_mule')[key_features].mean())

# ============================================================
# SECTION 9 — SAVE RESULTS
# ============================================================

print("\n" + "="*60)
print("SECTION 9 — SAVE RESULTS")
print("="*60)

feat.to_csv(f"{CONFIG['output_path']}features_combined.csv", index=False)
print(f"✓ Saved: {CONFIG['output_path']}features_combined.csv")

# Save summary
with open(f"{CONFIG['output_path']}features_summary.txt", 'w') as f:
    f.write("="*60 + "\n")
    f.write("FEATURE ENGINEERING SUMMARY\n")
    f.write("="*60 + "\n\n")
    f.write(f"Total features: {len(feat.columns)}\n")
    f.write(f"Total accounts: {len(feat)}\n")
    f.write(f"Labeled accounts: {len(labeled)}\n")
    f.write(f"Mules: {labeled['is_mule'].sum()}\n")
    f.write(f"Legitimate: {(labeled['is_mule'] == 0).sum()}\n")
    f.write("\nFeature columns:\n")
    for i, col in enumerate(feat.columns, 1):
        f.write(f"  {i:3d}. {col}\n")

print(f"✓ Saved: {CONFIG['output_path']}features_summary.txt")

print("\n" + "="*60)
print("FEATURE EXTRACTION PIPELINE COMPLETE")
print("="*60)
print(f"Features created: {len(feat.columns)}")
print(f"Output saved to: {CONFIG['output_path']}")
