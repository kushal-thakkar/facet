"""Factory for creating database connectors based on connection type."""

import logging
from typing import Optional

from connectors.base_connector import DatabaseConnector
from connectors.bigquery_connector import BigQueryConnector
from connectors.clickhouse_connector import ClickHouseConnector
from connectors.postgres_connector import PostgresConnector
from connectors.snowflake_connector import SnowflakeConnector
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
            elif connection.type == "bigquery":
                logger.info("Creating BigQuery connector")
                connector = BigQueryConnector(connection)
                logger.info("BigQuery connector created successfully")
                return connector
            elif connection.type == "snowflake":
                logger.info("Creating Snowflake connector")
                connector = SnowflakeConnector(connection)
                logger.info("Snowflake connector created successfully")
                return connector
            else:
                logger.error(f"Unsupported database type: {connection.type}")
                return None
        except Exception as e:
            logger.error(f"Error creating connector for {connection.type}: {str(e)}")
            raise
