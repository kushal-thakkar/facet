# app/models/metadata.py
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TableMetadata(BaseModel):
    """
    Metadata for a database table
    """

    name: str
    displayName: Optional[str] = None
    description: Optional[str] = None
    schema_name: Optional[str] = Field(None, alias="schema")
    type: str = "table"  # table, view, etc.
    rowCount: Optional[int] = None
    category: Optional[str] = None
    explorable: bool = True
    refreshedAt: Optional[datetime] = None
    columns: List[str] = []


class ColumnMetadata(BaseModel):
    """
    Metadata for a database column
    """

    name: str
    tableName: str
    displayName: Optional[str] = None
    description: Optional[str] = None
    dataType: str
    nullable: bool = True
    primaryKey: bool = False
    foreignKey: Optional[str] = None
    cardinality: Optional[str] = None  # low, medium, high
    specialType: Optional[str] = None  # timestamp, currency, etc.
    explorable: bool = True
    valueMap: Optional[Dict[str, str]] = None


class RelationshipMetadata(BaseModel):
    """
    Metadata for a relationship between tables
    """

    sourceTable: str
    sourceColumn: str
    targetTable: str
    targetColumn: str
    relationship: str  # one-to-one, one-to-many, many-to-one, many-to-many
    displayName: Optional[str] = None
    automatic: bool = True  # whether inferred from db or manually defined


class MetadataUpdateRequest(BaseModel):
    """
    Request model for updating metadata
    """

    displayName: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    explorable: Optional[bool] = None
    specialType: Optional[str] = None
    valueMap: Optional[Dict[str, str]] = None
