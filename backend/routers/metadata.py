# app/routers/metadata.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from app.models.metadata import (
    TableMetadata,
    ColumnMetadata,
    RelationshipMetadata,
    MetadataUpdateRequest
)
from app.services.metadata_service import MetadataService
from app.services.connection_service import ConnectionService

# Create router
router = APIRouter()

# Setup logging
logger = logging.getLogger(__name__)

# Dependencies
def get_metadata_service():
    return MetadataService()

def get_connection_service():
    return ConnectionService()

@router.get("/connections/{conn_id}/tables", response_model=List[TableMetadata])
async def list_tables(
    conn_id: str,
    metadata_service: MetadataService = Depends(get_metadata_service),
    connection_service: ConnectionService = Depends(get_connection_service)
):
    """
    List tables for a connection
    """
    try:
        # Get connection
        connection = await connection_service.get_connection(conn_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection with ID {conn_id} not found"
            )
        
        # Get tables
        tables = await metadata_service.get_tables(connection)
        return tables
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing tables for connection {conn_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list tables: {str(e)}"
        )

@router.get("/connections/{conn_id}/tables/{table_id}", response_model=TableMetadata)
async def get_table_metadata(
    conn_id: str,
    table_id: str,
    metadata_service: MetadataService = Depends(get_metadata_service),
    connection_service: ConnectionService = Depends(get_connection_service)
):
    """
    Get metadata for a specific table
    """
    try:
        # Get connection
        connection = await connection_service.get_connection(conn_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection with ID {conn_id} not found"
            )
        
        # Get table metadata
        table = await metadata_service.get_table(connection, table_id)
        if not table:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table {table_id} not found"
            )
        
        return table
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting metadata for table {table_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get table metadata: {str(e)}"
        )

@router.get("/connections/{conn_id}/tables/{table_id}/columns", response_model=List[ColumnMetadata])
async def get_table_columns(
    conn_id: str,
    table_id: str,
    metadata_service: MetadataService = Depends(get_metadata_service),
    connection_service: ConnectionService = Depends(get_connection_service)
):
    """
    Get columns for a specific table
    """
    try:
        # Get connection
        connection = await connection_service.get_connection(conn_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection with ID {conn_id} not found"
            )
        
        # Get columns
        columns = await metadata_service.get_columns(connection, table_id)
        return columns
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting columns for table {table_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get table columns: {str(e)}"
        )

@router.put("/connections/{conn_id}/tables/{table_id}", response_model=TableMetadata)
async def update_table_metadata(
    conn_id: str,
    table_id: str,
    metadata_update: MetadataUpdateRequest,
    metadata_service: MetadataService = Depends(get_metadata_service),
    connection_service: ConnectionService = Depends(get_connection_service)
):
    """
    Update metadata for a table
    """
    try:
        # Get connection
        connection = await connection_service.get_connection(conn_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection with ID {conn_id} not found"
            )
        
        # Update table metadata
        updated_table = await metadata_service.update_table_metadata(
            connection, 
            table_id, 
            metadata_update
        )
        
        if not updated_table:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table {table_id} not found"
            )
        
        return updated_table
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating metadata for table {table_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update table metadata: {str(e)}"
        )

@router.post("/connections/{conn_id}/refresh", status_code=status.HTTP_202_ACCEPTED)
async def refresh_metadata(
    conn_id: str,
    metadata_service: MetadataService = Depends(get_metadata_service),
    connection_service: ConnectionService = Depends(get_connection_service)
):
    """
    Refresh metadata for a connection
    """
    try:
        # Get connection
        connection = await connection_service.get_connection(conn_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection with ID {conn_id} not found"
            )
        
        # Refresh metadata
        await metadata_service.refresh_metadata(connection)
        
        return {"message": f"Metadata refresh started for connection {conn_id}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing metadata for connection {conn_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh metadata: {str(e)}"
        )

@router.get("/connections/{conn_id}/relationships", response_model=List[RelationshipMetadata])
async def get_relationships(
    conn_id: str,
    metadata_service: MetadataService = Depends(get_metadata_service),
    connection_service: ConnectionService = Depends(get_connection_service)
):
    """
    Get relationships for a connection
    """
    try:
        # Get connection
        connection = await connection_service.get_connection(conn_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection with ID {conn_id} not found"
            )
        
        # Get relationships
        relationships = await metadata_service.get_relationships(connection)
        return relationships
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting relationships for connection {conn_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get relationships: {str(e)}"
        )