#!/usr/bin/env python3
"""
GNN Pipeline — Complete Graph Neural Network for fraud detection
Combines GNN-2, GNN-3, GNN-4 into one clean production script
"""

import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.data import Data
from torch_geometric.nn import SAGEConv
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score
import pickle
import os
import warnings
warnings.filterwarnings('ignore')

# ============================================================
# SECTION 1 — IMPORTS & CONFIG
# ============================================================

CONFIG = {
    'hidden_channels': 128,
    'out_channels': 64,
    'dropout': 0.3,
    'learning_rate': 0.001,
    'epochs': 200,
    'random_seed': 42,
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
    'data_path': 'Mule-data/',
    'output_path': 'Mule-data/gnn/',
}

os.makedirs(CONFIG['output_path'], exist_ok=True)
np.random.seed(CONFIG['random_seed'])
torch.manual_seed(CONFIG['random_seed'])

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"✓ Using device: {device}")

# ============================================================
# SECTION 2 — LOAD DATA (GNN-2 PART 1)
# ============================================================

print("\n" + "="*60)
print("SECTION 2 — LOAD DATA")
print("="*60)

features = pd.read_csv(f"{CONFIG['data_path']}features_combined.csv",
                       dtype={'account_id': str})
transactions = pd.read_csv(
    f"{CONFIG['data_path']}transactions_full.csv",
    dtype={'account_id': str, 'counterparty_id': str,
           'transaction_id': str},
    parse_dates=['transaction_timestamp']
)

print(f"✓ Features: {features.shape}")
print(f"✓ Transactions: {transactions.shape}")

# Load LightGBM results
with open(f"{CONFIG['data_path']}models/final_results.pkl", 'rb') as f:
    lgbm_results = pickle.load(f)
with open(f"{CONFIG['data_path']}models/prep_data.pkl", 'rb') as f:
    prep_data = pickle.load(f)

print(f"✓ LightGBM OOF AUC: {lgbm_results['oof_auc']:.4f}")

# Add LightGBM scores to features
lgbm_scores = pd.DataFrame({
    'account_id': np.concatenate([
        prep_data['train_account_ids'],
        prep_data['test_account_ids']
    ]),
    'lgbm_score': np.concatenate([
        lgbm_results['oof_preds'],
        lgbm_results['test_preds']
    ])
})
features = features.merge(lgbm_scores, on='account_id', how='left')
print(f"✓ Added LightGBM scores to features")

# ============================================================
# SECTION 3 — BUILD GRAPH (GNN-2 PART 2)
# ============================================================

print("\n" + "="*60)
print("SECTION 3 — BUILD GRAPH")
print("="*60)

# Node indices
all_accounts = features['account_id'].tolist()
all_cps = list(set(
    transactions['counterparty_id'].dropna().tolist()
) - set(all_accounts))

all_nodes  = all_accounts + all_cps
node_index = {n: i for i, n in enumerate(all_nodes)}

print(f"✓ Account nodes: {len(all_accounts)}")
print(f"✓ Counterparty nodes: {len(all_cps)}")
print(f"✓ Total nodes: {len(all_nodes)}")

# Node features
NODE_FEATURES = [f for f in CONFIG['node_features']
                if f in features.columns]
print(f"✓ Using {len(NODE_FEATURES)} node features")

# Account node features
acc_feat = features.set_index('account_id')[NODE_FEATURES]
acc_feat = acc_feat.reindex(all_accounts).fillna(0)

# Counterparty node features
cp_agg = transactions.groupby('counterparty_id').agg(
    avg_amount  = ('amount', 'mean'),
    total_amount = ('amount', 'sum'),
    unique_accs = ('account_id', 'nunique'),
    txn_count   = ('transaction_id', 'count'),
).reindex(all_cps).fillna(0)

cp_feat = pd.DataFrame(0.0, index=all_cps, columns=NODE_FEATURES)
cp_feat['avg_txn_amount'] = cp_agg['avg_amount'].values
cp_feat['total_credit'] = cp_agg['total_amount'].values
cp_feat['unique_counterparties'] = cp_agg['unique_accs'].values

# Normalize features
all_feat = pd.concat([acc_feat, cp_feat])
scaler = StandardScaler()
X_nodes = scaler.fit_transform(all_feat.values)
X_nodes = torch.tensor(X_nodes, dtype=torch.float32)
print(f"✓ Node features shape: {X_nodes.shape}")

# Build edges (use last 2 years to limit memory)
txn_filtered = transactions[
    transactions['transaction_timestamp'] >= CONFIG['txn_cutoff_date']
].copy()

src, dst, edge_weights = [], [], []

for _, row in txn_filtered.iterrows():
    acc = row['account_id']
    cp  = row['counterparty_id']
    if pd.isna(cp): 
        continue
    if acc not in node_index: 
        continue
    if cp not in node_index: 
        continue

    src.append(node_index[acc])
    dst.append(node_index[cp])
    edge_weights.append(abs(row['amount']))

