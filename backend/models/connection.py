"""Models for database connection configuration and management."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ConnectionConfig(BaseModel):
    """Configuration for a database connection.

    This will vary based on the database type.
    """

    # Common fields that might be present
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    user: Optional[str] = None
    password: Optional[str] = None
    ssl: Optional[bool] = None

    # Allow any other fields that might be specific to a database type
    class Config:
        """Configuration for the model."""

        extra = "allow"


class Connection(BaseModel):
    """Database connection information."""

    id: str
    name: str
    type: str  # postgres, clickhouse, etc.
    config: ConnectionConfig
    created_at: datetime
    updated_at: datetime
    bigquery_dataset_id: Optional[str] = None
    bigquery_dataset_project_id: Optional[str] = None  # needed for samples dataset in BigQuery


class ConnectionCreate(BaseModel):
    """Request model for creating a new connection."""

    name: str
    type: str
    config: ConnectionConfig


class ConnectionUpdate(BaseModel):
    """Request model for updating an existing connection."""

    name: str
    type: str
    config: ConnectionConfig


class ConnectionTestRequest(BaseModel):
    """Request model for testing a connection."""

    type: str
    config: ConnectionConfig


class ConnectionTestResult(BaseModel):
    """Result of a connection test."""

    success: bool
    message: str
