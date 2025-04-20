"""Service for handling database queries."""

import logging

from connectors.connector_factory import DatabaseConnectorFactory
from models.connection import Connection
from models.query import (
    QueryModel,
    QueryResult,
)
from services.query_translator import SQLTranslator

logger = logging.getLogger(__name__)


class QueryService:
    """Service for handling queries."""

    def __init__(self):
        """Initialize the query service."""
        pass

    async def execute_query(self, connection: Connection, query_model: QueryModel) -> QueryResult:
        """Execute a query.

        Args:
            connection: The database connection
            query_model: The query model to execute

        Returns:
            Query result
        """
        connector = None
        try:
            connector = await DatabaseConnectorFactory.create_connector(connection)
            if not connector:
                raise ValueError(f"Unsupported database type: {connection.type}")

            await connector.connect()
            translator = SQLTranslator(connector.get_dialect())

            # Initialize pagination-related values
            totalCount = 0
            hasMore = False

            # Only calculate totalCount if this is a null limit request (server-side pagination)
            # We only need this for preview and table views
            is_server_side_pagination_enabled = query_model.isServerPagination is True
            is_table_or_preview = query_model.visualization and query_model.visualization.type in [
                "preview",
                "table",
            ]

            if is_server_side_pagination_enabled and is_table_or_preview:
                # Create a count query version (without pagination)
                count_query_model = QueryModel(**query_model.dict())
                count_query_model.limit = None  # Only modify the copy
                count_query_model.offset = None  # Only modify the copy

                # Get total count for the query
                count_query = translator.translate_count(count_query_model)
                logger.info(f"Executing count SQL: {count_query}")
                count_result, _, _ = await connector.execute_query(count_query)
                if count_result and len(count_result) > 0:
                    totalCount = count_result[0]["count"]

            # Execute the main query with pagination
            # Log all key query model properties for debugging
            logger.info(
                f"Query model in service - limit: {query_model.limit}, "
                f"offset: {query_model.offset}, type: {type(query_model.offset)}"
            )
            sql = translator.translate(query_model)
            logger.info(f"Executing SQL: {sql}")

            results, columns, execution_time = await connector.execute_query(sql)

            # Determine if there are more results - only when server side pagination is enabled
            if is_server_side_pagination_enabled:
                current_offset = query_model.offset
                hasMore = current_offset + len(results) < totalCount

            result = QueryResult(
                columns=columns,
                data=results,
                rowCount=len(results),
                totalCount=totalCount,
                executionTime=execution_time,
                sql=sql,
                cacheHit=False,  # No caching implemented yet
                warnings=[],
                hasMore=hasMore,
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
            )
        finally:
            if connector:
                await connector.close()
