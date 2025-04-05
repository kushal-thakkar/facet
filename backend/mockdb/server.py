import os
import json
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Facet Mock Database Server", description="Mock database server for Facet testing")

# Get mock data path from environment variable or use default
MOCK_DATA_PATH = os.environ.get("MOCK_DATA_PATH", "/data")

# Models
class QueryRequest(BaseModel):
    sql: str
    params: Optional[Dict[str, Any]] = None

class QueryResult(BaseModel):
    columns: List[Dict[str, str]]
    data: List[Dict[str, Any]]
    rowCount: int
    executionTime: float
    sql: str
    
class MetadataRequest(BaseModel):
    database: str
    
# Helper function to load mock data
def load_mock_data(filename: str) -> Dict:
    try:
        file_path = Path(MOCK_DATA_PATH) / filename
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading mock data {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load mock data: {str(e)}")

# Routes
@app.get("/")
async def root():
    return {"status": "Facet Mock Database is running"}

@app.post("/api/query/execute", response_model=QueryResult)
async def execute_query(query_request: QueryRequest):
    """
    Mock endpoint to execute SQL queries
    Returns pre-defined mock data based on the query
    """
    logger.info(f"Received query: {query_request.sql}")
    
    # Basic SQL parsing to determine which mock data to return
    sql_lower = query_request.sql.lower()
    
    # Determine which mock data file to use based on the query
    if "events" in sql_lower:
        data = load_mock_data("events_data.json")
    elif "users" in sql_lower:
        data = load_mock_data("users_data.json")
    else:
        # Default data
        data = load_mock_data("default_data.json")
    
    return {
        "columns": data.get("columns", []),
        "data": data.get("data", []),
        "rowCount": len(data.get("data", [])),
        "executionTime": 0.1,  # Mock execution time
        "sql": query_request.sql
    }

@app.post("/api/metadata/tables")
async def get_metadata_tables(metadata_request: MetadataRequest):
    """
    Mock endpoint to get database metadata
    Returns pre-defined mock metadata
    """
    logger.info(f"Getting metadata for database: {metadata_request.database}")
    
    # Load mock metadata
    metadata = load_mock_data("metadata.json")
    
    return {
        "tables": metadata.get("tables", []),
        "columns": metadata.get("columns", []),
        "relationships": metadata.get("relationships", [])
    }

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8080, reload=True)