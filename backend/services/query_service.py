# app/services/query_service.py
import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from database.connector_factory import DatabaseConnectorFactory
from models.connection import Connection
from models.query import (
    ColumnInfo,
    QueryExplainResult,
    QueryHistoryEntry,
    QueryModel,
    QueryResult,
    QueryValidationResult,
)
from services.query_translator import SQLTranslator

logger = logging.getLogger(__name__)


class QueryService:
    """
    Service for handling queries
    """

    def __init__(self):
        """
        Initialize the query service
        """
        # In-memory storage for query history (would be replaced with a database in production)
        self.query_history = []

    async def execute_query(self, connection: Connection, query_model: QueryModel) -> QueryResult:
        """
        Execute a query

        Args:
            connection: The database connection
            query_model: The query model to execute

        Returns:
            Query result
        """
        try:
            # Create connector for the database
            connector = await DatabaseConnectorFactory.create_connector(connection)
            if not connector:
                raise ValueError(f"Unsupported database type: {connection.type}")

            # Connect to the database
            await connector.connect()

            # Create SQL translator
            translator = SQLTranslator(connector.get_dialect())

            # Translate query model to SQL
            sql = translator.translate(query_model)

            # Execute query
            results, column_info, execution_time = await connector.execute_query(sql)

            # Convert column info to ColumnInfo model
            columns = []
            for col in column_info:
                columns.append(ColumnInfo(name=col["name"], type=col["type"]))

            # Create query result
            result = QueryResult(
                columns=columns,
                data=results,
                rowCount=len(results),
                executionTime=execution_time,
                sql=sql,
                cacheHit=False,  # No caching implemented yet
                warnings=[],
            )

            return result

        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")

            # Return error result
            return QueryResult(
                columns=[],
                data=[],
                rowCount=0,
                executionTime=0,
                sql=sql if "sql" in locals() else "",
                cacheHit=False,
                error=str(e),
                suggestions=[
                    "Check your filter conditions",
                    "Verify table and column names",
                    "Simplify the query",
                ],
            )

    async def validate_query(
        self, connection: Connection, query_model: QueryModel
    ) -> QueryValidationResult:
        """
        Validate a query without executing it

        Args:
            connection: The database connection
            query_model: The query model to validate

        Returns:
            Validation result
        """
        try:
            # Create connector for the database
            connector = await DatabaseConnectorFactory.create_connector(connection)
            if not connector:
                raise ValueError(f"Unsupported database type: {connection.type}")

            # Connect to the database
            await connector.connect()

            # Create SQL translator
            translator = SQLTranslator(connector.get_dialect())

            # Translate query model to SQL
            sql = translator.translate(query_model)

            # For PostgreSQL, we can use EXPLAIN to validate the query
            if connection.type == "postgres":
                try:
                    await connector.get_query_explanation(sql)
                    return QueryValidationResult(valid=True, sql=sql)
                except Exception as validation_error:
                    return QueryValidationResult(
                        valid=False, errors=[str(validation_error)], sql=sql
                    )

            # For other databases, just return the SQL (can't validate without executing)
            return QueryValidationResult(
                valid=True,
                warnings=["Cannot validate query without executing for this database type"],
                sql=sql,
            )

        except Exception as e:
            logger.error(f"Error validating query: {str(e)}")

            # Return error result
            return QueryValidationResult(valid=False, errors=[str(e)], sql="")

    async def explain_query(
        self, connection: Connection, query_model: QueryModel
    ) -> QueryExplainResult:
        """
        Get the execution plan for a query

        Args:
            connection: The database connection
            query_model: The query model to explain

        Returns:
            Query explanation result
        """
        try:
            # Create connector for the database
            connector = await DatabaseConnectorFactory.create_connector(connection)
            if not connector:
                raise ValueError(f"Unsupported database type: {connection.type}")

            # Connect to the database
            await connector.connect()

            # Create SQL translator
            translator = SQLTranslator(connector.get_dialect())

            # Translate query model to SQL
            sql = translator.translate(query_model)

            # Get query explanation
            explanation = await connector.get_query_explanation(sql)

            # Create explain result
            result = QueryExplainResult(
                plan=json.dumps(explanation["plan"], indent=2)
                if isinstance(explanation["plan"], dict)
                else explanation["plan"],
                cost=explanation.get("cost"),
                details=explanation,
            )

            return result

        except Exception as e:
            logger.error(f"Error explaining query: {str(e)}")

            # Return error result
            return QueryExplainResult(plan=f"Error: {str(e)}", cost=None, details={})

    async def save_to_history(
        self, connection_id: str, query_model: QueryModel, result: QueryResult
    ) -> None:
        """
        Save a query to history

        Args:
            connection_id: The connection ID
            query_model: The query model
            result: The query result
        """
        try:
            # Create history entry
            entry = QueryHistoryEntry(
                id=f"qry_{uuid.uuid4().hex[:8]}",
                connectionId=connection_id,
                query=query_model,
                sql=result.sql,
                executionTime=result.executionTime,
                rowCount=result.rowCount,
                timestamp=datetime.now(),
                error=result.error,
            )

            # Add to history (would be saved to database in production)
            self.query_history.append(entry)

        except Exception as e:
            logger.error(f"Error saving to history: {str(e)}")

    async def get_history(
        self, limit: int = 10, offset: int = 0, connection_id: Optional[str] = None
    ) -> List[QueryHistoryEntry]:
        """
        Get query history

        Args:
            limit: Maximum number of entries to return
            offset: Offset for pagination
            connection_id: Optional connection ID to filter by

        Returns:
            List of history entries
        """
        try:
            # Filter by connection ID if provided
            if connection_id:
                filtered_history = [
                    entry for entry in self.query_history if entry.connectionId == connection_id
                ]
            else:
                filtered_history = self.query_history

            # Sort by timestamp (newest first)
            sorted_history = sorted(
                filtered_history, key=lambda entry: entry.timestamp, reverse=True
            )

            # Apply pagination
            paginated_history = sorted_history[offset : offset + limit]

            return paginated_history

        except Exception as e:
            logger.error(f"Error getting history: {str(e)}")
            return []

    async def get_query_by_id(self, query_id: str) -> Optional[QueryHistoryEntry]:
        """
        Get a specific query from history

        Args:
            query_id: The query ID

        Returns:
            Query history entry or None if not found
        """
        try:
            # Find query by ID
            for entry in self.query_history:
                if entry.id == query_id:
                    return entry

            return None

        except Exception as e:
            logger.error(f"Error getting query by ID: {str(e)}")
            return None
