"""Main FastAPI application"""
from importlib import import_module
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROUTER_MODULES = (
    "health_routes",
    "auto_sar_routes",
    "ingestion_routes",
    "pipeline_routes",
    "shap_routes",
    "dashboard_routes",
    "hydra_routes",
    "chronos_routes",
    "model_command_center_routes",
    "mule_routes",
    "ml_routes",
)

mounted_routers: list[str] = []

# Initialize FastAPI app
app = FastAPI(
    title="Trinetra Mule Detection API",
    description="ML-powered mule account detection with Supabase integration",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# Add CORS middleware - Allow all frontend ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:3000",
        "http://localhost:5001",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:8000",
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
    """Initialize API services on startup"""
    logger.info("Starting Trinetra Mule Detection API...")
    logger.info("Startup complete!")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Trinetra Mule Detection API...")


def include_api_routers() -> None:
    """Mount API routers without letting one optional dependency kill startup."""
    for module_name in ROUTER_MODULES:
        try:
            module = import_module(f"app.api.{module_name}")
            app.include_router(module.router)
            mounted_routers.append(module_name)
            logger.info("Mounted API router: %s", module_name)
        except Exception as exc:
            logger.warning("Skipping API router %s: %s", module_name, exc)


include_api_routers()


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
        "description": "AML ingestion and system status API",
        "endpoints": {
            "documentation": "/docs",
            "openapi": "/openapi.json",
            "health": "/api/v1/health",
            "status": "/api/v1/status",
            "ingestion_upload": "/api/ingestion/upload",
            "ingestion_status": "/api/ingestion/status",
            "ingestion_summary": "/api/ingestion/summary",
            "ingestion_clear": "/api/ingestion/clear",
            "pipeline_status": "/api/pipeline/status",
            "dashboard_summary": "/api/dashboard/summary",
            "model_command_center_details": "/api/model-command-center/details",
            "model_command_center_version": "/api/model-command-center/version",
            "hydra_battle_start": "/api/hydra/battle/start",
            "hydra_battle_status": "/api/hydra/battle/status",
            "hydra_battle_events": "/api/hydra/battle/events",
            "chronos_timeline": "/api/chronos/timeline",
            "autosar_cases": "/api/cases",
            "ml_predict": "/api/v1/ml/predict",
            "mule_risk": "/api/mule/mule-risk/{account_id}",
            "mounted_routers": mounted_routers,
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
