# GAN Endpoints Testing Guide

Complete examples for testing all 12 GAN API endpoints with real data, expected responses, and common scenarios.

**Table of Contents:**
1. [Prerequisites & Setup](#prerequisites--setup)
2. [Sample Data Preparation](#sample-data-preparation)
3. [Training Endpoints](#training-endpoints)
4. [Generation Endpoints](#generation-endpoints)
5. [Streaming Endpoints](#streaming-endpoints)
6. [Management Endpoints](#management-endpoints)
7. [Complete Workflow Examples](#complete-workflow-examples)
8. [Error Handling](#error-handling)

---

## Prerequisites & Setup

### Backend Installation
```bash
cd backend
pip install -r requirements.txt
```

### Starting the Backend
```bash
# Terminal 1: Start FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Or using the run script
./run.sh
```

### Environment Variables
```bash
# .env file in backend/
CUDA_VISIBLE_DEVICES=0  # GPU selection
LOG_LEVEL=INFO
DATA_PATH=/path/to/Mule-data
```

### API Base URL
All examples use: `http://localhost:8000/api/v1/gan`

---

## Sample Data Preparation

### Creating Sample Training Data

The GAN expects CSV data with 28 features and binary labels (0/1).

**Python: Create sample training data**
```python
import pandas as pd
import numpy as np
from pathlib import Path

# Create synthetic training data with 28 features
np.random.seed(42)
n_samples = 1000
n_features = 28

# Generate features (simulating mule detection features)
X = np.random.randn(n_samples, n_features)

# Generate binary labels (0=benign, 1=mule)
y = np.random.randint(0, 2, n_samples)

# Combine into DataFrame
df = pd.DataFrame(X, columns=[f'feature_{i}' for i in range(n_features)])
df['label'] = y

# Save to CSV
output_path = '/path/to/Mule-data/sample_training_data.csv'
df.to_csv(output_path, index=False)

print(f"Training data saved: {output_path}")
print(f"Shape: {df.shape}")
print(f"Label distribution:\n{df['label'].value_counts()}")
```

**Expected data format:**
```
feature_0,feature_1,feature_2,...,feature_27,label
0.123,0.456,0.789,...,0.321,1
-0.234,0.567,0.890,...,0.432,0
...
```

### Directory Structure
```
Mule-data/
├── gan_training/
│   ├── checkpoints/
│   ├── synthetic_data/
│   └── streaming_buffer/
├── sample_training_data.csv
└── features_combined.csv
```

---

## Training Endpoints

### 1. Start Training

**Endpoint:** `POST /train/start`

**curl example - Basic (default config):**
```bash
curl -X POST "http://localhost:8000/api/v1/gan/train/start" \
  -H "Content-Type: application/json" \
  -d '{
    "data_path": "/path/to/Mule-data/sample_training_data.csv"
  }'
```

**curl example - Custom configuration:**
```bash
curl -X POST "http://localhost:8000/api/v1/gan/train/start" \
  -H "Content-Type: application/json" \
  -d '{
    "data_path": "/path/to/Mule-data/features_combined.csv",
    "config": {
      "gan_latent_dim": 100,
      "gan_hidden_dim": 256,
      "gan_epochs": 50,
      "gan_batch_size": 32,
      "lambda_cycle": 0.5,
      "lambda_gp": 10.0,
      "synthetic_ratio": 0.3,
      "adversarial_epsilon": 0.1,
      "mixup_alpha": 0.2
    }
  }'
```

**Expected Response:**
```json
{
  "training_id": "train_20240115_143022_abc123",
  "status": "running",
  "started_at": "2024-01-15T14:30:22.123456",
  "config": {
    "gan_latent_dim": 100,
    "gan_hidden_dim": 256,
    "gan_epochs": 50,
    "gan_batch_size": 32
  }
}
```

**Python client example:**
```python
import requests
import json

url = "http://localhost:8000/api/v1/gan/train/start"
payload = {
    "data_path": "/path/to/Mule-data/features_combined.csv",
    "config": {
        "gan_epochs": 30,
        "gan_batch_size": 64
    }
}

response = requests.post(url, json=payload)
if response.status_code == 200:
    result = response.json()
    training_id = result['training_id']
    print(f"Training started: {training_id}")
    print(f"Status: {result['status']}")
else:
    print(f"Error: {response.status_code}")
    print(response.json())
```

---

### 2. Get Training Progress

**Endpoint:** `GET /train/progress/{training_id}`

**curl example:**
```bash
# Get training ID from start_training response
TRAINING_ID="train_20240115_143022_abc123"

curl -X GET "http://localhost:8000/api/v1/gan/train/progress/$TRAINING_ID"
```

**Expected Response (In Progress):**
```json
{
  "status": "training",
  "current_epoch": 15,
  "total_epochs": 50,
  "progress_percent": 30.0,
  "current_loss": 0.2845,
  "best_loss": 0.2156,
  "g_loss": 0.1523,
  "d_loss": 0.1322,
  "cycle_loss": 0.0934,
  "timestamp": "2024-01-15T14:35:45.123456",
  "estimated_remaining_secs": 420
}
```

**Expected Response (Completed):**
```json
{
  "status": "completed",
  "current_epoch": 50,
  "total_epochs": 50,
  "progress_percent": 100.0,
  "current_loss": 0.1523,
  "best_loss": 0.1423,
  "g_loss": 0.0823,
  "d_loss": 0.0700,
  "cycle_loss": 0.0612,
  "timestamp": "2024-01-15T14:45:12.789456",
  "estimated_remaining_secs": 0
}
```

**Python polling example:**
```python
import requests
import time

training_id = "train_20240115_143022_abc123"
url = f"http://localhost:8000/api/v1/gan/train/progress/{training_id}"

# Poll every 10 seconds
while True:
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        print(f"Epoch {data['current_epoch']}/{data['total_epochs']} - "
              f"Loss: {data['current_loss']:.4f} - "
              f"Progress: {data['progress_percent']}%")
        
        if data['status'] == 'completed':
            print("Training completed!")
            break
    else:
        print(f"Error: {response.status_code}")
        break
    
    time.sleep(10)
```

---

### 3. Get Training Metrics

**Endpoint:** `GET /train/metrics/{training_id}`

**curl example:**
```bash
TRAINING_ID="train_20240115_143022_abc123"

curl -X GET "http://localhost:8000/api/v1/gan/train/metrics/$TRAINING_ID"
```

**Expected Response:**
```json
{
  "inception_score": 0.8234,
  "mean_diff": 0.1523,
  "std_diff": 0.0845,
  "pairwise_dist_real": 2.3456,
  "pairwise_dist_fake": 2.2891,
  "samples_generated": 5000,
  "timestamp": "2024-01-15T14:45:12.123456"
}
```

**Metrics Interpretation:**
- **inception_score**: Higher is better (0-1, target >0.7)
- **mean_diff**: Lower is better (synthetic close to real data)
- **std_diff**: Lower is better (similar data variance)
- **pairwise_dist**: Should be similar between real/fake

---

## Generation Endpoints

### 4. Generate Synthetic Data

**Endpoint:** `POST /generate/synthetic`

**curl example - Generate 1000 samples:**
```bash
curl -X POST "http://localhost:8000/api/v1/gan/generate/synthetic" \
  -H "Content-Type: application/json" \
  -d '{
    "num_samples": 1000,
    "training_id": "train_20240115_143022_abc123"
  }'
```

**curl example - Generate with specific parameters:**
```bash
curl -X POST "http://localhost:8000/api/v1/gan/generate/synthetic" \
  -H "Content-Type: application/json" \
  -d '{
    "num_samples": 5000,
    "training_id": "train_20240115_143022_abc123",
    "use_adversarial": true,
    "use_mixup": true
  }'
```

**Expected Response:**
```json
{
  "num_samples": 1000,
  "data_shape": [1000, 28],
  "generated_at": "2024-01-15T14:50:33.456789"
}
```

**Response Details:**
- `num_samples`: Number of synthetic samples created
- `data_shape`: [samples, features] - Always 28 features
- `generated_at`: Generation timestamp (data saved to disk)

**Python client example:**
```python
import requests
import pandas as pd

url = "http://localhost:8000/api/v1/gan/generate/synthetic"
payload = {
    "num_samples": 2000,
    "training_id": "train_20240115_143022_abc123",
    "use_adversarial": True
}

response = requests.post(url, json=payload)
if response.status_code == 200:
    result = response.json()
    print(f"Generated {result['num_samples']} samples")
    print(f"Data shape: {result['data_shape']}")
    
    # Load generated data from disk
    synthetic_path = "/path/to/Mule-data/gan_training/synthetic_data/latest.npy"
    synthetic_data = pd.read_csv(synthetic_path)
    print(f"Data loaded shape: {synthetic_data.shape}")
else:
    print(f"Error: {response.status_code}")
    print(response.json())
```

---

### 5. Get Augmentation Info

**Endpoint:** `GET /generate/augment-info`

**curl example:**
```bash
curl -X GET "http://localhost:8000/api/v1/gan/generate/augment-info"
```

**Expected Response:**
```json
{
  "components": {
    "mixup_enabled": true,
    "adversarial_enabled": true,
    "cycle_consistency_enabled": true,
    "total_augmented_samples": 3500,
    "components_active": 3
  },
  "augmented_data_ready": true,
  "generated_at": "2024-01-15T14:50:33.456789"
}
```

---

## Streaming Endpoints

### 6. Initialize Streaming

**Endpoint:** `POST /streaming/init`

**curl example:**
```bash
curl -X POST "http://localhost:8000/api/v1/gan/streaming/init" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "buffer_size": 1000,
      "update_frequency": 100,
      "gan_epochs_incremental": 10
    }
  }'
```

**Expected Response:**
```json
{
  "streaming_id": "stream_20240115_145000_xyz789",
  "status": "initialized",
  "buffer_size": 1000,
  "update_frequency": 100,
  "timestamp": "2024-01-15T14:50:00.123456"
}
```

---

### 7. Process Streaming Batch

**Endpoint:** `POST /streaming/batch`

**curl example - Single batch with 32 samples:**
```bash
curl -X POST "http://localhost:8000/api/v1/gan/streaming/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "streaming_id": "stream_20240115_145000_xyz789",
    "features": [
      [0.1, -0.5, 0.3, 0.2, 0.8, -0.1, 0.4, 0.5, -0.3, 0.6, 0.2, -0.4, 0.7, 0.1, -0.2, 0.3, 0.5, -0.6, 0.4, 0.1, 0.8, -0.3, 0.2, 0.6, -0.1, 0.4, 0.3, 0.5],
      [-0.2, 0.3, -0.1, 0.4, 0.5, 0.2, -0.3, 0.1, 0.6, -0.4, 0.3, 0.5, -0.2, 0.4, 0.1, -0.5, 0.3, 0.6, 0.2, -0.1, 0.4, 0.5, -0.3, 0.2, 0.6, 0.1, -0.4, 0.3]
    ],
    "labels": [1, 0]
  }'
```

**curl example - Larger batch (Python generated):**
```bash
# First, generate batch data in Python
python3 << 'EOF'
import json
import numpy as np

# Generate 100 samples with 28 features
batch_features = np.random.randn(100, 28).tolist()
batch_labels = np.random.randint(0, 2, 100).tolist()

payload = {
    "streaming_id": "stream_20240115_145000_xyz789",
    "features": batch_features,
    "labels": batch_labels
}

# Save to file for curl
with open('/tmp/stream_batch.json', 'w') as f:
    json.dump(payload, f)

print(f"Batch prepared: 100 samples")
EOF

# Send via curl
curl -X POST "http://localhost:8000/api/v1/gan/streaming/batch" \
  -H "Content-Type: application/json" \
  -d @/tmp/stream_batch.json
```

**Expected Response:**
```json
{
  "batch_id": "batch_001",
  "samples_processed": 2,
  "status": "buffered",
  "buffer_utilization": 0.2,
  "model_updated": false,
  "timestamp": "2024-01-15T14:50:15.123456"
}
```

---

### 8. Get Streaming Status

**Endpoint:** `GET /streaming/status/{streaming_id}`

**curl example:**
```bash
STREAMING_ID="stream_20240115_145000_xyz789"

curl -X GET "http://localhost:8000/api/v1/gan/streaming/status/$STREAMING_ID"
```

**Expected Response:**
```json
{
  "status": "active",
  "total_samples_seen": 10000,
  "update_count": 45,
  "avg_drift_score": 0.1234,
  "recent_drift": 0.0856,
  "timestamp": "2024-01-15T14:55:00.123456"
}
```

**Status Interpretation:**
- `total_samples_seen`: Cumulative samples processed
- `update_count`: How many times model was retrained
- `avg_drift_score`: Average data drift (0=no drift, 1=high drift)
- `recent_drift`: Recent drift (last 100 samples)

---

## Management Endpoints

### 9. Save Training Checkpoint

**Endpoint:** `POST /checkpoint/save`

**curl example:**
```bash
curl -X POST "http://localhost:8000/api/v1/gan/checkpoint/save" \
  -H "Content-Type: application/json" \
  -d '{
    "training_id": "train_20240115_143022_abc123",
    "checkpoint_name": "best_model_epoch50"
  }'
```

**Expected Response:**
```json
{
  "checkpoint_id": "ckpt_20240115_150000_abc123",
  "training_id": "train_20240115_143022_abc123",
  "checkpoint_name": "best_model_epoch50",
  "saved_at": "2024-01-15T15:00:00.123456",
  "size_mb": 245.3
}
```

---

### 10. List Training Sessions

**Endpoint:** `GET /sessions`

**curl examples:**

```bash
# List all sessions
curl -X GET "http://localhost:8000/api/v1/gan/sessions"

# List with pagination
curl -X GET "http://localhost:8000/api/v1/gan/sessions?skip=0&limit=10"

# List only running sessions
curl -X GET "http://localhost:8000/api/v1/gan/sessions?status=running"
```

**Expected Response:**
```json
{
  "sessions": [
    {
      "training_id": "train_20240115_143022_abc123",
      "status": "completed",
      "started_at": "2024-01-15T14:30:22.123456",
      "config": {
        "gan_epochs": 50,
        "gan_batch_size": 32
      }
    },
    {
      "training_id": "train_20240115_120000_def456",
      "status": "running",
      "started_at": "2024-01-15T12:00:00.789123",
      "config": {
        "gan_epochs": 100,
        "gan_batch_size": 64
      }
    }
  ],
  "total": 2
}
```

**Python client example:**
```python
import requests

url = "http://localhost:8000/api/v1/gan/sessions"
response = requests.get(url, params={"limit": 20})

if response.status_code == 200:
    data = response.json()
    print(f"Total sessions: {data['total']}")
    for session in data['sessions']:
        print(f"  ID: {session['training_id']}")
        print(f"  Status: {session['status']}")
        print(f"  Started: {session['started_at']}")
```

---

### 11. Get Health Status

**Endpoint:** `GET /health`

**curl example:**
```bash
curl -X GET "http://localhost:8000/api/v1/gan/health"
```

**Expected Response (Training Running):**
```json
{
  "status": "training",
  "training_in_progress": true,
  "current_training_id": "train_20240115_143022_abc123",
  "device": "cuda:0",
  "gan_available": true,
  "streaming_available": true,
  "timestamp": "2024-01-15T14:55:30.123456"
}
```

**Expected Response (Idle):**
```json
{
  "status": "idle",
  "training_in_progress": false,
  "current_training_id": null,
  "device": "cuda:0",
  "gan_available": true,
  "streaming_available": true,
  "timestamp": "2024-01-15T14:55:30.123456"
}
```

---

### 12. Get Default Configuration

**Endpoint:** `GET /config/default`

**curl example:**
```bash
curl -X GET "http://localhost:8000/api/v1/gan/config/default"
```

**Expected Response:**
```json
{
  "gan_latent_dim": 100,
  "gan_hidden_dim": 256,
  "gan_epochs": 100,
  "gan_batch_size": 32,
  "lambda_cycle": 0.5,
  "lambda_gp": 10.0,
  "synthetic_ratio": 0.3,
  "adversarial_epsilon": 0.1,
  "mixup_alpha": 0.2,
  "device": "cuda:0",
  "timestamp": "2024-01-15T14:55:30.123456"
}
```

---

## Complete Workflow Examples

### Workflow 1: Full Training + Generation Pipeline

```bash
#!/bin/bash

# Step 1: Check health
echo "=== Checking GAN service health ==="
curl -s http://localhost:8000/api/v1/gan/health | jq .

# Step 2: Start training
echo -e "\n=== Starting training ==="
RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/gan/train/start \
  -H "Content-Type: application/json" \
  -d '{
    "data_path": "/path/to/Mule-data/features_combined.csv",
    "config": {
      "gan_epochs": 30,
      "gan_batch_size": 64
    }
  }')

echo "$RESPONSE" | jq .
TRAINING_ID=$(echo "$RESPONSE" | jq -r '.training_id')
echo "Training ID: $TRAINING_ID"

# Step 3: Monitor progress (every 30 seconds for 5 minutes)
echo -e "\n=== Monitoring progress ==="
for i in {1..10}; do
  sleep 30
  echo "Check $i:"
  curl -s http://localhost:8000/api/v1/gan/train/progress/$TRAINING_ID | jq '{status, current_epoch, total_epochs, progress_percent, current_loss}'
done

# Step 4: Get final metrics
echo -e "\n=== Training complete, getting metrics ==="
curl -s http://localhost:8000/api/v1/gan/train/metrics/$TRAINING_ID | jq .

# Step 5: Generate synthetic data
echo -e "\n=== Generating synthetic data ==="
curl -s -X POST http://localhost:8000/api/v1/gan/generate/synthetic \
  -H "Content-Type: application/json" \
  -d "{
    \"num_samples\": 2000,
    \"training_id\": \"$TRAINING_ID\"
  }" | jq .

# Step 6: Save checkpoint
echo -e "\n=== Saving checkpoint ==="
curl -s -X POST http://localhost:8000/api/v1/gan/checkpoint/save \
  -H "Content-Type: application/json" \
  -d "{
    \"training_id\": \"$TRAINING_ID\",
    \"checkpoint_name\": \"production_model\"
  }" | jq .
```

### Workflow 2: Streaming Data Processing

```python
import requests
import json
import numpy as np
import time

BASE_URL = "http://localhost:8000/api/v1/gan"

# Step 1: Initialize streaming
print("=== Initializing streaming ===")
init_response = requests.post(
    f"{BASE_URL}/streaming/init",
    json={
        "config": {
            "buffer_size": 500,
            "update_frequency": 50,
            "gan_epochs_incremental": 5
        }
    }
)
streaming_id = init_response.json()["streaming_id"]
print(f"Streaming ID: {streaming_id}")

# Step 2: Process batches continuously
print("\n=== Processing streaming batches ===")
for batch_num in range(1, 11):
    # Generate random batch (28 features, 32 samples)
    features = np.random.randn(32, 28).tolist()
    labels = np.random.randint(0, 2, 32).tolist()
    
    response = requests.post(
        f"{BASE_URL}/streaming/batch",
        json={
            "streaming_id": streaming_id,
            "features": features,
            "labels": labels
        }
    )
    
    result = response.json()
    print(f"Batch {batch_num}: {result['samples_processed']} samples, "
          f"Buffer: {result['buffer_utilization']*100:.1f}%, "
          f"Model updated: {result['model_updated']}")
    
    time.sleep(1)

# Step 3: Get streaming status
print("\n=== Streaming status ===")
status_response = requests.get(f"{BASE_URL}/streaming/status/{streaming_id}")
print(json.dumps(status_response.json(), indent=2))
```

---

## Error Handling

### Common Error Codes & Solutions

**400 Bad Request - Invalid data format**
```bash
# Error response
{"detail": "Invalid features format. Expected List[List[float]]"}

# Solution: Ensure features is properly formatted
curl -X POST "http://localhost:8000/api/v1/gan/streaming/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "streaming_id": "stream_id",
    "features": [[0.1, 0.2, ...28 features...]],  # Must be List[List[float]]
    "labels": [1]
  }'
```

**404 Not Found - Training/Streaming ID doesn't exist**
```bash
# Error response
{"detail": "Training session not found: invalid_id"}

# Solution: Use valid ID from /train/start or /streaming/init
TRAINING_ID=$(curl -s -X POST http://localhost:8000/api/v1/gan/train/start \
  -d '{"data_path": "/path/to/data.csv"}' | jq -r '.training_id')
```

**500 Internal Server Error - GPU out of memory**
```bash
# Error response
{"detail": "CUDA out of memory"}

# Solution: Reduce batch size or model dimensions
curl -X POST "http://localhost:8000/api/v1/gan/train/start" \
  -H "Content-Type: application/json" \
  -d '{
    "data_path": "/path/to/data.csv",
    "config": {
      "gan_batch_size": 16,  # Reduced from 32
      "gan_hidden_dim": 128   # Reduced from 256
    }
  }'
```

**422 Unprocessable Entity - Type validation error**
```bash
# Error response
{"detail": [{"type": "type_error.integer", "loc": ["body", "num_samples"]}]}

# Solution: Ensure correct parameter types
curl -X POST "http://localhost:8000/api/v1/gan/generate/synthetic" \
  -H "Content-Type: application/json" \
  -d '{
    "num_samples": 1000,           # Must be integer, not "1000"
    "training_id": "train_..."
  }'
```

### Debugging Strategies

**Check backend logs:**
```bash
# View live logs
tail -f backend/logs/gan_training.log

# Filter for errors
grep "ERROR" backend/logs/gan_training.log
```

**Verify data file exists:**
```bash
# Check if CSV is readable
head -n 5 /path/to/Mule-data/features_combined.csv
wc -l /path/to/Mule-data/features_combined.csv

# Check file permissions
ls -la /path/to/Mule-data/features_combined.csv
```

**Test endpoint connectivity:**
```bash
# Test basic connectivity
curl -i http://localhost:8000/api/v1/gan/health

# With verbose output
curl -v -X POST http://localhost:8000/api/v1/gan/train/start \
  -H "Content-Type: application/json" \
  -d '{"data_path": "/path/to/data.csv"}'
```

---

## Quick Reference: All 12 Endpoints

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | POST | `/train/start` | Start training |
| 2 | GET | `/train/progress/{id}` | Monitor training |
| 3 | GET | `/train/metrics/{id}` | Get metrics |
| 4 | POST | `/generate/synthetic` | Generate samples |
| 5 | GET | `/generate/augment-info` | Augmentation status |
| 6 | POST | `/streaming/init` | Start streaming |
| 7 | POST | `/streaming/batch` | Process batch |
| 8 | GET | `/streaming/status/{id}` | Streaming status |
| 9 | POST | `/checkpoint/save` | Save checkpoint |
| 10 | GET | `/sessions` | List sessions |
| 11 | GET | `/health` | Service health |
| 12 | GET | `/config/default` | Default config |

---

## Testing Checklist

- [ ] Backend starts without errors
- [ ] `/health` endpoint responds with `status: "idle"`
- [ ] `/config/default` returns valid configuration
- [ ] Can start training with default config
- [ ] Can start training with custom config
- [ ] Training progress updates every 10 seconds
- [ ] Can generate synthetic data after training
- [ ] Can initialize streaming session
- [ ] Can process streaming batches
- [ ] Can save checkpoints
- [ ] Can list sessions
- [ ] Error handling returns proper HTTP codes