edge_index = torch.tensor([src, dst], dtype=torch.long)
edge_attr = torch.tensor(edge_weights, dtype=torch.float32).unsqueeze(1)
print(f"✓ Edges: {edge_index.shape[1]}")

# Build labels and masks
labels = features.set_index('account_id')['is_mule']
y = torch.tensor(
    labels.reindex(all_accounts).fillna(-1).values,
    dtype=torch.float32
)

train_mask = torch.tensor(
    [labels.reindex(all_accounts).notna().values[i]
     for i in range(len(all_accounts))],
    dtype=torch.bool
)
test_mask = ~train_mask

print(f"✓ Train nodes: {train_mask.sum()}")
print(f"✓ Test nodes: {test_mask.sum()}")
print(f"✓ Mule nodes: {(y == 1).sum()}")

# Save graph
graph = Data(
    x=X_nodes,
    edge_index=edge_index,
    edge_attr=edge_attr,
    y=y,
)
graph.train_mask = train_mask
graph.test_mask = test_mask
graph.account_ids = all_accounts

torch.save(graph, f"{CONFIG['output_path']}graph.pt")
print(f"✓ Saved: graph.pt")

# ============================================================
# SECTION 4 — MODEL DEFINITION (GNN-3)
# ============================================================

print("\n" + "="*60)
print("SECTION 4 — MODEL DEFINITION")
print("="*60)

class MuleGNN(nn.Module):
    def __init__(self, in_channels, hidden_channels, out_channels,
                 dropout=0.3):
        super(MuleGNN, self).__init__()
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, hidden_channels)
        self.conv3 = SAGEConv(hidden_channels, out_channels)
        self.dropout = dropout
        self.classifier = nn.Linear(out_channels, 1)

    def forward(self, x, edge_index):
        # Layer 1
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)
        # Layer 2
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)
        # Layer 3
        x = self.conv3(x, edge_index)
        x = F.relu(x)
        # Output
        out = self.classifier(x)
        return torch.sigmoid(out).squeeze(-1)

model = MuleGNN(
    in_channels=graph.num_node_features,
    hidden_channels=CONFIG['hidden_channels'],
    out_channels=CONFIG['out_channels'],
    dropout=CONFIG['dropout']
).to(device)

print(f"✓ Model created")
print(f"  Layers: Input({graph.num_node_features}) → "
      f"Hidden({CONFIG['hidden_channels']}) → "
      f"Output({CONFIG['out_channels']}) → Classification")
print(f"  Parameters: {sum(p.numel() for p in model.parameters()):,}")

# ============================================================
# SECTION 5 — TRAINING (GNN-3)
# ============================================================

print("\n" + "="*60)
print("SECTION 5 — TRAINING")
print("="*60)

# Class weights for imbalance
n_mule = (graph.y[graph.train_mask] == 1).sum().item()
n_legit = (graph.y[graph.train_mask] == 0).sum().item()
pos_weight = torch.tensor([n_legit / n_mule], dtype=torch.float32).to(device)

criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
optimizer = torch.optim.Adam(model.parameters(),
                            lr=CONFIG['learning_rate'],
                            weight_decay=1e-4)
scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, patience=10, factor=0.5)

graph = graph.to(device)

print(f"✓ Training setup complete")
print(f"  Class weight (pos_weight): {pos_weight.item():.1f}")
print(f"  Optimizer: Adam (lr={CONFIG['learning_rate']})")
print(f"  Epochs: {CONFIG['epochs']}\n")

# Train/val split from training nodes
train_indices = graph.train_mask.nonzero().squeeze()
val_split = int(len(train_indices) * 0.8)
actual_train = train_indices[:val_split]
actual_val = train_indices[val_split:]

train_node_mask = torch.zeros(graph.num_nodes, dtype=torch.bool)
train_node_mask[actual_train] = True
val_node_mask = torch.zeros(graph.num_nodes, dtype=torch.bool)
val_node_mask[actual_val] = True

best_auc = 0
best_epoch = 0
train_losses = []
val_aucs = []

for epoch in range(CONFIG['epochs']):
    # TRAIN
    model.train()
    optimizer.zero_grad()
    out = model(graph.x, graph.edge_index)

    train_out = out[train_node_mask]
    train_labels = graph.y[train_node_mask]
    loss = F.binary_cross_entropy(train_out, train_labels)
    loss.backward()
    optimizer.step()

    # VALIDATE
    model.eval()
    with torch.no_grad():
        val_out = out[val_node_mask].cpu().numpy()
        val_labels = graph.y[val_node_mask].cpu().numpy()
        try:
            auc = roc_auc_score(val_labels, val_out)
        except Exception:
            auc = 0.0

    scheduler.step(loss)
    train_losses.append(loss.item())
    val_aucs.append(auc)

    if auc > best_auc:
        best_auc = auc
        best_epoch = epoch
        torch.save(model.state_dict(),
                  f"{CONFIG['output_path']}best_model.pt")

    if epoch % 20 == 0:
        print(f"Epoch {epoch:3d} | Loss: {loss.item():.4f} | "
              f"Val AUC: {auc:.4f} | Best: {best_auc:.4f} (epoch {best_epoch})")

