# app/database/connector_factory.py
import logging
from typing import Optional

from app.models.connection import Connection
from app.database.base_connector import DatabaseConnector
from app.database.postgres_connector import PostgresConnector
from app.database.clickhouse_connector import ClickHouseConnector

logger = logging.getLogger(__name__)

class DatabaseConnectorFactory:
    """
    Factory for creating database connectors
    """
    
    @staticmethod
    async def create_connector(connection: Connection) -> Optional[DatabaseConnector]:
        """
        Create a connector for the given connection
        
        Args:
            connection: The connection configuration
            
        Returns:
            A database connector instance, or None if the database type is not supported
        """
        try:
            if connection.type == "postgres":
                return PostgresConnector(connection)
            elif connection.type == "clickhouse":
                return ClickHouseConnector(connection)
            else:
                logger.error(f"Unsupported database type: {connection.type}")
                return None
        except Exception as e:
            logger.error(f"Error creating connector for {connection.type}: {str(e)}")
            raise