You are a data engineering agent working on a financial crime detection hackathon.
Your task is to load, merge, and validate all datasets for further analysis.

## YOUR ENVIRONMENT
- Working directory: /home/claude (or wherever the files are located)
- All files are in CSV format
- You have access to Python with pandas, numpy available

## FILES TO LOAD

### Single files:
- customers.csv (~39,988 rows)
- accounts.csv (~40,038 rows)
- customer_account_linkage.csv (~40,038 rows)
- product_details.csv (~39,988 rows)
- train_labels.csv (~24,023 rows)
- test_accounts.csv (~16,015 rows)

### Transaction files (concatenate all into one):
- transactions_part_0.csv
- transactions_part_1.csv
- transactions_part_2.csv
- transactions_part_3.csv
- transactions_part_4.csv
- transactions_part_5.csv
(Total: ~7,424,845 rows. All files share the same schema and header.)

## STEP-BY-STEP TASKS

### Task 1 — Load All Files
- Load each CSV into a separate pandas dataframe
- Parse ALL date columns as datetime during load:
  - customers.csv: date_of_birth, relationship_start_date
  - accounts.csv: account_opening_date, last_mobile_update_date,
                  last_kyc_date, freeze_date, unfreeze_date
  - transactions: transaction_timestamp
  - train_labels.csv: mule_flag_date
- Concatenate all 6 transaction files into a single dataframe called `transactions`
- Print shape of every dataframe after loading

### Task 2 — Build the Master Account Table
Perform the following joins in order:

Step A: Start with customer_account_linkage
Step B: Join accounts on account_id → call this accounts_full
Step C: Join customers on customer_id → adds customer demographics
Step D: Join product_details on customer_id → adds product holdings
Step E: Join train_labels on account_id (LEFT join) → adds mule labels
         (test accounts won't have labels — they'll be NaN, that's expected)

Final dataframe should be called `master` with one row per account.
Print final shape and column list of master.

### Task 3 — Validate All Joins
Run these checks and print results for each:

1. NULL CHECK — count nulls in every column of master
2. DUPLICATE CHECK — confirm account_id is unique in master
3. LABEL COVERAGE — how many accounts have labels vs NaN (train vs test split)
4. MULE RATE — what % of labeled accounts are mules (is_mule == 1)?
5. TRANSACTION COVERAGE — how many unique account_ids are in transactions?
   Do all accounts in master have transactions? How many don't?
6. DATE RANGE — what is the min and max transaction_timestamp in transactions?
7. CURRENCY CHECK — what are the unique values of currency_code in accounts?
8. NEGATIVE AMOUNTS — how many transactions have negative amounts (reversals)?
9. DUPLICATE TRANSACTION IDs — are all transaction_ids unique?
10. ACCOUNT STATUS — what is the distribution of account_status in accounts?

### Task 4 — Save Outputs
- Save `master` as master.csv
- Save `transactions` as transactions_full.csv
- Print "STEP 1 COMPLETE" with a summary of:
  - Total accounts in master
  - Total transactions loaded
  - Number of training accounts (with labels)
  - Number of test accounts (without labels)
  - Mule rate in training set
  - Date range of transaction data
  - Any join issues found (unmatched accounts, high null columns, etc.)

## OUTPUT FORMAT
After every task, print a clear section header like:
  === TASK 1 COMPLETE: All files loaded ===
  === TASK 2 COMPLETE: Master table built — shape: (X, Y) ===
  etc.

If any check fails or finds unexpected results (e.g., >5% nulls in a key column,
duplicate account_ids, transactions outside the Jul 2020–Jun 2025 window),
flag it clearly with: ⚠️ WARNING: [description of issue]

## CONSTRAINTS
- Do not drop any rows during this step — preserve everything for EDA
- Do not modify any values — load as-is
- If a file is missing, raise an error immediately and stop
- Use dtype=str for all ID columns (customer_id, account_id,
  counterparty_id, transaction_id) to prevent numeric coercion

## SUCCESS CRITERIA
Step 1 is complete when:
✓ All 12 files are loaded without error
✓ master table is built with one row per account
✓ transactions_full contains all ~7.4M rows
✓ All 10 validation checks are printed with results
✓ Both output files are saved