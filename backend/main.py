# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging
import os
from datetime import datetime

# Import routers
from routers import connections, metadata, query, explorations

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Facet API",
    description="API for Facet SQL exploration tool",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),  # In production, set CORS_ORIGINS env var
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(connections.router, prefix="/api/v1/connections", tags=["Connections"])
app.include_router(metadata.router, prefix="/api/v1/metadata", tags=["Metadata"])
app.include_router(query.router, prefix="/api/v1/query", tags=["Query"])
app.include_router(explorations.router, prefix="/api/v1/explorations", tags=["Explorations"])

@app.get("/", tags=["Health"])
async def root():
    """
    Root endpoint for health checks
    """
    return {"status": "healthy", "timestamp": datetime.now().isoformat(), "api_version": "v1"}

@app.get("/api", tags=["Health"])
async def api_root():
    """
    API root endpoint
    """
    return {
        "status": "healthy", 
        "timestamp": datetime.now().isoformat(),
        "endpoints": [
            {"path": "/api/v1/connections", "methods": ["GET", "POST"]},
            {"path": "/api/v1/metadata/connections/{conn_id}/tables", "methods": ["GET"]}
        ]
    }

@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint
    """
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    # Run the application with uvicorn when script is executed directly
    is_dev = os.getenv("ENVIRONMENT", "development") == "development"
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=is_dev,
        workers=1 if is_dev else 4
    )