"""
Financial Crime Detection Hackathon
Step 1: Load, Merge, and Validate All Datasets
"""

import pandas as pd
import numpy as np
import os
from pathlib import Path

# Set display options for better readability
pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)
pd.set_option('display.max_rows', 50)

# Define data directory
DATA_DIR = Path("/media/yagaven_25/coding/Data/Mule-data")

print("\n" + "="*80)
print("FINANCIAL CRIME DETECTION HACKATHON - DATA LOADING & VALIDATION")
print("="*80 + "\n")

# ==============================================================================
# TASK 1: LOAD ALL FILES
# ==============================================================================
print("="*80)
print("TASK 1: LOADING ALL FILES")
print("="*80 + "\n")

# Define date columns for each file
date_columns = {
    'customers.csv': ['date_of_birth', 'relationship_start_date'],
    'accounts.csv': ['account_opening_date', 'last_mobile_update_date', 'last_kyc_date', 'freeze_date', 'unfreeze_date'],
    'transactions': ['transaction_timestamp'],
    'train_labels.csv': ['mule_flag_date']
}

# ID columns should be treated as strings
id_columns = ['customer_id', 'account_id', 'counterparty_id', 'transaction_id']

try:
    # Load single files
    print("Loading single files...")
    
    customers = pd.read_csv(
        DATA_DIR / 'customers.csv',
        dtype={col: str for col in id_columns if col in ['customer_id']},
        parse_dates=date_columns['customers.csv']
    )
    print(f"✓ customers.csv loaded: {customers.shape}")
    
    accounts = pd.read_csv(
        DATA_DIR / 'accounts.csv',
        dtype={col: str for col in id_columns if col in ['account_id', 'customer_id']},
        parse_dates=date_columns['accounts.csv']
    )
    print(f"✓ accounts.csv loaded: {accounts.shape}")
    
    customer_account_linkage = pd.read_csv(
        DATA_DIR / 'customer_account_linkage.csv',
        dtype={'customer_id': str, 'account_id': str}
    )
    print(f"✓ customer_account_linkage.csv loaded: {customer_account_linkage.shape}")
    
    product_details = pd.read_csv(
        DATA_DIR / 'product_details.csv',
        dtype={'customer_id': str}
    )
    print(f"✓ product_details.csv loaded: {product_details.shape}")
    
    train_labels = pd.read_csv(
        DATA_DIR / 'train_labels.csv',
        dtype={'account_id': str},
        parse_dates=date_columns['train_labels.csv']
    )
    print(f"✓ train_labels.csv loaded: {train_labels.shape}")
    
    test_accounts = pd.read_csv(
        DATA_DIR / 'test_accounts.csv',
        dtype={'account_id': str}
    )
    print(f"✓ test_accounts.csv loaded: {test_accounts.shape}")
    
    # Load and concatenate transaction files
    print("\nLoading and concatenating transaction files...")
    transactions_list = []
    for i in range(6):
        trans_file = DATA_DIR / f'transactions_part_{i}.csv'
        if not trans_file.exists():
            raise FileNotFoundError(f"Missing file: {trans_file}")
        
        trans = pd.read_csv(
            trans_file,
            dtype={col: str for col in id_columns if col in ['account_id', 'counterparty_id', 'transaction_id']},
            parse_dates=date_columns['transactions']
        )
        transactions_list.append(trans)
        print(f"  ✓ transactions_part_{i}.csv loaded: {trans.shape}")
    
    transactions = pd.concat(transactions_list, ignore_index=True)
    print(f"✓ All transactions concatenated: {transactions.shape}")
    
    print("\n" + "="*80)
    print("SUMMARY OF LOADED DATAFRAMES")
    print("="*80)
    print(f"customers:                 {customers.shape}")
    print(f"accounts:                  {accounts.shape}")
    print(f"customer_account_linkage:  {customer_account_linkage.shape}")
    print(f"product_details:           {product_details.shape}")
    print(f"train_labels:              {train_labels.shape}")
    print(f"test_accounts:             {test_accounts.shape}")
    print(f"transactions (combined):   {transactions.shape}")
    
except FileNotFoundError as e:
    print(f"⚠️  ERROR: {e}")
    exit(1)
except Exception as e:
    print(f"⚠️  ERROR during file loading: {e}")
    exit(1)

print("\n=== TASK 1 COMPLETE: All files loaded ===\n")

# ==============================================================================
# TASK 2: BUILD MASTER ACCOUNT TABLE
# ==============================================================================
print("="*80)
print("TASK 2: BUILDING MASTER ACCOUNT TABLE")
print("="*80 + "\n")

