You are a software engineer. Combine all GNN code from
GNN-2, GNN-3, GNN-4 into one clean production script.

Save the complete script to:
  Mule-data/gnn/mule_gnn_pipeline.py

The script must have these clearly commented sections:

# ============================================================
# SECTION 1 — IMPORTS & CONFIG
# ============================================================

# ============================================================
# SECTION 2 — LOAD DATA
# ============================================================

# ============================================================
# SECTION 3 — BUILD GRAPH
# ============================================================

# ============================================================
# SECTION 4 — MODEL DEFINITION
# ============================================================

# ============================================================
# SECTION 5 — TRAINING
# ============================================================

# ============================================================
# SECTION 6 — PREDICTION & ENSEMBLE
# ============================================================

# ============================================================
# SECTION 7 — SAVE RESULTS
# ============================================================

Requirements for the script:
- All config at the top in a CONFIG dict:
  CONFIG = {
      'hidden_channels': 128,
      'out_channels':    64,
      'dropout':         0.3,
      'learning_rate':   0.001,
      'epochs':          200,
      'random_seed':     42,
      'txn_cutoff_date': '2023-07-01',
      'node_features': [
          'is_frozen', 'unique_counterparties',
          'monthly_cv', 'structuring_40k_50k_pct',
          'pct_within_6h', 'ch_ntd_pct', 'ch_atw_pct',
          'ch_chq_pct', 'avg_txn_amount',
          'sender_concentration', 'mobile_spike_ratio',
          'days_since_kyc', 'fan_in_ratio',
          'amt_exact_50k_pct', 'avg_balance',
          'avg_balance_negative', 'kyc_doc_count',
          'kyc_non_compliant', 'account_age_days',
          'total_credit', 'net_flow',
          'credit_debit_ratio', 'mean_passthrough_hours',
          'channel_entropy', 'lgbm_score'
      ],
      'data_path':   'Mule-data/',
      'output_path': 'Mule-data/gnn/',
  }

- Main function at the bottom:
  if __name__ == '__main__':
      main()

- Print progress at every major step

- Final print at the end:
  print("GNN PIPELINE COMPLETE")
  print(f"LightGBM AUC:  X.XXXX")
  print(f"GNN AUC:       X.XXXX")
  print(f"Ensemble AUC:  X.XXXX")
  print(f"Saved to: Mule-data/gnn/")

After saving, verify the file exists and print line count:
import os
path = 'Mule-data/gnn/mule_gnn_pipeline.py'
with open(path) as f:
    lines = f.readlines()
print(f"Script saved: {len(lines)} lines")

=== GNN-5 COMPLETE ===