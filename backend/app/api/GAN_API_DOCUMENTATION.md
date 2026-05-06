# GAN Training FastAPI Backend - Complete Documentation

## 📍 Overview

This document describes the FastAPI backend for GAN training, synthetic data generation, and adversarial learning for fraud detection.

**Location:** 
- Service: `/backend/app/services/gan_training.py`
- Routes: `/backend/app/api/gan_routes.py`

**Base URL:** `http://localhost:8000/api/v1/gan`

---

## 🏗️ Architecture

### Service Layer (gan_training.py)

**GANTrainingService** - Main orchestrator class

```python
class GANTrainingService:
    # Training management
    start_training(training_id, data_path, config)
    get_training_progress(training_id)
    get_training_metrics(training_id)
    
    # Data generation
    generate_synthetic_data(num_samples, training_id)
    get_augmented_data(training_id, components)
    
    # Streaming learning
    setup_streaming_learning(model_path, config)
    process_streaming_batch(features, labels)
    get_streaming_status()
    
    # Checkpointing
    save_checkpoint(checkpoint_id)
    list_training_sessions()
```

### API Layer (gan_routes.py)

FastAPI routes with Pydantic validation

```
POST   /train/start              - Start training
GET    /train/progress/{id}      - Get progress
GET    /train/metrics/{id}       - Get metrics
POST   /generate/synthetic       - Generate data
GET    /augment/info/{id}        - Get augment info
POST   /streaming/init           - Init streaming
POST   /streaming/batch          - Process batch
GET    /streaming/status         - Get status
POST   /checkpoint/save/{id}     - Save checkpoint
GET    /sessions                 - List sessions
GET    /health                   - Health check
POST   /config/default           - Get default config
```

---

## 📊 API Endpoints

### 1. Training Management

#### POST `/train/start`
**Start GAN training (async)**

**Request:**
```json
{
  "data_path": "/path/to/features.csv",
  "config": {
    "gan_epochs": 100,
    "gan_batch_size": 32,
    "lambda_cycle": 0.5,
    "lambda_gp": 10,
    "synthetic_ratio": 0.3
  }
}
```

**Response:**
```json
{
  "training_id": "training_20260506_193822",
  "status": "loading",
  "started_at": "2026-05-06T19:38:22",
  "config": {
    "gan_epochs": 100,
    ...
  }
}
```

**Usage:**
```bash
curl -X POST "http://localhost:8000/api/v1/gan/train/start" \
  -H "Content-Type: application/json" \
  -d '{
    "data_path": "Mule-data/features_combined.csv",
    "config": {"gan_epochs": 100}
  }'
```

---

#### GET `/train/progress/{training_id}`
**Get current training progress**

**Response:**
```json
{
  "status": "training",
  "current_epoch": 45,
  "total_epochs": 100,
  "progress_percent": 45.0,
  "current_loss": 0.123456,
  "best_loss": 0.098765,
  "g_loss": 0.12,
  "d_loss": 0.11,
  "cycle_loss": 0.02,
  "timestamp": "2026-05-06T19:40:22",
  "estimated_remaining_secs": 1200
}
```

**Usage:**
```bash
curl -X GET "http://localhost:8000/api/v1/gan/train/progress/training_20260506_193822"
```

---

#### GET `/train/metrics/{training_id}`
**Get GAN training metrics**

**Response:**
```json
{
  "inception_score": 0.892345,
  "mean_diff": 0.032456,
  "std_diff": 0.028901,
  "pairwise_dist_real": 0.156234,
  "pairwise_dist_fake": 0.158456,
  "samples_generated": 1000,
  "timestamp": "2026-05-06T19:45:22"
}
```

**Interpretation:**
- **Inception Score**: 0.85-0.95 is good (0-1 scale)
- **Mean/Std Diff**: < 0.05 indicates good distribution match
- **Pairwise Distance**: Similar real vs fake indicates diversity

---

### 2. Data Generation

#### POST `/generate/synthetic`
**Generate synthetic fraud features**

**Query Parameters:**
```
num_samples: 1000 (default)
training_id: "training_..." (optional)
```

**Response:**
```json
{
  "num_samples": 1000,
  "data_shape": [1000, 40],
  "generated_at": "2026-05-06T19:45:22"
}
```

**Usage:**
```bash
curl -X POST "http://localhost:8000/api/v1/gan/generate/synthetic?num_samples=2000"
```

---

#### GET `/augment/info/{training_id}`
**Get augmented data information**