try:
    # Step A: Start with customer_account_linkage
    print("Step A: Starting with customer_account_linkage...")
    master = customer_account_linkage.copy()
    print(f"  Shape: {master.shape}, Columns: {master.columns.tolist()}")
    
    # Step B: Join accounts on account_id
    print("\nStep B: Joining accounts on account_id...")
    master = master.merge(accounts, on='account_id', how='left')
    accounts_full = master.copy()
    print(f"  Shape: {master.shape}")
    
    # Check for unmatched accounts
    unmatched_accounts = master[master['account_status'].isna()].shape[0]
    if unmatched_accounts > 0:
        print(f"  ⚠️  WARNING: {unmatched_accounts} accounts from linkage not found in accounts.csv")
    
    # Step C: Join customers on customer_id
    print("\nStep C: Joining customers on customer_id...")
    master = master.merge(customers, on='customer_id', how='left')
    print(f"  Shape: {master.shape}")
    
    unmatched_customers = master[master['date_of_birth'].isna()].shape[0]
    if unmatched_customers > 0:
        print(f"  ⚠️  WARNING: {unmatched_customers} customer records not found in customers.csv")
    
    # Step D: Join product_details on customer_id
    print("\nStep D: Joining product_details on customer_id...")
    master = master.merge(product_details, on='customer_id', how='left')
    print(f"  Shape: {master.shape}")
    
    # Step E: Join train_labels on account_id (LEFT join)
    print("\nStep E: Joining train_labels on account_id (LEFT join)...")
    master = master.merge(train_labels, on='account_id', how='left')
    print(f"  Shape: {master.shape}")
    print(f"  Columns: {master.columns.tolist()}")
    
    print(f"\n=== TASK 2 COMPLETE: Master table built — shape: {master.shape} ===\n")
    
