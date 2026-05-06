"""
FastAPI Routes for GAN Training
Endpoints for: training, generation, streaming, monitoring
"""

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Body
from pydantic import BaseModel, Field

from app.services.gan_training import get_gan_service, TrainingStatus

logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/v1/gan", tags=["GAN Training"])

# ============================================================
# PYDANTIC MODELS (Request/Response)
# ============================================================


class GANConfig(BaseModel):
    """GAN training configuration"""
    gan_latent_dim: int = Field(100, description="Latent space dimension")
    gan_hidden_dim: int = Field(256, description="Hidden layer width")
    gan_epochs: int = Field(100, description="Training epochs")
    gan_batch_size: int = Field(32, description="Batch size")
    lambda_cycle: float = Field(0.5, description="Cycle consistency weight")
    lambda_gp: float = Field(10, description="Gradient penalty weight")
    synthetic_ratio: float = Field(0.3, description="Ratio of synthetic to real data")
    adversarial_epsilon: float = Field(0.1, description="Adversarial perturbation magnitude")
    mixup_alpha: float = Field(0.2, description="Mixup beta distribution parameter")


class TrainingStartRequest(BaseModel):
    """Request to start training"""
    data_path: str = Field(..., description="Path to training data (CSV or pickle)")
    config: Optional[GANConfig] = Field(None, description="Optional config overrides")


class TrainingProgressResponse(BaseModel):
    """Training progress response"""
    status: str = Field(..., description="Training status")
    current_epoch: int = Field(..., description="Current epoch")
    total_epochs: int = Field(..., description="Total epochs")
    progress_percent: float = Field(..., description="Progress percentage")
    current_loss: float = Field(..., description="Current loss")
    best_loss: float = Field(..., description="Best loss so far")
    g_loss: float = Field(..., description="Generator loss")
    d_loss: float = Field(..., description="Discriminator loss")
    cycle_loss: float = Field(..., description="Cycle consistency loss")
    timestamp: str = Field(..., description="Progress timestamp")
    estimated_remaining_secs: int = Field(..., description="Estimated seconds remaining")


class MetricsResponse(BaseModel):
    """GAN metrics response"""
    inception_score: float = Field(..., description="Inception Score (0-1)")
    mean_diff: float = Field(..., description="Mean difference between real and synthetic")
    std_diff: float = Field(..., description="Std difference between real and synthetic")
    pairwise_dist_real: float = Field(..., description="Real data pairwise distance")
    pairwise_dist_fake: float = Field(..., description="Synthetic data pairwise distance")
    samples_generated: int = Field(..., description="Number of synthetic samples")
    timestamp: str = Field(..., description="Metrics timestamp")


class SyntheticDataResponse(BaseModel):
    """Synthetic data generation response"""
    num_samples: int = Field(..., description="Number of samples generated")
    data_shape: List[int] = Field(..., description="Shape of generated data")
    generated_at: str = Field(..., description="Generation timestamp")


class AugmentedDataResponse(BaseModel):
    """Augmented data info response"""
    components: dict = Field(..., description="Data augmentation components")
    augmented_data_ready: bool = Field(..., description="Is augmented data ready")
    generated_at: str = Field(..., description="Generation timestamp")


class StreamingConfig(BaseModel):
    """Streaming learning configuration"""
    buffer_size: int = Field(1000, description="Max buffered samples")
    update_frequency: int = Field(100, description="Update interval")
    gan_epochs_incremental: int = Field(10, description="Incremental training epochs")


class StreamingBatchRequest(BaseModel):
    """Request to process streaming batch"""
    features: List[List[float]] = Field(..., description="Feature vectors")
    labels: Optional[List[float]] = Field(None, description="Optional labels")


class StreamingStatusResponse(BaseModel):
    """Streaming learning status"""
    status: str = Field(..., description="Streaming status")
    total_samples_seen: int = Field(0, description="Total samples processed")
    update_count: int = Field(0, description="Number of model updates")
    avg_drift_score: float = Field(0.0, description="Average drift score")
    recent_drift: float = Field(0.0, description="Recent drift score")
    timestamp: str = Field(..., description="Status timestamp")


class TrainingSessionResponse(BaseModel):
    """Training session info"""
    training_id: str
    status: str
    started_at: str
    config: Optional[dict] = None


class TrainingSessionListResponse(BaseModel):
    """List of training sessions"""
    sessions: List[dict] = Field(..., description="Training sessions")
    total: int = Field(..., description="Total sessions")


class HealthResponse(BaseModel):
    """GAN service health"""
    status: str
    training_in_progress: bool
    current_training_id: Optional[str]
    device: str
    gan_available: bool
    streaming_available: bool
    timestamp: str


# ============================================================
# ENDPOINTS
# ============================================================


@router.post("/train/start", response_model=TrainingSessionResponse)
async def start_training(
    request: TrainingStartRequest,
    background_tasks: BackgroundTasks
):
    """
    Start GAN training process
    
    Training runs asynchronously in the background.
    Use `/train/progress/{training_id}` to monitor progress.
    """
    try:
        gan_service = get_gan_service()
        
        # Generate training ID
        training_id = f"training_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Start training
        result = gan_service.start_training(
            training_id=training_id,
            data_path=request.data_path,
            config=request.config.dict() if request.config else None
        )
        
        logger.info(f"✓ Training started: {training_id}")
        
        return TrainingSessionResponse(
            training_id=training_id,
            status=result['status'],
            started_at=result['started_at'],
            config=result.get('config')
        )
        
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"✗ Failed to start training: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/train/progress/{training_id}", response_model=TrainingProgressResponse)
async def get_training_progress(training_id: str):
    """
    Get current training progress
    
    Returns epoch, losses, and estimated time remaining.
    """
    try:
        gan_service = get_gan_service()
        progress = gan_service.get_training_progress(training_id)
        
        if progress is None:
            raise HTTPException(
                status_code=404,
                detail=f"No progress found for training {training_id}"
            )
        
        return TrainingProgressResponse(**progress)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ Failed to get progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/train/metrics/{training_id}", response_model=MetricsResponse)
