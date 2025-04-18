"""PostgreSQL database connector implementation."""

import logging
import time
from typing import Any, Dict, List, Optional, Tuple

import asyncpg

from connectors.base_connector import DatabaseConnector
from models.connection import Connection
from models.metadata import ColumnMetadata, RelationshipMetadata, TableMetadata
from models.query import ColumnInfo

logger = logging.getLogger(__name__)


class PostgresConnector(DatabaseConnector):
    """Connector for PostgreSQL databases."""

    def __init__(self, connection: Connection):
        """Initialize the connector with connection details.

        Args:
            connection: The connection configuration
        """
        super().__init__(connection)
        self.pool = None

    async def connect(self) -> None:
        """Establish connection to the database."""
        if self.pool:
            return

        try:
            self.pool = await asyncpg.create_pool(
                host=self.connection.config.host,
                port=self.connection.config.port,
                user=self.connection.config.user,
                password=self.connection.config.password,
                database=self.connection.config.database,
                ssl=self.connection.config.ssl,
                command_timeout=30,  # 30 second timeout for queries
                timeout=10,  # Connection timeout in seconds
                min_size=1,
                max_size=10,
            )
        except Exception as e:
            logger.error(f"Error connecting to PostgreSQL: {str(e)}")
            raise

    async def close(self) -> None:
        """Close the connection pool."""
        if self.pool:
            await self.pool.close()
            self.pool = None

    async def test_connection(self) -> Tuple[bool, str]:
        """Test if the connection is valid.

        Returns:
            Tuple of (success, message)
        """
        try:
            await self.connect()
            if self.pool is None:
                raise RuntimeError("Database connection pool is not initialized")
            async with self.pool.acquire() as conn:
                version = await conn.fetchval("SELECT version()")
                return True, f"Connection successful. PostgreSQL version: {version}"
        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}")
            return False, f"Connection failed: {str(e)}"

    async def get_metadata(
        self,
    ) -> Tuple[List[TableMetadata], List[ColumnMetadata], List[RelationshipMetadata]]:
        """Extract metadata from the database.

        Returns:
            Tuple of (tables, columns, relationships)
        """
        await self.connect()

        tables: List[TableMetadata] = []
        columns: List[ColumnMetadata] = []
        relationships: List[RelationshipMetadata] = []

        try:
            if self.pool is None:
                raise RuntimeError("Database connection pool is not initialized")
            async with self.pool.acquire() as conn:
                tables_query = """
                SELECT
                    t.table_name as name,
                    t.table_schema as schema,
                    obj_description(pgc.oid) as description,
                    CASE
                        WHEN t.table_type = 'VIEW' THEN 'view'
                        ELSE 'table'
                    END as type,
                    pg_stat_get_live_tuples(pgc.oid) as row_count
                FROM information_schema.tables t
                JOIN pg_class pgc ON pgc.relname = t.table_name
                JOIN pg_namespace n ON pgc.relnamespace = n.oid AND n.nspname = t.table_schema
                WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
                AND t.table_type IN ('BASE TABLE', 'VIEW')
                ORDER BY t.table_schema, t.table_name
                """

                table_records = await conn.fetch(tables_query)

                for record in table_records:
                    tables.append(
                        TableMetadata(
                            name=record["name"],
                            schema_name=record["schema"],
                            description=record["description"],
                            type=record["type"],
                            rowCount=record["row_count"],
                            explorable=True,
                        )
                    )

                columns_query = """
                SELECT
                    c.table_name,
                    c.column_name as name,
                    c.data_type,
                    c.is_nullable = 'YES' as nullable,
                    pg_catalog.col_description(pgc.oid, c.ordinal_position::int) as description,
                    CASE
                        WHEN pk.constraint_name IS NOT NULL THEN true
                        ELSE false
                    END as primary_key,
                    CASE
                        WHEN fk.constraint_name IS NOT NULL THEN
                            fk.referenced_table_name || '.' || fk.referenced_column_name
                        ELSE null
                    END as foreign_key
                FROM information_schema.columns c
                JOIN pg_class pgc ON pgc.relname = c.table_name
                JOIN pg_namespace n ON pgc.relnamespace = n.oid AND n.nspname = c.table_schema
                LEFT JOIN (
                    SELECT
                        tc.constraint_name,
                        kcu.table_name,
                        kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                        AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                ) pk ON pk.table_name = c.table_name AND pk.column_name = c.column_name
                LEFT JOIN (
                    SELECT
                        tc.constraint_name,
                        kcu.table_name,
                        kcu.column_name,
                        ccu.table_name as referenced_table_name,
                        ccu.column_name as referenced_column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                        AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage ccu
                        ON tc.constraint_name = ccu.constraint_name
                        AND tc.table_schema = ccu.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                ) fk ON fk.table_name = c.table_name AND fk.column_name = c.column_name
                WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY c.table_name, c.ordinal_position
                """

                column_records = await conn.fetch(columns_query)

                for record in column_records:
                    # Map PostgreSQL types to normalized types
                    data_type = record["data_type"].lower()
                    normalized_type = data_type

                    if "int" in data_type:
                        normalized_type = "integer"
                    elif data_type in ("real", "double precision", "numeric", "decimal"):
                        normalized_type = "number"
                    elif "char" in data_type or "text" in data_type:
                        normalized_type = "string"
                    elif "bool" in data_type:
                        normalized_type = "boolean"
                    elif "date" in data_type:
                        normalized_type = "date"
                    elif "time" in data_type:
                        normalized_type = "timestamp"
                    elif "json" in data_type:
                        normalized_type = "json"

                    columns.append(
                        ColumnMetadata(
                            name=record["name"],
                            tableName=record["table_name"],
                            dataType=normalized_type,
                            nullable=record["nullable"],
                            description=record["description"],
                            primaryKey=record["primary_key"],
                            foreignKey=record["foreign_key"],
                            explorable=True,
                        )
                    )

                relationships_query = """
                SELECT
                    tc.constraint_name,
                    kcu.table_name as source_table,
                    kcu.column_name as source_column,
                    ccu.table_name as target_table,
                    ccu.column_name as target_column
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage ccu
                    ON tc.constraint_name = ccu.constraint_name
                    AND tc.table_schema = ccu.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
                """

                relationship_records = await conn.fetch(relationships_query)

                for record in relationship_records:
                    relationship_type = "many-to-one"

                    relationships.append(
                        RelationshipMetadata(
                            sourceTable=record["source_table"],
                            sourceColumn=record["source_column"],
                            targetTable=record["target_table"],
                            targetColumn=record["target_column"],
                            relationship=relationship_type,
                            automatic=True,
                        )
                    )

        except Exception as e:
            logger.error(f"Error getting metadata: {str(e)}")
            raise

        return tables, columns, relationships

    async def execute_query(
        self, sql: str, params: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[Dict[str, Any]], List[ColumnInfo], float]:
        """Execute a SQL query and return results.

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
            param_values = list(params.values()) if params else []

            if self.pool is None:
                raise RuntimeError("Database connection pool is not initialized")
            async with self.pool.acquire() as conn:
                statement = await conn.prepare(sql)
                records = await statement.fetch(*param_values)

                columns = [
                    ColumnInfo(name=attr.name, type=attr.type.name)
                    for attr in statement.get_attributes()
                ]

                results = [dict(record) for record in records]

                execution_time = time.time() - start_time

                return results, columns, execution_time

        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            raise

    async def get_query_explanation(
        self, sql: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Get execution plan for a query.

        Args:
            sql: The SQL query to explain
            params: Query parameters

        Returns:
            Query plan information
        """
        await self.connect()

        try:
            param_values = list(params.values()) if params else []
            explain_sql = f"EXPLAIN (FORMAT JSON, ANALYZE, VERBOSE) {sql}"

            if self.pool is None:
                raise RuntimeError("Database connection pool is not initialized")
            async with self.pool.acquire() as conn:
                plan = await conn.fetchval(explain_sql, *param_values)

                return {"plan": plan[0], "cost": plan[0].get("Plan", {}).get("Total Cost")}

        except Exception as e:
            logger.error(f"Error getting query explanation: {str(e)}")
            raise

    def get_dialect(self) -> str:
        """Get SQL dialect information.

        Returns:
            String identifying the SQL dialect
        """
        return "postgresql"
