"""Connector implementation for ClickHouse databases."""

import logging
import time
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

import aiochclient
import aiohttp

from database.base_connector import DatabaseConnector
from models.connection import Connection
from models.metadata import ColumnMetadata, RelationshipMetadata, TableMetadata
from models.query import ColumnInfo

logger = logging.getLogger(__name__)


class ClickHouseConnector(DatabaseConnector):
    """Connector for ClickHouse databases."""

    def __init__(self, connection: Connection):
        """Initialize the connector with connection details.

        Args:
            connection: The connection configuration
        """
        super().__init__(connection)
        self.client = None
        self.session: Optional[aiohttp.ClientSession] = None

    async def connect(self) -> None:
        """Establish connection to the database."""
        if self.client:
            return

        try:
            # Log connection attempt
            logger.info(
                f"Connecting to ClickHouse at {self.connection.config.host}:"
                f"{self.connection.config.port} with database {self.connection.config.database}"
            )

            # Setup HTTP session
            session = aiohttp.ClientSession()
            self.session = session

            # Create protocol prefix based on https setting
            protocol = "https" if self.connection.config.https else "http"

            # Build connection URL
            url = f"{protocol}://{self.connection.config.host}:{self.connection.config.port}"
            logger.info(f"Using connection URL: {url}")

            # Create client
            self.client = aiochclient.ChClient(
                self.session,
                url=url,
                user=self.connection.config.user,
                password=self.connection.config.password,
                database=self.connection.config.database,
            )

        except Exception as e:
            logger.error(f"Error connecting to ClickHouse: {str(e)}")
            raise

    async def test_connection(self) -> Tuple[bool, str]:
        """
        Test if the connection is valid.

        Returns:
            Tuple of (success, message)
        """
        try:
            # Create a session for testing
            async with aiohttp.ClientSession() as session:
                # Create protocol prefix based on https setting
                protocol = "https" if self.connection.config.https else "http"

                # Build connection URL
                url = f"{protocol}://{self.connection.config.host}:{self.connection.config.port}"

                # Create client
                client = aiochclient.ChClient(
                    session,
                    url=url,
                    user=self.connection.config.user,
                    password=self.connection.config.password,
                    database=self.connection.config.database,
                )

                # Execute a simple query
                version = await client.fetchone("SELECT version() as version")

                return True, f"Connection successful. ClickHouse version: {version['version']}"
        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}")
            return False, f"Connection failed: {str(e)}"

    async def get_metadata(
        self,
    ) -> Tuple[List[TableMetadata], List[ColumnMetadata], List[RelationshipMetadata]]:
        """
        Extract metadata from the database.

        Returns:
            Tuple of (tables, columns, relationships)
        """
        await self.connect()

        tables: List[TableMetadata] = []
        columns: List[ColumnMetadata] = []
        relationships: List[RelationshipMetadata] = []

        try:
            logger.info(
                f"Fetching metadata for ClickHouse database: {self.connection.config.database}"
            )

            # Use the SHOW TABLES query which is reliable and works well
            # Get tables using SHOW TABLES command
            table_names: List[str] = []
            query = f"SHOW TABLES FROM {self.connection.config.database}"

            if self.client is None:
                raise RuntimeError("Client is not initialized")
            result = await self.client.fetch(query)

            if result:
                for row in result:
                    table_name = None
                    if isinstance(row, dict) and "name" in row:
                        table_name = row["name"]
                    elif hasattr(row, "__getitem__"):
                        try:
                            # In ClickHouse SHOW TABLES, the result might be a single value
                            if len(row) == 1:
                                table_name = row[0]
                            # Simple string result
                            elif isinstance(row, str):
                                table_name = row
                        except Exception as e:
                            logger.error(f"Error parsing row: {str(e)}")
                            pass
                    # Simple string result
                    elif isinstance(row, str):
                        table_name = row

                    if table_name:
                        table_names.append(table_name)

            logger.info(
                f"Found {len(table_names)} tables in {self.connection.config.database} database"
            )

            # Create table metadata objects
            for table_name in table_names:
                tables.append(
                    TableMetadata(
                        name=table_name,
                        schema_name=self.connection.config.database,
                        description=None,
                        type="table",
                        rowCount=0,
                        explorable=True,
                    )
                )

            # Get columns for tables we found
            for table_name in table_names:
                try:
                    column_query = f"DESCRIBE TABLE {self.connection.config.database}.{table_name}"
                    if self.client is None:
                        raise RuntimeError("Client is not initialized")
                    desc_result = await self.client.fetch(column_query)

                    for col in desc_result:
                        col_name = col.get("name")
                        col_type = col.get("type", "").lower()

                        # Simple type normalization
                        normalized_type = col_type
                        if "int" in col_type:
                            normalized_type = "integer"
                        elif any(
                            float_type in col_type for float_type in ["float", "double", "decimal"]
                        ):
                            normalized_type = "number"
                        elif any(str_type in col_type for str_type in ["string", "fixedstring"]):
                            normalized_type = "string"
                        elif "date" in col_type:
                            normalized_type = "date" if "datetime" not in col_type else "timestamp"
                        elif "array" in col_type:
                            normalized_type = "array"

                        columns.append(
                            ColumnMetadata(
                                name=col_name,
                                tableName=table_name,
                                dataType=normalized_type,
                                nullable=True,
                                description=None,
                                primaryKey=False,
                                explorable=True,
                            )
                        )
                except Exception as col_error:
                    logger.error(f"Error getting columns for {table_name}: {str(col_error)}")

        except Exception as e:
            logger.error(f"Error getting metadata: {str(e)}")
            raise

        return tables, columns, relationships

    async def execute_query(
        self, sql: str, params: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[Dict[str, Any]], List[ColumnInfo], float]:
        """
        Execute a SQL query and return results.

        Args:
            sql: The SQL query to execute
            params: Query parameters

        Returns:
            Tuple of (results, column_info, execution_time)
            where column_info is a list of ColumnInfo Pydantic models
        """
        await self.connect()

        try:
            start_time = time.time()

            # ClickHouse supports named parameters using {name:type}
            if params:
                # Convert params to ClickHouse format
                for key, value in params.items():
                    placeholder = f"{{{key}}}"
                    if placeholder in sql:
                        if isinstance(value, str):
                            sql = sql.replace(placeholder, f"'{value}'")
                        else:
                            sql = sql.replace(placeholder, str(value))

            # Execute query
            if self.client is None:
                raise RuntimeError("Client is not initialized")
            results = await self.client.fetch(sql)

            # Get column information from first row and convert to ColumnInfo Pydantic models
            columns = []
            if results and len(results) > 0:
                first_row = results[0]
                columns = [
                    ColumnInfo(name=key, type=type(value).__name__)
                    for key, value in first_row.items()
                ]

            execution_time = time.time() - start_time

            return results, columns, execution_time

        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            raise

    async def execute_with_streaming(
        self, sql: str, params: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute a SQL query with streaming results.

        Args:
            sql: The SQL query to execute
            params: Query parameters

        Returns:
            An async generator yielding result rows
        """
        await self.connect()

        try:
            # ClickHouse supports named parameters using {name:type}
            if params:
                # Convert params to ClickHouse format
                for key, value in params.items():
                    placeholder = f"{{{key}}}"
                    if placeholder in sql:
                        if isinstance(value, str):
                            sql = sql.replace(placeholder, f"'{value}'")
                        else:
                            sql = sql.replace(placeholder, str(value))

            # Execute query with iterate
            if self.client is None:
                raise RuntimeError("Client is not initialized")
            async for row in self.client.iterate(sql):
                yield row

        except Exception as e:
            logger.error(f"Error executing streaming query: {str(e)}")
            raise

    async def get_query_explanation(
        self, sql: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Get execution plan for a query.

        Args:
            sql: The SQL query to explain
            params: Query parameters

        Returns:
            Query plan information
        """
        await self.connect()

        try:
            # ClickHouse supports named parameters using {name:type}
            if params:
                # Convert params to ClickHouse format
                for key, value in params.items():
                    placeholder = f"{{{key}}}"
                    if placeholder in sql:
                        if isinstance(value, str):
                            sql = sql.replace(placeholder, f"'{value}'")
                        else:
                            sql = sql.replace(placeholder, str(value))

            # ClickHouse doesn't have a direct EXPLAIN like PostgreSQL
            # We can use EXPLAIN SYNTAX or EXPLAIN PLAN
            explain_sql = f"EXPLAIN PLAN {sql}"

            if self.client is None:
                raise RuntimeError("Client is not initialized")
            plan = await self.client.fetchone(explain_sql)

            return {
                "plan": plan.get("Plan", ""),
                "cost": None,  # ClickHouse doesn't provide cost estimates
                "details": plan,
            }

        except Exception as e:
            logger.error(f"Error getting query explanation: {str(e)}")
            raise

    def get_dialect(self) -> str:
        """
        Get SQL dialect information.

        Returns:
            String identifying the SQL dialect
        """
        return "clickhouse"

    async def close(self) -> None:
        """Close the connection."""
        if self.session:
            try:
                await self.session.close()
            except Exception as e:
                logger.error(f"Error closing session: {str(e)}")
            finally:
                self.session = None
                self.client = None

    async def __aenter__(self) -> "ClickHouseConnector":
        """Async context manager support."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Ensure connection is closed when exiting context."""
        await self.close()
