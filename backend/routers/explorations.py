# app/routers/explorations.py
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from models.explorations import Exploration, ExplorationCreate, ExplorationUpdate
from services.connection_service import ConnectionService
from services.exploration_service import ExplorationService
from services.query_service import QueryService

# Create router
router = APIRouter()

# Setup logging
logger = logging.getLogger(__name__)


# Dependencies
def get_exploration_service():
    return ExplorationService()


def get_query_service():
    return QueryService()


def get_connection_service():
    return ConnectionService()


@router.get("/", response_model=List[Exploration])
async def list_explorations(service: ExplorationService = Depends(get_exploration_service)):
    """
    Get all explorations
    """
    try:
        explorations = await service.get_all_explorations()
        return explorations
    except Exception as e:
        logger.error(f"Error listing explorations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list explorations: {str(e)}",
        )


@router.post("/", response_model=Exploration, status_code=status.HTTP_201_CREATED)
async def create_exploration(
    exploration: ExplorationCreate, service: ExplorationService = Depends(get_exploration_service)
):
    """
    Create a new exploration
    """
    try:
        # Generate ID
        exploration_id = f"exp_{uuid.uuid4().hex[:8]}"

        # Create exploration object
        new_exploration = Exploration(
            id=exploration_id,
            name=exploration.name,
            description=exploration.description,
            query=exploration.query,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            last_run=None,
        )

        # Save exploration
        saved_exploration = await service.create_exploration(new_exploration)
        return saved_exploration
    except Exception as e:
        logger.error(f"Error creating exploration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create exploration: {str(e)}",
        )


@router.get("/{exploration_id}", response_model=Exploration)
async def get_exploration(
    exploration_id: str, service: ExplorationService = Depends(get_exploration_service)
):
    """
    Get an exploration by ID
    """
    try:
        exploration = await service.get_exploration(exploration_id)
        if not exploration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exploration with ID {exploration_id} not found",
            )
        return exploration
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting exploration {exploration_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get exploration: {str(e)}",
        )


@router.put("/{exploration_id}", response_model=Exploration)
async def update_exploration(
    exploration_id: str,
    exploration_update: ExplorationUpdate,
    service: ExplorationService = Depends(get_exploration_service),
):
    """
    Update an exploration
    """
    try:
        # Get existing exploration
        existing_exploration = await service.get_exploration(exploration_id)
        if not existing_exploration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exploration with ID {exploration_id} not found",
            )

        # Update fields
        updated_exploration = Exploration(
            id=exploration_id,
            name=exploration_update.name
            if exploration_update.name is not None
            else existing_exploration.name,
            description=exploration_update.description
            if exploration_update.description is not None
            else existing_exploration.description,
            query=exploration_update.query
            if exploration_update.query is not None
            else existing_exploration.query,
            created_at=existing_exploration.created_at,
            updated_at=datetime.now(),
            last_run=existing_exploration.last_run,
        )

        # Save updated exploration
        result = await service.update_exploration(updated_exploration)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating exploration {exploration_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update exploration: {str(e)}",
        )


@router.delete("/{exploration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exploration(
    exploration_id: str, service: ExplorationService = Depends(get_exploration_service)
):
    """
    Delete an exploration
    """
    try:
        # Check if exploration exists
        existing_exploration = await service.get_exploration(exploration_id)
        if not existing_exploration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exploration with ID {exploration_id} not found",
            )

        # Delete exploration
        await service.delete_exploration(exploration_id)
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting exploration {exploration_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete exploration: {str(e)}",
        )


@router.post("/{exploration_id}/execute", status_code=status.HTTP_200_OK)
async def execute_exploration(
    exploration_id: str,
    exploration_service: ExplorationService = Depends(get_exploration_service),
    query_service: QueryService = Depends(get_query_service),
    connection_service: ConnectionService = Depends(get_connection_service),
):
    """
    Execute a saved exploration
    """
    try:
        # Get exploration
        exploration = await exploration_service.get_exploration(exploration_id)
        if not exploration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exploration with ID {exploration_id} not found",
            )

        # Get connection ID from query
        connection_id = exploration.query.get("source", {}).get("connectionId")
        if not connection_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exploration query does not have a connection ID",
            )

        # Get connection
        connection = await connection_service.get_connection(connection_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection with ID {connection_id} not found",
            )

        # Execute query
        result = await query_service.execute_query(connection, exploration.query)

        # Update last run timestamp
        updated_exploration = Exploration(
            id=exploration_id,
            name=exploration.name,
            description=exploration.description,
            query=exploration.query,
            created_at=exploration.created_at,
            updated_at=exploration.updated_at,
            last_run=datetime.now(),
        )

        await exploration_service.update_exploration(updated_exploration)

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing exploration {exploration_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute exploration: {str(e)}",
        )
