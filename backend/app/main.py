"""Main FastAPI application"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from .database import init_supabase, get_db_service
from .services.ml_models import get_model_manager
from .services.gan_training import get_gan_service
from .api import health_routes, ml_routes, db_routes, gan_routes, auth_routes, chronos_routes, mule_routes, hydra_routes

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Trinetra Mule Detection API",
    description="ML-powered mule account detection with Supabase integration",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5001",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.example.com"]
)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Trinetra Mule Detection API...")
    
    try:
        init_supabase()
        logger.info("✓ Supabase initialized")
    except Exception as e:
        logger.error(f"✗ Failed to initialize Supabase: {e}")
    
    try:
        get_model_manager()
        logger.info("✓ ML models loaded")
    except Exception as e:
        logger.error(f"✗ Failed to load ML models: {e}")
    
    try:
        get_gan_service()
        logger.info("✓ GAN service initialized")
    except Exception as e:
        logger.error(f"✗ Failed to initialize GAN service: {e}")
    
    logger.info("Startup complete!")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Trinetra Mule Detection API...")


# Include routers
app.include_router(health_routes.router)
app.include_router(auth_routes.router)
app.include_router(ml_routes.router)
app.include_router(db_routes.router)
app.include_router(gan_routes.router)
app.include_router(chronos_routes.router)
app.include_router(mule_routes.router)
app.include_router(hydra_routes.router)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle uncaught exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


# Welcome endpoint
@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": "Trinetra Mule Detection API",
        "version": "1.0.0",
        "description": "ML-powered mule account detection system with GAN augmentation",
        "endpoints": {
            "documentation": "/docs",
            "openapi": "/openapi.json",
            "health": "/api/v1/health",
            "status": "/api/v1/status",
            "ml": "/api/v1/ml",
            "database": "/api/v1/db",
            "gan": "/api/v1/gan"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
