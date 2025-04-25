"""Models for query representation and execution."""

from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel


class FilterCondition(BaseModel):
    """A single filter condition."""

    column: str
    operator: str
    value: Any


class LogicalFilterGroup(BaseModel):
    """A group of filter conditions with a logical operator."""

    logic: str  # 'and' or 'or'
    conditions: List[Union["FilterCondition", "LogicalFilterGroup"]]


# Resolve forward references
LogicalFilterGroup.update_forward_refs()


class TimeRange(BaseModel):
    """Time range specification."""

    column: Optional[str] = None
    range: str  # last_7_days, this_month, etc.
    granularity: Optional[str] = None
    customRange: Optional[Dict[str, str]] = None


class Comparison(BaseModel):
    """Comparison specification."""

    enabled: bool
    range: str  # previous_period, previous_year, etc.


class Metric(BaseModel):
    """Aggregation function specification (shown as "Aggregate" in the UI)."""

    column: Optional[str] = None
    function: str  # aggregate function: count, sum, avg, min, max
    alias: str


class SortOrder(BaseModel):
    """Sort order specification."""

    column: str
    direction: str  # asc, desc


class Visualization(BaseModel):
    """Visualization specification."""

    type: str
    config: Dict[str, Any] = {}


class QuerySource(BaseModel):
    """Source table for a query."""

    connectionId: str
    table: str


class QueryModel(BaseModel):
    """JSON query model."""

    source: Optional[QuerySource] = None
    filters: List[Union[FilterCondition, LogicalFilterGroup]] = []
    groupBy: List[str] = []
    agg: List[Metric] = []
    timeRange: Optional[TimeRange] = None
    comparison: Optional[Comparison] = None
    sort: List[SortOrder] = []
    limit: Optional[int] = 100
    offset: Optional[int] = None
    isServerPagination: bool = False  # Flag to indicate server-side pagination
    visualization: Optional[Visualization] = None
    selectedFields: List[str] = []  # Added for field selection
    granularity: Optional[str] = None  # For time-based aggregation


class QueryRequest(BaseModel):
    """Request model for executing a query."""

    connectionId: str
    query: QueryModel


class QueryValidationRequest(BaseModel):
    """Request model for validating a query."""

    connectionId: str
    query: QueryModel


class QueryExplainRequest(BaseModel):
    """Request model for explaining a query."""

    connectionId: str
    query: QueryModel


class ColumnInfo(BaseModel):
    """Information about a column in query results."""

    name: str
    type: Optional[str] = None
    cardinality: Optional[str] = None


class QueryResult(BaseModel):
    """Result of a query execution."""

    columns: List[ColumnInfo]
    data: List[Dict[str, Any]]
    rowCount: int
    totalCount: Optional[int] = (
        None  # Total count without pagination limit (server-side pagination)
    )
    executionTime: float
    sql: str
    warnings: List[str] = []
    error: Optional[str] = None
    suggestions: Optional[List[str]] = None
    hasMore: bool = False  # Indicates if there are more results available (server-side pagination)


class QueryValidationResult(BaseModel):
    """Result of a query validation."""

    valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    sql: str


class QueryExplainResult(BaseModel):
    """Result of a query explanation."""

    plan: str
    cost: Optional[float] = None
    details: Dict[str, Any] = {}


class QueryHistoryEntry(BaseModel):
    """An entry in the query history."""

    id: str
    connectionId: str
    query: QueryModel
    sql: str
    executionTime: float
    rowCount: int
    timestamp: datetime
    error: Optional[str] = None