**Query Parameters:**
```
include_synthetic: true
include_adversarial: true
include_mixup: true
```

**Response:**
```json
{
  "components": {
    "synthetic": {
      "shape": [1000, 40],
      "mean": [0.5, 0.6, ...],
      "std": [0.1, 0.15, ...]
    },
    "adversarial": {
      "shape": [500, 40],
      "mean": [...],
      "std": [...]
    },
    "mixup": {
      "shape": [500, 40],
      "mean": [...],
      "std": [...]
    }
  },
  "augmented_data_ready": true,
  "generated_at": "2026-05-06T19:45:22"
}
```

---

### 3. Streaming Learning

#### POST `/streaming/init`
**Initialize streaming/online learning**

**Request:**
```json
{
  "model_path": "ml_results/gan/training_20260506_193822/gan_models",
  "config": {
    "buffer_size": 1000,
    "update_frequency": 100,
    "gan_epochs_incremental": 10
  }
}
```

**Response:**
```json
{
  "status": "initialized",
  "config": {
    "buffer_size": 1000,
    "update_frequency": 100,
    "gan_epochs_incremental": 10
  },
  "initialized_at": "2026-05-06T19:50:00"
}
```

---

#### POST `/streaming/batch`
**Process new batch in streaming mode**

**Request:**
```json
{
  "features": [
    [0.1, 0.2, 0.3, ...],
    [0.2, 0.3, 0.4, ...],
    ...
  ],
  "labels": [0, 1, 0, ...]
}
```

**Response:**
```json
{
  "num_samples_processed": 100,
  "predictions": [0.1, 0.8, 0.2, ...],
  "learner_status": {
    "total_samples_seen": 5200,
    "update_count": 52,
    "avg_drift_score": 0.042,
    "recent_drift": 0.038
  },
  "processed_at": "2026-05-06T19:51:00"
}
```

---

#### GET `/streaming/status`
**Get streaming learning status**

**Response:**
```json
{
  "status": "active",
  "total_samples_seen": 5200,
  "update_count": 52,
  "avg_drift_score": 0.042,
  "recent_drift": 0.038,
  "timestamp": "2026-05-06T19:51:30"
}
```

**Interpretation:**
- **total_samples_seen**: Cumulative samples processed
- **update_count**: Number of model retrains
- **drift_score**: < 0.1 is good, > 0.1 indicates shift

---

### 4. Checkpointing & Management

#### POST `/checkpoint/save/{checkpoint_id}`
**Save training checkpoint**

**Usage:**
```bash
curl -X POST "http://localhost:8000/api/v1/gan/checkpoint/save/checkpoint_001"
```

**Response:**
```json
{
  "checkpoint_id": "checkpoint_001",
  "saved_at": "2026-05-06T19:52:00",
  "path": "/path/to/checkpoint_dir"
}
```

---

#### GET `/sessions`
**List all training sessions**

**Response:**
```json
{
  "sessions": [
    {
      "training_id": "training_20260506_193822",
      "path": "/path/to/session",
      "has_results": true,
      "created_at": "2026-05-06T19:38:22"
    },
    ...
  ],
  "total": 5
}
```

---

#### GET `/health`
**Service health check**

**Response:**
```json
{
  "status": "healthy",
  "training_in_progress": false,
  "current_training_id": null,
  "device": "cuda",
  "gan_available": true,
  "streaming_available": true,
  "timestamp": "2026-05-06T19:53:00"
}
```

---

#### POST `/config/default`
**Get default configuration**

**Response:**
```json
{
  "default_config": {
    "gan_latent_dim": 100,
    "gan_hidden_dim": 256,
    "gan_epochs": 100,
    "gan_batch_size": 32,
    "lambda_cycle": 0.5,
    "lambda_gp": 10,
    "synthetic_ratio": 0.3,
    "adversarial_epsilon": 0.1,
    "mixup_alpha": 0.2
  },
  "description": "Default GAN training configuration"
}
```

---

## 🔄 Typical Workflows

### Workflow 1: Basic Training

