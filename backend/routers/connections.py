# app/routers/connections.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
import logging
import uuid
from datetime import datetime

from models.connection import (
    Connection, ConnectionConfig, ConnectionCreate, 
    ConnectionUpdate, ConnectionTestRequest, ConnectionTestResult
)
from database.connector_factory import DatabaseConnectorFactory
from services.connection_service import ConnectionService

# Create router
router = APIRouter()

# Setup logging
logger = logging.getLogger(__name__)

# Dependencies
def get_connection_service():
    return ConnectionService()

@router.get("/", response_model=List[Connection])
async def list_connections(
    service: ConnectionService = Depends(get_connection_service)
):
    """
    Get all connections
    """
    try:
        connections = await service.get_all_connections()
        return connections
    except Exception as e:
        logger.error(f"Error listing connections: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list connections: {str(e)}"
        )

@router.post("/", response_model=Connection, status_code=status.HTTP_201_CREATED)
async def create_connection(
    connection: ConnectionCreate,
    service: ConnectionService = Depends(get_connection_service)
):
    """
    Create a new connection
    """
    try:
        # Generate ID
        connection_id = f"conn_{uuid.uuid4().hex[:8]}"
        
        # Create connection object
        new_connection = Connection(
            id=connection_id,
            name=connection.name,
            type=connection.type,
            config=connection.config,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Save connection
        saved_connection = await service.create_connection(new_connection)
        return saved_connection
    except Exception as e:
        logger.error(f"Error creating connection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create connection: {str(e)}"
        )

@router.get("/{connection_id}", response_model=Connection)
async def get_connection(
    connection_id: str,
    service: ConnectionService = Depends(get_connection_service)
):
    """
    Get a connection by ID
    """
    try:
        connection = await service.get_connection(connection_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection with ID {connection_id} not found"
            )
        return connection
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting connection {connection_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get connection: {str(e)}"
        )

@router.put("/{connection_id}", response_model=Connection)
async def update_connection(
    connection_id: str,
    connection_update: ConnectionUpdate,
    service: ConnectionService = Depends(get_connection_service)
):
    """
    Update a connection
    """
    try:
        # Get existing connection
        existing_connection = await service.get_connection(connection_id)
        if not existing_connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection with ID {connection_id} not found"
            )
        
        # Update fields
        updated_connection = Connection(
            id=connection_id,
            name=connection_update.name,
            type=connection_update.type,
            config=connection_update.config,
            created_at=existing_connection.created_at,
            updated_at=datetime.now()
        )
        
        # Save updated connection
        result = await service.update_connection(updated_connection)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating connection {connection_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update connection: {str(e)}"
        )

@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(
    connection_id: str,
    service: ConnectionService = Depends(get_connection_service)
):
    """
    Delete a connection
    """
    try:
        # Check if connection exists
        existing_connection = await service.get_connection(connection_id)
        if not existing_connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection with ID {connection_id} not found"
            )
        
        # Delete connection
        await service.delete_connection(connection_id)
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting connection {connection_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete connection: {str(e)}"
        )

@router.post("/test", response_model=ConnectionTestResult)
async def test_connection(
    test_request: ConnectionTestRequest,
    service: ConnectionService = Depends(get_connection_service)
):
    """
    Test a connection
    """
    try:
        # Test connection
        result = await service.test_connection(
            test_request.type, 
            test_request.config
        )
        return result
    except Exception as e:
        logger.error(f"Error testing connection: {str(e)}")
        return ConnectionTestResult(
            success=False,
            message=f"Connection test failed: {str(e)}"
        )