"""Connector implementation for Snowflake databases."""

import asyncio
import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional, Tuple

import snowflake.connector

from connectors.base_connector import DatabaseConnector
from models.connection import Connection
from models.metadata import ColumnMetadata, RelationshipMetadata, TableMetadata
from models.query import ColumnInfo

logger = logging.getLogger(__name__)


class SnowflakeConnector(DatabaseConnector):
    """Connector for Snowflake databases."""

    def __init__(self, connection: Connection):
        """Initialize the connector with connection details.

        Args:
            connection: The connection configuration
        """
        super().__init__(connection)
        self.client = None
        self._executor = ThreadPoolExecutor(max_workers=5)

    async def connect(self) -> None:
        """Establish connection to the database."""
        if self.client:
            return

        try:
            # Log connection attempt
            logger.info(
                f"Connecting to Snowflake at {self.connection.config.account} "
                f"with DB {self.connection.config.database}"
            )

            # Create connection
            self.client = await self._run_in_executor(
                lambda: snowflake.connector.connect(
                    user=self.connection.config.user,
                    password=self.connection.config.password,
                    account=self.connection.config.account,
                    warehouse=self.connection.config.warehouse,
                    database=self.connection.config.database,
                    schema=getattr(self.connection.config, "snowflake_schema", "PUBLIC"),
                    role=getattr(self.connection.config, "role", None),
                )
            )

            logger.info("Snowflake client initialized successfully")

        except Exception as e:
            logger.error(f"Error connecting to Snowflake: {str(e)}")
            raise

    async def get_client(self):
        """Get the database client, connecting if necessary."""
        if not self.client:
            await self.connect()
        return self.client

    async def test_connection(self) -> Tuple[bool, str]:
        """
        Test if the connection is valid.

        Returns:
            Tuple of (success, message)
        """
        try:
            # Create a connection for testing
            conn = snowflake.connector.connect(
                user=self.connection.config.user,
                password=self.connection.config.password,
                account=self.connection.config.account,
                warehouse=self.connection.config.warehouse,
                database=self.connection.config.database,
                schema=getattr(self.connection.config, "snowflake_schema", "PUBLIC"),
                role=getattr(self.connection.config, "role", None),
            )

            # Test the connection with a simple query
            cursor = conn.cursor()
            cursor.execute("SELECT CURRENT_VERSION()")
            version = cursor.fetchone()[0]
            cursor.close()
            conn.close()

            return True, f"Connection successful. Snowflake version: {version}"

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
        tables: List[TableMetadata] = []
        columns: List[ColumnMetadata] = []
        relationships: List[RelationshipMetadata] = []

        try:
            logger.info(
                f"Fetching metadata for Snowflake database: {self.connection.config.database}"
            )

            # Check if we're using SNOWFLAKE_SAMPLE_DATA
            is_sample_data = "SNOWFLAKE_SAMPLE_DATA" in self.connection.config.database.upper()

            # For SNOWFLAKE_SAMPLE_DATA, we need to specify a schema
            if is_sample_data:
                # Use a specific schema for sample data like TPCH_SF1, TPCDS_SF10, etc.
                # Default to TPCH_SF1 if no schema is specified
                schema = getattr(self.connection.config, "snowflake_schema", "TPCH_SF1")

                tables_query = f"""
                SELECT
                    TABLE_NAME as name,
                    TABLE_SCHEMA as schema,
                    COMMENT as description,
                    TABLE_TYPE as type,
                    ROW_COUNT as row_count
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = '{schema}'
                ORDER BY TABLE_SCHEMA, TABLE_NAME
                """
            else:
                # Standard query for regular Snowflake databases
                tables_query = """
                SELECT
                    TABLE_NAME as name,
                    TABLE_SCHEMA as schema,
                    COMMENT as description,
                    TABLE_TYPE as type,
                    ROW_COUNT as row_count
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
                ORDER BY TABLE_SCHEMA, TABLE_NAME
                """

            client = await self.get_client()
            cursor = await self._run_in_executor(lambda: client.cursor().execute(tables_query))

            table_records = await self._run_in_executor(lambda: cursor.fetchall())

            column_names = [col[0].lower() for col in cursor.description]

            # Process table records
            for record in table_records:
                record_dict = dict(zip(column_names, record))
                table_type = "view" if record_dict.get("type") == "VIEW" else "table"

                tables.append(
                    TableMetadata(
                        name=record_dict.get("name"),
                        schema_name=record_dict.get("schema"),
                        description=record_dict.get("description"),
                        type=table_type,
                        rowCount=record_dict.get("row_count", 0),
                        explorable=True,
                    )
                )

            # For Snowflake sample data, we need a simpler query that doesn't rely on
            # KEY_COLUMN_USAGE
            # Check if we're using SNOWFLAKE_SAMPLE_DATA which has a different schema structure
            is_sample_data = "SNOWFLAKE_SAMPLE_DATA" in self.connection.config.database.upper()

            if is_sample_data:
                # Simplified query for sample data without foreign/primary key info
                columns_query = """
                SELECT
                    TABLE_NAME,
                    COLUMN_NAME as name,
                    DATA_TYPE as data_type,
                    IS_NULLABLE = 'YES' as nullable,
                    COMMENT as description,
                    false as primary_key,
                    null as referenced_table,
                    null as referenced_column
                FROM INFORMATION_SCHEMA.COLUMNS c
                WHERE c.TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
                ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
                """
            else:
                # Standard query with foreign/primary key info for regular Snowflake databases
                columns_query = """
                SELECT
                    TABLE_NAME,
                    COLUMN_NAME as name,
                    DATA_TYPE as data_type,
                    IS_NULLABLE = 'YES' as nullable,
                    COMMENT as description,
                    CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN true ELSE false END as primary_key,
                    fk.REFERENCED_TABLE as referenced_table,
                    fk.REFERENCED_COLUMN as referenced_column
                FROM INFORMATION_SCHEMA.COLUMNS c
                LEFT JOIN (
                    SELECT
                        kcu.COLUMN_NAME,
                        kcu.TABLE_NAME
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                        AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
                    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                ) pk ON pk.TABLE_NAME = c.TABLE_NAME AND pk.COLUMN_NAME = c.COLUMN_NAME
                LEFT JOIN (
                    SELECT
                        kcu.COLUMN_NAME,
                        kcu.TABLE_NAME,
                        ccu.TABLE_NAME as REFERENCED_TABLE,
                        ccu.COLUMN_NAME as REFERENCED_COLUMN
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                        AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
                    JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
                        ON tc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
                        AND tc.TABLE_SCHEMA = ccu.TABLE_SCHEMA
                    WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
                ) fk ON fk.TABLE_NAME = c.TABLE_NAME AND fk.COLUMN_NAME = c.COLUMN_NAME
                WHERE c.TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
                ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
                """

            client = await self.get_client()
            cursor = await self._run_in_executor(lambda: client.cursor().execute(columns_query))

            column_records = await self._run_in_executor(lambda: cursor.fetchall())

            column_names = [col[0].lower() for col in cursor.description]

            # Process column records
            for record in column_records:
                record_dict = dict(zip(column_names, record))

                # Map Snowflake types to normalized types
                data_type = record_dict.get("data_type", "").lower()
                normalized_type = data_type

                if (
                    "int" in data_type
                    or "number" in data_type
                    and "(" in data_type
                    and ",0)" in data_type
                ):
                    normalized_type = "integer"
                elif "number" in data_type or "float" in data_type or "double" in data_type:
                    normalized_type = "number"
                elif (
                    "varchar" in data_type
                    or "char" in data_type
                    or "text" in data_type
                    or "string" in data_type
                ):
                    normalized_type = "string"
                elif "bool" in data_type:
                    normalized_type = "boolean"
                elif "date" in data_type and "time" not in data_type:
                    normalized_type = "date"
                elif "timestamp" in data_type or "datetime" in data_type:
                    normalized_type = "timestamp"
                elif "variant" in data_type or "object" in data_type or "array" in data_type:
                    normalized_type = "json"

                # Build foreign key string if exists
                foreign_key = None
                if record_dict.get("referenced_table") and record_dict.get("referenced_column"):
                    ref_table = record_dict.get("referenced_table")
                    ref_col = record_dict.get("referenced_column")
                    foreign_key = f"{ref_table}.{ref_col}"

                columns.append(
                    ColumnMetadata(
                        name=record_dict.get("name"),
                        tableName=record_dict.get("table_name"),
                        dataType=normalized_type,
                        nullable=record_dict.get("nullable", True),
                        description=record_dict.get("description"),
                        primaryKey=record_dict.get("primary_key", False),
                        foreignKey=foreign_key,
                        explorable=True,
                    )
                )

            # Get relationships from foreign keys
            for column in columns:
                if column.foreignKey:
                    table_column = column.foreignKey.split(".")
                    if len(table_column) == 2:
                        relationships.append(
                            RelationshipMetadata(
                                sourceTable=column.tableName,
                                sourceColumn=column.name,
                                targetTable=table_column[0],
                                targetColumn=table_column[1],
                                relationship="many-to-one",
                                automatic=True,
                            )
                        )

        except Exception as e:
            logger.error(f"Error getting Snowflake metadata: {str(e)}")
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
        try:
            start_time = time.time()

            # Handle parameters
            if params:
                for key, value in params.items():
                    placeholder = f":{key}"
                    if placeholder in sql:
                        if isinstance(value, str):
                            sql = sql.replace(placeholder, f"'{value}'")
                        else:
                            sql = sql.replace(placeholder, str(value))

            # Execute query
            client = await self.get_client()
            cursor = await self._run_in_executor(lambda: client.cursor().execute(sql))

            # Get column information
            columns = []
            for col in cursor.description:
                columns.append(ColumnInfo(name=col[0], type=self._map_snowflake_type(col[1])))

            # Fetch rows
            rows = await self._run_in_executor(lambda: cursor.fetchall())

            # Convert to dict format
            results = []
            col_names = [col[0] for col in cursor.description]
            for row in rows:
                results.append(dict(zip(col_names, row)))

            execution_time = time.time() - start_time

            return results, columns, execution_time

        except Exception as e:
            logger.error(f"Error executing Snowflake query: {str(e)}")
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
        try:
            # Handle parameters
            if params:
                for key, value in params.items():
                    placeholder = f":{key}"
                    if placeholder in sql:
                        if isinstance(value, str):
                            sql = sql.replace(placeholder, f"'{value}'")
                        else:
                            sql = sql.replace(placeholder, str(value))

            # Snowflake uses EXPLAIN PLAN for query plans
            # Use this query to get the plan

            # First run the actual query, but get metadata only
            client = await self.get_client()
            query_sql = f"EXPLAIN USING JSON {sql}"
            cursor = await self._run_in_executor(lambda: client.cursor().execute(query_sql))

            # Get the query ID
            query_id = cursor.sfqid

            # Get the explain plan
            client = await self.get_client()
            cursor = await self._run_in_executor(
                lambda: client.cursor().execute(f"SELECT get_query_operator_stats('{query_id}')")
            )

            plan_json = await self._run_in_executor(lambda: cursor.fetchone()[0])

            # Parse the JSON result
            plan = json.loads(plan_json) if plan_json else {}

            return {
                "plan": plan,
                "cost": None,  # Snowflake doesn't provide cost in the same way as PostgreSQL
                "details": plan,
            }

        except Exception as e:
            logger.error(f"Error getting Snowflake query explanation: {str(e)}")
            raise

    def get_dialect(self) -> str:
        """
        Get SQL dialect information.

        Returns:
            String identifying the SQL dialect
        """
        return "snowflake"

    async def close(self) -> None:
        """Close the connection."""
        if self.client:
            try:
                await self._run_in_executor(lambda: self.client.close())
            except Exception as e:
                logger.error(f"Error closing Snowflake client: {str(e)}")
            finally:
                self.client = None

    async def _run_in_executor(self, func):
        """Run blocking calls in a thread pool."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._executor, func)

    def _map_snowflake_type(self, snowflake_type: str) -> str:
        """Map Snowflake type codes to type names."""
        type_map = {
            0: "number",  # NUMBER - could be "integer" or "number" based on scale/precision
            1: "number",  # REAL
            2: "string",  # TEXT
            3: "date",  # DATE
            4: "timestamp",  # TIMESTAMP
            5: "string",  # VARCHAR
            6: "boolean",  # BOOLEAN
            7: "json",  # OBJECT
            8: "json",  # ARRAY
        }
        # Convert snowflake_type to int if it's a string
        type_key = int(snowflake_type) if isinstance(snowflake_type, str) else snowflake_type
        return type_map.get(type_key, "string")

    async def __aenter__(self) -> "SnowflakeConnector":
        """Async context manager support."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Ensure connection is closed when exiting context."""
        await self.close()
