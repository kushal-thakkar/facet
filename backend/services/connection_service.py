# app/services/connection_service.py
import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

from database.connector_factory import DatabaseConnectorFactory
from models.connection import Connection, ConnectionConfig, ConnectionTestResult

logger = logging.getLogger(__name__)


class ConnectionService:
    """
    Service for managing database connections
    """

    def __init__(self):
        """
        Initialize the connection service
        """
        # In-memory storage for connections (would be replaced with a database in production)
        self.connections = []

        # Try to load connections from file (for development/testing)
        self._load_connections()

    async def get_all_connections(self) -> List[Connection]:
        """
        Get all connections

        Returns:
            List of connections
        """
        return self.connections

    async def get_connection(self, connection_id: str) -> Optional[Connection]:
        """
        Get a connection by ID

        Args:
            connection_id: The connection ID

        Returns:
            Connection or None if not found
        """
        for connection in self.connections:
            if connection.id == connection_id:
                return connection

        return None

    async def create_connection(self, connection: Connection) -> Connection:
        """
        Create a new connection

        Args:
            connection: The connection to create

        Returns:
            The created connection
        """
        # Add to connections list
        self.connections.append(connection)

        # Save connections to file (for development/testing)
        self._save_connections()

        return connection

    async def update_connection(self, connection: Connection) -> Connection:
        """
        Update an existing connection

        Args:
            connection: The connection to update

        Returns:
            The updated connection
        """
        # Find and update the connection
        for i, existing_connection in enumerate(self.connections):
            if existing_connection.id == connection.id:
                self.connections[i] = connection
                break

        # Save connections to file (for development/testing)
        self._save_connections()

        return connection

    async def delete_connection(self, connection_id: str) -> None:
        """
        Delete a connection

        Args:
            connection_id: The connection ID to delete
        """
        # Find and remove the connection
        self.connections = [conn for conn in self.connections if conn.id != connection_id]

        # Save connections to file (for development/testing)
        self._save_connections()

    async def test_connection(
        self, connection_type: str, connection_config: ConnectionConfig
    ) -> ConnectionTestResult:
        """
        Test a connection

        Args:
            connection_type: The connection type
            connection_config: The connection configuration

        Returns:
            Connection test result
        """
        try:
            # Create temporary connection object
            temp_connection = Connection(
                id="temp",
                name="Test Connection",
                type=connection_type,
                config=connection_config,
                created_at=None,
                updated_at=None,
            )

            # Create connector for the database
            connector = await DatabaseConnectorFactory.create_connector(temp_connection)
            if not connector:
                return ConnectionTestResult(
                    success=False, message=f"Unsupported database type: {connection_type}"
                )

            # Test connection
            success, message = await connector.test_connection()

            return ConnectionTestResult(success=success, message=message)

        except Exception as e:
            logger.error(f"Error testing connection: {str(e)}")
            return ConnectionTestResult(
                success=False, message=f"Error testing connection: {str(e)}"
            )

    def _load_connections(self) -> None:
        """
        Load connections from file (for development/testing)
        """
        try:
            # Check if connections file exists
            connections_file = "/app/connections.json"
            if os.path.exists(connections_file):
                with open(connections_file, "r") as f:
                    connections_data = json.load(f)

                # Convert to Connection objects
                self.connections = [Connection(**conn) for conn in connections_data]
                logger.info(f"Loaded {len(self.connections)} connections from connections.json")
            else:
                logger.info(f"No connections file found at {connections_file}")
        except Exception as e:
            logger.error(f"Error loading connections: {str(e)}")

    def _save_connections(self) -> None:
        """
        Save connections to file (for development/testing)
        """
        try:
            # Convert Connection objects to dictionaries
            connections_data = [conn.dict() for conn in self.connections]

            # Save to file with absolute path
            with open("/app/connections.json", "w") as f:
                json.dump(connections_data, f, default=str, indent=2)

            # Log success
            logger.info(f"Saved {len(connections_data)} connections to connections.json")
        except Exception as e:
            logger.error(f"Error saving connections: {str(e)}")
