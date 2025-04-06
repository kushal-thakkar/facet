# app/database/connector_factory.py
"""Factory for creating database connectors based on connection type."""
import logging
from typing import Optional

from database.base_connector import DatabaseConnector
from database.clickhouse_connector import ClickHouseConnector
from database.postgres_connector import PostgresConnector
from models.connection import Connection

logger = logging.getLogger(__name__)


class DatabaseConnectorFactory:
    """Factory for creating database connectors."""

    @staticmethod
    async def create_connector(connection: Connection) -> Optional[DatabaseConnector]:
        """
        Create a connector for the given connection.

        Args:
            connection: The connection configuration

        Returns:
            A database connector instance, or None if the database type is not supported
        """
        try:
            logger.info(f"Creating connector for database type: {connection.type}")
            logger.info(
                f"Connection details: id={connection.id}, name={connection.name}, "
                f"database={connection.config.database}"
            )

            if connection.type == "postgres":
                logger.info("Creating PostgreSQL connector")
                return PostgresConnector(connection)
            elif connection.type == "clickhouse":
                logger.info("Creating ClickHouse connector")
                connector = ClickHouseConnector(connection)
                logger.info("ClickHouse connector created successfully")
                return connector
            else:
                logger.error(f"Unsupported database type: {connection.type}")
                return None
        except Exception as e:
            logger.error(f"Error creating connector for {connection.type}: {str(e)}")
            raise