except Exception as e:
    print(f"⚠️  ERROR during master table building: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

# ==============================================================================
# TASK 3: VALIDATE ALL JOINS
# ==============================================================================
print("="*80)
print("TASK 3: VALIDATION CHECKS")
print("="*80 + "\n")

print("CHECK 1: NULL COUNT IN EVERY COLUMN")
print("-" * 80)
null_counts = master.isnull().sum()
print(null_counts[null_counts > 0].to_string() if (null_counts > 0).any() else "No nulls found")
print(f"\nTotal cells: {master.shape[0] * master.shape[1]}")
print(f"Total nulls: {master.isnull().sum().sum()}")
null_pct = (master.isnull().sum().sum() / (master.shape[0] * master.shape[1])) * 100
print(f"Null percentage: {null_pct:.2f}%")

# Identify columns with high null rates
high_null_cols = null_counts[null_counts / len(master) > 0.05]
if len(high_null_cols) > 0:
    print(f"⚠️  WARNING: Columns with >5% nulls:")
    for col in high_null_cols.index:
        null_rate = (null_counts[col] / len(master)) * 100
        print(f"  - {col}: {null_rate:.2f}%")

print("\n" + "="*80)
print("CHECK 2: DUPLICATE ACCOUNT_IDS")
print("-" * 80)
duplicate_accounts = master['account_id'].duplicated().sum()
if duplicate_accounts > 0:
    print(f"⚠️  WARNING: {duplicate_accounts} duplicate account_ids found!")
else:
    print(f"✓ All {len(master)} account_ids are unique")

print("\n" + "="*80)
print("CHECK 3: LABEL COVERAGE (Train vs Test Split)")
print("-" * 80)
labeled_accounts = master['is_mule'].notna().sum()
unlabeled_accounts = master['is_mule'].isna().sum()
print(f"Training accounts (with labels):  {labeled_accounts:,} ({labeled_accounts/len(master)*100:.2f}%)")
print(f"Test accounts (no labels/NaN):    {unlabeled_accounts:,} ({unlabeled_accounts/len(master)*100:.2f}%)")
print(f"Total accounts in master:         {len(master):,}")

print("\n" + "="*80)
print("CHECK 4: MULE RATE IN TRAINING SET")
print("-" * 80)
mule_accounts = master[master['is_mule'] == 1].shape[0]
non_mule_accounts = master[master['is_mule'] == 0].shape[0]
labeled_total = mule_accounts + non_mule_accounts

if labeled_total > 0:
    mule_rate = (mule_accounts / labeled_total) * 100
    print(f"Mule accounts (is_mule=1):       {mule_accounts:,}")
    print(f"Non-mule accounts (is_mule=0):  {non_mule_accounts:,}")
    print(f"Mule rate in training set:       {mule_rate:.2f}%")
    
    if mule_rate < 1 or mule_rate > 50:
        print(f"  ⚠️  NOTE: Mule rate is {mule_rate:.2f}% (unusual distribution)")
else:
    print("⚠️  WARNING: No labeled accounts found!")

print("\n" + "="*80)
print("CHECK 5: TRANSACTION COVERAGE")
print("-" * 80)
unique_trans_accounts = transactions['account_id'].nunique()
print(f"Unique account_ids in transactions:  {unique_trans_accounts:,}")

master_accounts_set = set(master['account_id'].unique())
trans_accounts_set = set(transactions['account_id'].unique())

accounts_with_transactions = trans_accounts_set.intersection(master_accounts_set)
accounts_without_transactions = master_accounts_set - trans_accounts_set

print(f"Master accounts with transactions:   {len(accounts_with_transactions):,}")
print(f"Master accounts WITHOUT transactions: {len(accounts_without_transactions):,}")
print(f"  ({len(accounts_without_transactions)/len(master)*100:.2f}% of master accounts)")

# Check for transactions from unknown accounts
unknown_accounts = trans_accounts_set - master_accounts_set
if len(unknown_accounts) > 0:
    print(f"⚠️  WARNING: {len(unknown_accounts)} account_ids in transactions not in master!")

print("\n" + "="*80)
print("CHECK 6: DATE RANGE OF TRANSACTIONS")
print("-" * 80)
min_date = transactions['transaction_timestamp'].min()
max_date = transactions['transaction_timestamp'].max()
print(f"Min transaction date:  {min_date}")
print(f"Max transaction date:  {max_date}")
print(f"Date range span:       {(max_date - min_date).days} days")

print("\n" + "="*80)
print("CHECK 7: CURRENCY CODES")
print("-" * 80)
currency_dist = master['currency_code'].value_counts()
print(currency_dist)

if master['currency_code'].isna().sum() > 0:
    print(f"⚠️  WARNING: {master['currency_code'].isna().sum()} null currency codes")

print("\n" + "="*80)
print("CHECK 8: NEGATIVE TRANSACTION AMOUNTS (Reversals)")
print("-" * 80)
negative_transactions = (transactions['amount'] < 0).sum()
total_transactions = len(transactions)
print(f"Transactions with negative amounts:  {negative_transactions:,}")
print(f"Percentage of all transactions:      {negative_transactions/total_transactions*100:.2f}%")

print("\n" + "="*80)
print("CHECK 9: DUPLICATE TRANSACTION IDS")
print("-" * 80)
duplicate_trans = transactions['transaction_id'].duplicated().sum()
if duplicate_trans > 0:
    print(f"⚠️  WARNING: {duplicate_trans} duplicate transaction_ids found!")
else:
    print(f"✓ All {len(transactions):,} transaction_ids are unique")

print("\n" + "="*80)
print("CHECK 10: ACCOUNT STATUS DISTRIBUTION")
print("-" * 80)
account_status_dist = master['account_status'].value_counts(dropna=False)
print(account_status_dist)

print("\n=== TASK 3 COMPLETE: All validation checks completed ===\n")

# ==============================================================================
# TASK 4: SAVE OUTPUTS
# ==============================================================================
print("="*80)
print("TASK 4: SAVING OUTPUTS")
print("="*80 + "\n")

try:
    # Save master table
    master_output = DATA_DIR / 'master.csv'
    master.to_csv(master_output, index=False)
    print(f"✓ Saved master.csv: {master_output}")
    print(f"  Shape: {master.shape}")
    
    # Save transactions
    transactions_output = DATA_DIR / 'transactions_full.csv'
    transactions.to_csv(transactions_output, index=False)
    print(f"✓ Saved transactions_full.csv: {transactions_output}")
    print(f"  Shape: {transactions.shape}")
    
except Exception as e:
    print(f"⚠️  ERROR saving files: {e}")
    exit(1)

print("\n=== TASK 4 COMPLETE: All outputs saved ===\n")

# ==============================================================================
# FINAL SUMMARY
# ==============================================================================
print("="*80)
print("STEP 1 COMPLETE - FINAL SUMMARY")
print("="*80)
print(f"""
DATASET OVERVIEW:
  Total accounts in master:        {len(master):,}
  Total transactions loaded:       {len(transactions):,}
  Training accounts (labeled):     {labeled_accounts:,}
  Test accounts (unlabeled):       {unlabeled_accounts:,}
  Mule rate in training set:       {mule_rate:.2f}% ({mule_accounts:,} mules)
  
TRANSACTION DATA:
  Date range:                      {min_date.date()} to {max_date.date()}
  Date span:                       {(max_date - min_date).days} days
  Unique account_ids:              {unique_trans_accounts:,}
  
DATA QUALITY:
  Master table shape:              {master.shape[0]:,} rows × {master.shape[1]} columns
  Transactions shape:              {transactions.shape[0]:,} rows × {transactions.shape[1]} columns
  
COVERAGE:
  Accounts with transactions:      {len(accounts_with_transactions):,} ({len(accounts_with_transactions)/len(master)*100:.2f}%)
  Accounts without transactions:   {len(accounts_without_transactions):,} ({len(accounts_without_transactions)/len(master)*100:.2f}%)

KEY FILES SAVED:
  - master.csv: Master account table with all attributes and labels
  - transactions_full.csv: Combined transaction data
""")

print("="*80)
print("✓ DATA LOADING AND VALIDATION COMPLETE")
print("="*80 + "\n")
