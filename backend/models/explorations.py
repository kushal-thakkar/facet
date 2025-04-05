# models/explorations.py
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

class Exploration(BaseModel):
    """
    Saved exploration
    """
    id: str
    name: str
    description: Optional[str] = None
    query: Dict[str, Any]  # The query model
    created_at: datetime
    updated_at: datetime
    last_run: Optional[datetime] = None

class ExplorationCreate(BaseModel):
    """
    Request model for creating a new exploration
    """
    name: str
    description: Optional[str] = None
    query: Dict[str, Any]

class ExplorationUpdate(BaseModel):
    """
    Request model for updating an existing exploration
    """
    name: Optional[str] = None
    description: Optional[str] = None
    query: Optional[Dict[str, Any]] = None