# app/services/query_service.py
"""Service for handling database queries."""
import logging

from database.connector_factory import DatabaseConnectorFactory
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
            sql = translator.translate(query_model)
            logger.info(f"Executing SQL: {sql}")

            results, columns, execution_time = await connector.execute_query(sql)
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
            )
        finally:
            if connector:
                await connector.close()