print(f"\n✓ Training complete!")
print(f"  Best Val AUC: {best_auc:.4f} at epoch {best_epoch}")

# Save training history
history = {
    'train_losses': train_losses,
    'val_aucs': val_aucs,
    'best_auc': best_auc,
    'best_epoch': best_epoch,
}
with open(f"{CONFIG['output_path']}training_history.pkl", 'wb') as f:
    pickle.dump(history, f)

# ============================================================
# SECTION 6 — PREDICTION & ENSEMBLE (GNN-4)
# ============================================================

print("\n" + "="*60)
print("SECTION 6 — PREDICTION & ENSEMBLE")
print("="*60)

# Load best model
model.load_state_dict(torch.load(f"{CONFIG['output_path']}best_model.pt",
                                 map_location=device))
model.eval()

# Get GNN predictions for all account nodes
with torch.no_grad():
    all_preds = model(graph.x, graph.edge_index).cpu().numpy()

n_accounts = len(graph.account_ids)
gnn_preds = all_preds[:n_accounts]

gnn_df = pd.DataFrame({
    'account_id': graph.account_ids,
    'gnn_score': gnn_preds
})

# Merge with features for evaluation
gnn_df = gnn_df.merge(
    features[['account_id', 'is_mule']],
    on='account_id', how='left'
)

# GNN performance
train_gnn = gnn_df[gnn_df['is_mule'].notna()]
gnn_auc = roc_auc_score(train_gnn['is_mule'], train_gnn['gnn_score'])

print(f"✓ GNN AUC on training set:     {gnn_auc:.4f}")
print(f"✓ LightGBM AUC on training set: {lgbm_results['oof_auc']:.4f}")

# Ensemble with weighted average
lgbm_weight = lgbm_results['oof_auc']
gnn_weight = gnn_auc
total_weight = lgbm_weight + gnn_weight

lgbm_scores_df = pd.DataFrame({
    'account_id': np.concatenate([
        prep_data['train_account_ids'],
        prep_data['test_account_ids']
    ]),
    'lgbm_score': np.concatenate([
        lgbm_results['oof_preds'],
        lgbm_results['test_preds']
    ])
})

ensemble_df = gnn_df[['account_id', 'gnn_score', 'is_mule']].merge(
    lgbm_scores_df, on='account_id', how='left'
)

ensemble_df['ensemble_score'] = (
    (ensemble_df['lgbm_score'] * lgbm_weight) +
    (ensemble_df['gnn_score'] * gnn_weight)
) / total_weight

# Ensemble performance
ensemble_train = ensemble_df.dropna(subset=['is_mule'])
ensemble_auc = roc_auc_score(
    ensemble_train['is_mule'],
    ensemble_train['ensemble_score']
)

print(f"\n--- Ensemble Results ---")
print(f"✓ Weights:")
print(f"    LightGBM: {lgbm_weight/total_weight:.2%}")
print(f"    GNN:      {gnn_weight/total_weight:.2%}")

# ============================================================
# SECTION 7 — SAVE RESULTS
# ============================================================

print("\n" + "="*60)
print("SECTION 7 — SAVE RESULTS")
print("="*60)

ensemble_df.to_csv(f"{CONFIG['output_path']}ensemble_predictions.csv",
                   index=False)
print(f"✓ Saved: ensemble_predictions.csv")

with open(f"{CONFIG['output_path']}ensemble_results.pkl", 'wb') as f:
    pickle.dump({
        'ensemble_df': ensemble_df,
        'gnn_auc': gnn_auc,
        'ensemble_auc': ensemble_auc,
        'lgbm_weight': lgbm_weight,
        'gnn_weight': gnn_weight,
    }, f)
print(f"✓ Saved: ensemble_results.pkl")

# ============================================================
# SECTION 8 — FINAL SUMMARY
# ============================================================

print("\n" + "="*60)
print("GNN PIPELINE COMPLETE")
print("="*60)
print(f"\nLightGBM AUC:  {lgbm_results['oof_auc']:.4f}")
print(f"GNN AUC:       {gnn_auc:.4f}")
print(f"Ensemble AUC:  {ensemble_auc:.4f}")
print(f"\nSaved to: {CONFIG['output_path']}")

# Verify output files
output_files = [
    'graph.pt',
    'best_model.pt',
    'training_history.pkl',
    'ensemble_predictions.csv',
    'ensemble_results.pkl',
]
print(f"\nOutput files:")
for fname in output_files:
    fpath = os.path.join(CONFIG['output_path'], fname)
    if os.path.exists(fpath):
        size = os.path.getsize(fpath)
        print(f"  ✓ {fname} ({size:,} bytes)")
    else:
        print(f"  ✗ {fname} (NOT FOUND)")

print("\n" + "="*60)
print("ALL PIPELINES COMPLETE")
print("="*60)
