"""Models for saved explorations and related functionality."""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class Exploration(BaseModel):
    """Saved exploration."""

    id: str
    name: str
    description: Optional[str] = None
    query: Dict[str, Any]  # The query model
    created_at: datetime
    updated_at: datetime
    last_run: Optional[datetime] = None


class ExplorationCreate(BaseModel):
    """Request model for creating a new exploration."""

    name: str
    description: Optional[str] = None
    query: Dict[str, Any]


class ExplorationUpdate(BaseModel):
    """Request model for updating an existing exploration."""

    name: Optional[str] = None
    description: Optional[str] = None
    query: Optional[Dict[str, Any]] = None