```python
import requests

BASE_URL = "http://localhost:8000/api/v1/gan"

# 1. Start training
resp = requests.post(
    f"{BASE_URL}/train/start",
    json={
        "data_path": "Mule-data/features_combined.csv",
        "config": {"gan_epochs": 50}
    }
)
training_id = resp.json()['training_id']

# 2. Monitor progress (poll every 30s)
while True:
    progress = requests.get(
        f"{BASE_URL}/train/progress/{training_id}"
    ).json()
    
    print(f"Progress: {progress['progress_percent']:.1f}%")
    
    if progress['status'] in ['completed', 'failed']:
        break
    
    time.sleep(30)

# 3. Get metrics
metrics = requests.get(
    f"{BASE_URL}/train/metrics/{training_id}"
).json()

print(f"Inception Score: {metrics['inception_score']:.4f}")
```

---

### Workflow 2: Generate & Augment

```python
# Generate synthetic data
synth_resp = requests.post(
    f"{BASE_URL}/generate/synthetic?num_samples=2000"
).json()

# Get augmentation info
augment_resp = requests.get(
    f"{BASE_URL}/augment/info/{training_id}?include_synthetic=true"
).json()

print(augment_resp['components'])
```

---

### Workflow 3: Streaming Learning

```python
import numpy as np

# Initialize streaming
requests.post(
    f"{BASE_URL}/streaming/init",
    json={
        "model_path": f"ml_results/gan/{training_id}/gan_models",
        "config": {"buffer_size": 1000}
    }
)

# Process batches
for batch in data_stream:
    features = batch['features'].tolist()
    labels = batch['labels'].tolist()
    
    result = requests.post(
        f"{BASE_URL}/streaming/batch",
        json={"features": features, "labels": labels}
    ).json()
    
    print(f"Predictions: {result['predictions'][:5]}")

# Get final status
status = requests.get(f"{BASE_URL}/streaming/status").json()
print(f"Total samples: {status['total_samples_seen']}")
```

---

## 🔐 Error Handling

### Common Errors

**409 Conflict** - Training already in progress
```json
{
  "detail": "Training already in progress"
}
```

**404 Not Found** - Training session not found
```json
{
  "detail": "No progress found for training training_xxx"
}
```

**500 Internal Server Error** - Unexpected failure
```json
{
  "detail": "Prediction failed: ..."
}
```

---

## 📈 Performance Tuning

### Configuration Guidelines

```python
# For small datasets (< 10K samples)
config = {
    "gan_epochs": 50,
    "gan_batch_size": 16,
    "lambda_gp": 5,
    "synthetic_ratio": 0.5
}

# For large datasets (> 100K samples)
config = {
    "gan_epochs": 200,
    "gan_batch_size": 64,
    "lambda_gp": 10,
    "synthetic_ratio": 0.2
}

# For production (balanced)
config = {
    "gan_epochs": 100,
    "gan_batch_size": 32,
    "lambda_gp": 10,
    "synthetic_ratio": 0.3
}
```

---

## 🧪 Testing

### Unit Test Example

```python
import pytest
from app.services.gan_training import GANTrainingService

@pytest.fixture
def gan_service():
    return GANTrainingService()

def test_start_training(gan_service):
    result = gan_service.start_training(
        training_id="test_001",
        data_path="test_data.csv"
    )
    
    assert result['status'] == 'loading'
    assert 'training_id' in result
```

---

## 📚 Integration Examples

### With FastAPI Client

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_gan_training():
    response = client.post(
        "/api/v1/gan/train/start",
        json={"data_path": "test.csv"}
    )
    assert response.status_code == 200
```

### With React Frontend

```javascript
// Start training
const response = await fetch('http://localhost:8000/api/v1/gan/train/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data_path: '/data/features.csv',
    config: { gan_epochs: 100 }
  })
});

const data = await response.json();
const trainingId = data.training_id;

// Poll progress
setInterval(async () => {
  const progress = await fetch(
    `http://localhost:8000/api/v1/gan/train/progress/${trainingId}`
  ).then(r => r.json());
  
  setProgressBar(progress.progress_percent);
}, 5000);
```

---

## 🚀 Deployment

### Docker

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables

```env
# ML Results directory
ML_RESULTS_PATH=ml_results/gan

# GPU
CUDA_VISIBLE_DEVICES=0

# API
API_HOST=0.0.0.0
API_PORT=8000
```

---

## 📞 Support

See inline documentation in:
- `gan_training.py` - Service implementation
- `gan_routes.py` - API routes
- `README.md` - Overview

---

## ✅ Quick Checklist

- ✅ GAN training service implemented
- ✅ FastAPI routes created
- ✅ Pydantic models for validation
- ✅ Async training support
- ✅ Progress tracking
- ✅ Streaming learning
- ✅ Error handling
- ✅ Documentation complete

**Ready for production!**
