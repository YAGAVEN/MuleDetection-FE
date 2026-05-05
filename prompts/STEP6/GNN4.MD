You are a machine learning engineer. Generate final predictions
by ensembling GNN + LightGBM scores.

## SETUP
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv
from sklearn.metrics import roc_auc_score
import numpy as np
import pandas as pd
import pickle

## LOAD EVERYTHING
graph = torch.load('Mule-data/gnn/graph.pt')
device = torch.device('cpu')

with open('Mule-data/models/final_results.pkl', 'rb') as f:
    lgbm = pickle.load(f)
with open('Mule-data/models/prep_data.pkl', 'rb') as f:
    prep = pickle.load(f)
with open('Mule-data/gnn/training_history.pkl', 'rb') as f:
    history = pickle.load(f)

## RELOAD MODEL
class MuleGNN(nn.Module):
    def __init__(self, in_channels, hidden_channels,
                 out_channels, dropout=0.3):
        super(MuleGNN, self).__init__()
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, hidden_channels)
        self.conv3 = SAGEConv(hidden_channels, out_channels)
        self.dropout = dropout
        self.classifier = nn.Linear(out_channels, 1)

    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)
        x = self.conv3(x, edge_index)
        x = F.relu(x)
        out = self.classifier(x)
        return torch.sigmoid(out).squeeze(-1)

model = MuleGNN(
    in_channels     = graph.num_node_features,
    hidden_channels = 128,
    out_channels    = 64,
    dropout         = 0.3
)
model.load_state_dict(
    torch.load('Mule-data/gnn/best_model.pt',
               map_location=device))
model.eval()

## GET GNN PREDICTIONS FOR ALL ACCOUNT NODES
graph = graph.to(device)
with torch.no_grad():
    all_preds = model(graph.x, graph.edge_index).cpu().numpy()

# Only keep account node predictions (first 40,038)
n_accounts   = len(graph.account_ids)
gnn_preds    = all_preds[:n_accounts]

gnn_df = pd.DataFrame({
    'account_id': graph.account_ids,
    'gnn_score':  gnn_preds
})

## GNN PERFORMANCE ON TRAINING SET
features = pd.read_csv('Mule-data/features.csv',
           dtype={'account_id': str})
gnn_df = gnn_df.merge(
    features[['account_id', 'is_mule']],
    on='account_id', how='left')

train_gnn = gnn_df[gnn_df['is_mule'].notna()]
gnn_auc   = roc_auc_score(
    train_gnn['is_mule'], train_gnn['gnn_score'])
print(f"GNN AUC on training set:     {gnn_auc:.4f}")
print(f"LightGBM AUC on training set:{lgbm['oof_auc']:.4f}")

## ENSEMBLE PREDICTIONS
# Weighted average — weight by AUC performance
lgbm_weight = lgbm['oof_auc']
gnn_weight  = gnn_auc
total_weight = lgbm_weight + gnn_weight

lgbm_scores = pd.DataFrame({
    'account_id': np.concatenate([
        prep['train_account_ids'],
        prep['test_account_ids']]),
    'lgbm_score': np.concatenate([
        lgbm['oof_preds'],
        lgbm['test_preds']])
})

ensemble_df = gnn_df[['account_id', 'gnn_score']].merge(
    lgbm_scores, on='account_id', how='left')

ensemble_df['ensemble_score'] = (
    (ensemble_df['lgbm_score'] * lgbm_weight) +
    (ensemble_df['gnn_score']  * gnn_weight)
) / total_weight

## ENSEMBLE PERFORMANCE
ensemble_train = ensemble_df.merge(
    features[['account_id','is_mule']],
    on='account_id').dropna(subset=['is_mule'])
ensemble_auc = roc_auc_score(
    ensemble_train['is_mule'],
    ensemble_train['ensemble_score'])

print(f"\nModel Comparison:")
print(f"  LightGBM AUC: {lgbm['oof_auc']:.4f}")
print(f"  GNN AUC:      {gnn_auc:.4f}")
print(f"  Ensemble AUC: {ensemble_auc:.4f}")
print(f"\nWeights used:")
print(f"  LightGBM: {lgbm_weight/total_weight:.2%}")
print(f"  GNN:      {gnn_weight/total_weight:.2%}")

## SAVE ENSEMBLE PREDICTIONS
ensemble_df.to_csv(
    'Mule-data/gnn/ensemble_predictions.csv', index=False)

with open('Mule-data/gnn/ensemble_results.pkl', 'wb') as f:
    pickle.dump({
        'ensemble_df':  ensemble_df,
        'gnn_auc':      gnn_auc,
        'ensemble_auc': ensemble_auc,
        'lgbm_weight':  lgbm_weight,
        'gnn_weight':   gnn_weight,
    }, f)

print("\nSaved: Mule-data/gnn/ensemble_predictions.csv")
print("Saved: Mule-data/gnn/ensemble_results.pkl")
print("\n=== GNN-4 COMPLETE ===")
print(f"Final Ensemble AUC: {ensemble_auc:.4f}")