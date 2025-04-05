# app/routers/query.py
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from models.query import (
    QueryExplainRequest,
    QueryExplainResult,
    QueryHistoryEntry,
    QueryModel,
    QueryRequest,
    QueryResult,
    QueryValidationRequest,
    QueryValidationResult,
)
from services.connection_service import ConnectionService
from services.query_service import QueryService

# Create router
router = APIRouter()

# Setup logging
logger = logging.getLogger(__name__)


# Dependencies
def get_query_service():
    return QueryService()


def get_connection_service():
    return ConnectionService()


@router.post("/execute", response_model=QueryResult)
async def execute_query(
    query_request: QueryRequest,
    query_service: QueryService = Depends(get_query_service),
    connection_service: ConnectionService = Depends(get_connection_service),
):
    """
    Execute a query
    """
    try:
        # Get connection
        connection = await connection_service.get_connection(query_request.connectionId)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection with ID {query_request.connectionId} not found",
            )

        # Execute query
        result = await query_service.execute_query(connection, query_request.query)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing query: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute query: {str(e)}",
        )
