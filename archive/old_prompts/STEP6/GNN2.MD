You are a machine learning engineer building a fraud detection GNN.

## CONTEXT
- 40,038 bank accounts, 263 mules (1.09%)
- Transactions between accounts and counterparties
- Already have 36 engineered features per account
- LightGBM predictions available as extra feature

## LOAD DATA
import pandas as pd
import numpy as np
import torch
import pickle
import os

os.makedirs('Mule-data/gnn', exist_ok=True)

features = pd.read_csv('Mule-data/features.csv',
           dtype={'account_id': str})
transactions = pd.read_csv('Mule-data/transactions_full.csv',
               dtype={'account_id': str, 'counterparty_id': str,
                      'transaction_id': str},
               parse_dates=['transaction_timestamp'])

with open('Mule-data/models/final_results.pkl', 'rb') as f:
    lgbm = pickle.load(f)
with open('Mule-data/models/prep_data.pkl', 'rb') as f:
    prep = pickle.load(f)

# Add LightGBM scores to features
lgbm_scores = pd.DataFrame({
    'account_id': np.concatenate([
        prep['train_account_ids'],
        prep['test_account_ids']]),
    'lgbm_score': np.concatenate([
        lgbm['oof_preds'],
        lgbm['test_preds']])
})
features = features.merge(lgbm_scores, on='account_id', how='left')

## BUILD NODE INDEX
all_accounts = features['account_id'].tolist()
all_cps = list(set(
    transactions['counterparty_id'].dropna().tolist()
) - set(all_accounts))

all_nodes  = all_accounts + all_cps
node_index = {n: i for i, n in enumerate(all_nodes)}

print(f"Account nodes:      {len(all_accounts)}")
print(f"Counterparty nodes: {len(all_cps)}")
print(f"Total nodes:        {len(all_nodes)}")

## NODE FEATURES
NODE_FEATURES = [
    'is_frozen', 'unique_counterparties', 'monthly_cv',
    'structuring_40k_50k_pct', 'pct_within_6h',
    'ch_ntd_pct', 'ch_atw_pct', 'ch_chq_pct',
    'avg_txn_amount', 'sender_concentration',
    'mobile_spike_ratio', 'days_since_kyc',
    'fan_in_ratio', 'amt_exact_50k_pct',
    'avg_balance', 'avg_balance_negative',
    'kyc_doc_count', 'kyc_non_compliant',
    'account_age_days', 'total_credit',
    'net_flow', 'credit_debit_ratio',
    'mean_passthrough_hours', 'channel_entropy',
    'lgbm_score'
]
NODE_FEATURES = [f for f in NODE_FEATURES
                 if f in features.columns]

# Account node features
acc_feat = features.set_index('account_id')[NODE_FEATURES]
acc_feat = acc_feat.reindex(all_accounts).fillna(0)

# Counterparty node features (from transaction aggregates)
cp_agg = transactions.groupby('counterparty_id').agg(
    avg_amount     = ('amount', 'mean'),
    total_amount   = ('amount', 'sum'),
    unique_accs    = ('account_id', 'nunique'),
    txn_count      = ('transaction_id', 'count'),
).reindex(all_cps).fillna(0)

# Pad counterparty features to same width as account features
cp_feat = pd.DataFrame(
    0.0, index=all_cps, columns=NODE_FEATURES)
cp_feat['avg_txn_amount']       = cp_agg['avg_amount'].values
cp_feat['total_credit']         = cp_agg['total_amount'].values
cp_feat['unique_counterparties']= cp_agg['unique_accs'].values

# Stack and normalize
from sklearn.preprocessing import StandardScaler
all_feat = pd.concat([acc_feat, cp_feat])
X_nodes  = StandardScaler().fit_transform(all_feat.values)
X_nodes  = torch.tensor(X_nodes, dtype=torch.float32)
print(f"Node features: {X_nodes.shape}")

## BUILD EDGES
# Use last 2 years only to limit memory
txn = transactions[
    transactions['transaction_timestamp'] >= '2023-07-01'
].copy()

src, dst, edge_weights = [], [], []

for _, row in txn.iterrows():
    acc = row['account_id']
    cp  = row['counterparty_id']
    if pd.isna(cp): continue
    if acc not in node_index: continue
    if cp  not in node_index: continue

    src.append(node_index[acc])
    dst.append(node_index[cp])
    edge_weights.append(abs(row['amount']))

edge_index = torch.tensor([src, dst], dtype=torch.long)
edge_attr  = torch.tensor(edge_weights,
             dtype=torch.float32).unsqueeze(1)
print(f"Edges: {edge_index.shape[1]}")

## BUILD LABELS & MASKS
labels = features.set_index('account_id')['is_mule']
y = torch.tensor(
    labels.reindex(all_accounts).fillna(-1).values,
    dtype=torch.float32)

train_mask = torch.tensor(
    [labels.reindex(all_accounts).notna().values[i]
     for i in range(len(all_accounts))],
    dtype=torch.bool)
test_mask = ~train_mask

print(f"Train nodes: {train_mask.sum()}")
print(f"Test nodes:  {test_mask.sum()}")
print(f"Mule nodes:  {(y == 1).sum()}")

## SAVE GRAPH
from torch_geometric.data import Data
graph = Data(
    x          = X_nodes,
    edge_index = edge_index,
    edge_attr  = edge_attr,
    y          = y,
)
graph.train_mask = train_mask
graph.test_mask  = test_mask
graph.account_ids = all_accounts

torch.save(graph, 'Mule-data/gnn/graph.pt')
print("Saved: Mule-data/gnn/graph.pt")
print(f"\n=== GNN-2 COMPLETE ===")
print(f"Nodes: {graph.num_nodes}")
print(f"Edges: {graph.num_edges}")
print(f"Features per node: {graph.num_node_features}")