# app/database/base_connector.py
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple

from models.connection import Connection
from models.metadata import ColumnMetadata, RelationshipMetadata, TableMetadata


class DatabaseConnector(ABC):
    """
    Base class for all database connectors
    """

    def __init__(self, connection: Connection):
        """
        Initialize the connector with connection details

        Args:
            connection: The connection configuration
        """
        self.connection = connection

    @abstractmethod
    async def connect(self) -> None:
        """
        Establish connection to the database
        """
        pass

    @abstractmethod
    async def test_connection(self) -> Tuple[bool, str]:
        """
        Test if the connection is valid

        Returns:
            Tuple of (success, message)
        """
        pass

    @abstractmethod
    async def get_metadata(
        self,
    ) -> Tuple[List[TableMetadata], List[ColumnMetadata], List[RelationshipMetadata]]:
        """
        Extract metadata from the database

        Returns:
            Tuple of (tables, columns, relationships)
        """
        pass

    @abstractmethod
    async def execute_query(
        self, sql: str, params: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], float]:
        """
        Execute a SQL query and return results

        Args:
            sql: The SQL query to execute
            params: Query parameters

        Returns:
            Tuple of (results, columns, execution_time)
        """
        pass

    @abstractmethod
    async def execute_with_streaming(self, sql: str, params: Optional[Dict[str, Any]] = None):
        """
        Execute a SQL query with streaming results

        Args:
            sql: The SQL query to execute
            params: Query parameters

        Returns:
            An async generator yielding result rows
        """
        pass

    @abstractmethod
    async def get_query_explanation(
        self, sql: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Get execution plan for a query

        Args:
            sql: The SQL query to explain
            params: Query parameters

        Returns:
            Query plan information
        """
        pass

    @abstractmethod
    def get_dialect(self) -> str:
        """
        Get SQL dialect information

        Returns:
            String identifying the SQL dialect
        """
        pass
