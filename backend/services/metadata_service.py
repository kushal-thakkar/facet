"""Service for managing database metadata."""

import logging
from datetime import datetime
from typing import List, Optional

from connectors.connector_factory import DatabaseConnectorFactory
from models.connection import Connection
from models.metadata import (
    ColumnMetadata,
    MetadataUpdateRequest,
    RelationshipMetadata,
    TableMetadata,
)

logger = logging.getLogger(__name__)


class MetadataService:
    """Service for managing database metadata."""

    def __init__(self):
        """Initialize the metadata service."""
        # In-memory storage for metadata (would be replaced with a database in production)
        self.metadata = {}

    async def _get_metadata(self, connection: Connection, metadata_type: str):
        """Get metadata, refreshing from the database if not cached.

        Args:
            connection: The database connection
            metadata_type: Type of metadata to retrieve ("tables", "columns", or "relationships")

        Returns:
            The requested metadata

        Raises:
            Exception: If metadata cannot be retrieved
        """
        connection_id = connection.id

        # Check if we have cached metadata
        if connection_id in self.metadata and metadata_type in self.metadata[connection_id]:
            return self.metadata[connection_id][metadata_type]

        # Extract metadata from database
        await self.refresh_metadata(connection)

        # Get refreshed metadata
        if connection_id in self.metadata and metadata_type in self.metadata[connection_id]:
            return self.metadata[connection_id][metadata_type]

        # If we still don't have metadata, something went wrong
        raise ValueError(
            f"Failed to retrieve {metadata_type} metadata for connection {connection_id}"
        )

    async def get_tables(self, connection: Connection) -> List[TableMetadata]:
        """
        Get tables for a connection.

        Args:
            connection: The database connection

        Returns:
            List of tables
        """
        try:
            return await self._get_metadata(connection, "tables")
        except Exception as e:
            logger.error(f"Error getting tables: {str(e)}")
            raise

    async def get_table(self, connection: Connection, table_id: str) -> Optional[TableMetadata]:
        """
        Get metadata for a specific table.

        Args:
            connection: The database connection
            table_id: The table ID/name

        Returns:
            Table metadata or None if not found
        """
        try:
            # Get all tables
            tables = await self.get_tables(connection)

            # Find table by ID/name
            for table in tables:
                if table.name == table_id:
                    return table

            return None

        except Exception as e:
            logger.error(f"Error getting table {table_id}: {str(e)}")
            raise

    async def get_columns(self, connection: Connection, table_id: str) -> List[ColumnMetadata]:
        """
        Get columns for a specific table.

        Args:
            connection: The database connection
            table_id: The table ID/name

        Returns:
            List of columns
        """
        try:
            columns = await self._get_metadata(connection, "columns")

            # Filter columns for the specified table
            return [column for column in columns if column.tableName == table_id]

        except Exception as e:
            logger.error(f"Error getting columns for table {table_id}: {str(e)}")
            raise

    async def get_relationships(self, connection: Connection) -> List[RelationshipMetadata]:
        """
        Get relationships for a connection.

        Args:
            connection: The database connection

        Returns:
            List of relationships
        """
        try:
            return await self._get_metadata(connection, "relationships")
        except Exception as e:
            logger.error(f"Error getting relationships: {str(e)}")
            raise

    async def update_table_metadata(
        self, connection: Connection, table_id: str, metadata_update: MetadataUpdateRequest
    ) -> Optional[TableMetadata]:
        """
        Update metadata for a table.

        Args:
            connection: The database connection
            table_id: The table ID/name
            metadata_update: The metadata updates

        Returns:
            Updated table metadata or None if table not found
        """
        try:
            # Get table metadata
            table = await self.get_table(connection, table_id)
            if not table:
                return None

            # Update fields
            if metadata_update.displayName is not None:
                table.displayName = metadata_update.displayName

            if metadata_update.description is not None:
                table.description = metadata_update.description

            if metadata_update.category is not None:
                table.category = metadata_update.category

            if metadata_update.explorable is not None:
                table.explorable = metadata_update.explorable

            # Save metadata
            connection_id = connection.id
            if connection_id in self.metadata and "tables" in self.metadata[connection_id]:
                # Find and update the table
                for i, existing_table in enumerate(self.metadata[connection_id]["tables"]):
                    if existing_table.name == table_id:
                        self.metadata[connection_id]["tables"][i] = table
                        break

            return table

        except Exception as e:
            logger.error(f"Error updating table metadata for {table_id}: {str(e)}")
            raise

    async def refresh_metadata(self, connection: Connection) -> None:
        """
        Refresh metadata for a connection.

        Args:
            connection: The database connection
        """
        try:
            # Create connector for the database
            connector = await DatabaseConnectorFactory.create_connector(connection)
            if not connector:
                raise ValueError(f"Unsupported database type: {connection.type}")

            try:
                # Extract metadata from database
                tables, columns, relationships = await connector.get_metadata()

                # Update tables with refreshed timestamp
                for table in tables:
                    table.refreshedAt = datetime.now()

                # Store metadata
                connection_id = connection.id
                self.metadata[connection_id] = {
                    "tables": tables,
                    "columns": columns,
                    "relationships": relationships,
                }
            finally:
                # Ensure connector is properly closed
                await connector.close()

        except Exception as e:
            logger.error(f"Error refreshing metadata: {str(e)}")
            raise