async def get_training_metrics(training_id: str):
    """
    Get GAN training metrics
    
    Returns synthetic data quality metrics:
    - Inception Score: Quality & diversity (0-1)
    - Distribution differences: Mean and std alignment
    """
    try:
        gan_service = get_gan_service()
        metrics = gan_service.get_training_metrics(training_id)
        
        if metrics is None:
            raise HTTPException(
                status_code=404,
                detail=f"No metrics found for training {training_id}"
            )
        
        return MetricsResponse(**metrics)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ Failed to get metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/synthetic", response_model=SyntheticDataResponse)
async def generate_synthetic_data(
    num_samples: int = Query(1000, description="Number of samples to generate"),
    training_id: Optional[str] = Query(None, description="Optional training session ID")
):
    """
    Generate synthetic fraud features
    
    Requires a trained GAN model.
    """
    try:
        gan_service = get_gan_service()
        result = gan_service.generate_synthetic_data(num_samples, training_id)
        
        return SyntheticDataResponse(**result)
        
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"✗ Failed to generate synthetic data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/augment/info/{training_id}", response_model=AugmentedDataResponse)
async def get_augmented_data_info(
    training_id: str,
    include_synthetic: bool = Query(True),
    include_adversarial: bool = Query(True),
    include_mixup: bool = Query(True)
):
    """
    Get information about augmented training data
    
    Returns statistics for each augmentation component:
    - Synthetic: GAN-generated samples
    - Adversarial: Perturbation-based augmentation
    - Mixup: Interpolation-based augmentation
    """
    try:
        gan_service = get_gan_service()
        result = gan_service.get_augmented_data(
            training_id=training_id,
            include_synthetic=include_synthetic,
            include_adversarial=include_adversarial,
            include_mixup=include_mixup
        )
        
        return AugmentedDataResponse(**result)
        
    except Exception as e:
        logger.error(f"✗ Failed to get augmented data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/streaming/init")
async def init_streaming_learning(
    model_path: str = Body(..., embed=True),
    config: Optional[StreamingConfig] = None
):
    """
    Initialize streaming/online learning
    
    Sets up incremental model updates for new data.
    """
    try:
        gan_service = get_gan_service()
        result = gan_service.setup_streaming_learning(
            model_path=model_path,
            config=config.dict() if config else None
        )
        
        logger.info("✓ Streaming learning initialized")
        
        return result
        
    except Exception as e:
        logger.error(f"✗ Failed to init streaming: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/streaming/batch", response_model=dict)
async def process_streaming_batch(request: StreamingBatchRequest):
    """
    Process new batch in streaming mode
    
    Updates models with new data and returns predictions.
    """
    try:
        import numpy as np
        
        gan_service = get_gan_service()
        
        features = np.array(request.features)
        labels = np.array(request.labels) if request.labels else None
        
        result = gan_service.process_streaming_batch(features, labels)
        
        return result
        
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"✗ Failed to process streaming batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/streaming/status", response_model=StreamingStatusResponse)
async def get_streaming_status():
    """
    Get streaming learning status
    
    Returns: samples processed, updates performed, drift scores.
    """
    try:
        gan_service = get_gan_service()
        status = gan_service.get_streaming_status()
        
        return StreamingStatusResponse(**status)
        
    except Exception as e:
        logger.error(f"✗ Failed to get streaming status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/checkpoint/save/{checkpoint_id}")
async def save_checkpoint(checkpoint_id: str):
    """
    Save training checkpoint
    
    Checkpoints include GAN models and streaming state.
    """
    try:
        gan_service = get_gan_service()
        result = gan_service.save_checkpoint(checkpoint_id)
        
        logger.info(f"✓ Checkpoint saved: {checkpoint_id}")
        
        return result
        
    except Exception as e:
        logger.error(f"✗ Failed to save checkpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions", response_model=TrainingSessionListResponse)
async def list_training_sessions():
    """
    List all training sessions
    
    Returns metadata for each completed training session.
    """
    try:
        gan_service = get_gan_service()
        sessions = gan_service.list_training_sessions()
        
        return TrainingSessionListResponse(
            sessions=sessions,
            total=len(sessions)
        )
        
    except Exception as e:
        logger.error(f"✗ Failed to list sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    GAN service health check
    
    Returns service status and available features.
    """
    try:
        gan_service = get_gan_service()
        status = gan_service.get_training_status()
        
        return HealthResponse(**status)
        
    except Exception as e:
        logger.error(f"✗ Health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/config/default")
async def get_default_config():
    """
    Get default GAN configuration
    
    Use this as a starting point for custom configs.
    """
    try:
        gan_service = get_gan_service()
        
        return {
            'default_config': gan_service.default_config,
            'description': 'Default GAN training configuration'
        }
        
    except Exception as e:
        logger.error(f"✗ Failed to get config: {e}")
        raise HTTPException(status_code=500, detail=str(e))
