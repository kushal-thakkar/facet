"""Service for managing database connections."""

import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

import yaml

from connectors.connector_factory import DatabaseConnectorFactory
from models.connection import Connection, ConnectionConfig, ConnectionTestResult

logger = logging.getLogger(__name__)


class ConnectionService:
    """Service for managing database connections."""

    # Class variable to store active user sessions and their connections
    # In a production system, this could be a proper database or Redis store
    _active_connections: Dict[str, Any] = {}

    def __init__(self):
        """Initialize the connection service."""
        # Predefined connections from config
        self.predefined_connections = []

        # User session connections (in-memory storage)
        self.session_connections = []

        # Load predefined connections from YAML config
        self._load_predefined_connections()

    async def get_all_connections(self) -> List[Connection]:
        """
        Get all connections (predefined + session).

        Returns:
            List of connections
        """
        # Return both predefined and session connections
        return self.predefined_connections + self.session_connections

    async def get_connection(self, connection_id: str) -> Optional[Connection]:
        """
        Get a connection by ID.

        Args:
            connection_id: The connection ID

        Returns:
            Connection or None if not found
        """
        # Check predefined connections first
        for connection in self.predefined_connections:
            if connection.id == connection_id:
                return connection

        # Then check session connections
        for connection in self.session_connections:
            if connection.id == connection_id:
                return connection

        return None

    async def create_connection(self, connection: Connection) -> Connection:
        """
        Create a new temporary session connection.

        Args:
            connection: The connection to create

        Returns:
            The created connection
        """
        # Add to session connections list
        self.session_connections.append(connection)
        return connection

    async def update_connection(self, connection: Connection) -> Connection:
        """
        Update an existing session connection.

        Args:
            connection: The connection to update

        Returns:
            The updated connection
        """
        # Predefined connections cannot be modified
        for predefined in self.predefined_connections:
            if predefined.id == connection.id:
                logger.warning(f"Attempted to update predefined connection: {connection.id}")
                return predefined

        # Update session connection
        for i, existing_connection in enumerate(self.session_connections):
            if existing_connection.id == connection.id:
                self.session_connections[i] = connection
                break

        return connection

    async def delete_connection(self, connection_id: str) -> None:
        """
        Delete a session connection.

        Args:
            connection_id: The connection ID to delete
        """
        # Check if it's a predefined connection (which can't be deleted)
        for predefined in self.predefined_connections:
            if predefined.id == connection_id:
                logger.warning(f"Attempted to delete predefined connection: {connection_id}")
                return

        # Remove from session connections
        self.session_connections = [
            conn for conn in self.session_connections if conn.id != connection_id
        ]

    async def test_connection(
        self, connection_type: str, connection_config: ConnectionConfig
    ) -> ConnectionTestResult:
        """
        Test a connection.

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

    def _load_predefined_connections(self) -> None:
        """Load predefined connections from YAML config file."""
        try:
            # Path to the config file
            config_file = os.path.join(
                os.path.dirname(os.path.dirname(__file__)), "config", "connections.yaml"
            )

            logger.info(f"Attempting to load connections from: {config_file}")

            if os.path.exists(config_file):
                with open(config_file, "r") as f:
                    config_data = yaml.safe_load(f)

                logger.info(f"Loaded YAML: {config_data}")

                # Process connections from the YAML
                if config_data and "connections" in config_data:
                    for i, conn_data in enumerate(config_data["connections"]):
                        # Generate a stable ID for each predefined connection
                        conn_id = f"predef_{i}_{conn_data['type']}"

                        logger.info(
                            f"Creating connection: {conn_data['name']} ({conn_data['type']})"
                        )

                        # Process config to check for environment variable references
                        processed_config = self._process_env_variables(conn_data["config"])

                        connection = Connection(
                            id=conn_id,
                            name=conn_data["name"],
                            type=conn_data["type"],
                            config=ConnectionConfig(**processed_config),
                            created_at=datetime.now(),
                            updated_at=datetime.now(),
                        )

                        self.predefined_connections.append(connection)

                    logger.info(
                        f"Loaded {len(self.predefined_connections)} "
                        f"predefined connections from config"
                    )
                else:
                    logger.warning(
                        "Invalid config format: 'connections' key missing or config is empty"
                    )
            else:
                logger.warning(f"No connection config file found at {config_file}")
                # Check current directory for debugging
                current_dir = os.path.dirname(os.path.dirname(__file__))
                logger.info(f"Current directory: {current_dir}")

                # List files in config dir if it exists
                config_dir = os.path.join(current_dir, "config")
                if os.path.exists(config_dir):
                    logger.info(f"Files in config directory: {os.listdir(config_dir)}")
                else:
                    logger.warning(f"Config directory does not exist: {config_dir}")
        except Exception as e:
            logger.error(f"Error loading predefined connections: {str(e)}")

    def _process_env_variables(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process config values to substitute environment variables.

        Environment variables should be in the format ${FACET_VARIABLE_NAME}.

        Args:
            config: The connection configuration dictionary

        Returns:
            Processed configuration with environment variables substituted
        """
        processed_config = {}

        for key, value in config.items():
            if isinstance(value, str):
                # Check if the value contains an environment variable reference
                matches = re.findall(r"\${(FACET_[A-Z0-9_]+)}", value)
                if matches:
                    # Process all env var references in the string
                    new_value = value
                    for env_var in matches:
                        env_value = os.environ.get(env_var, "")
                        if not env_value:
                            logger.warning(f"Environment variable {env_var} not found or empty")
                        new_value = new_value.replace(f"${{{env_var}}}", env_value)
                    processed_config[key] = new_value
                else:
                    processed_config[key] = value
            else:
                # Non-string values are passed through unchanged
                processed_config[key] = value

        return processed_config
