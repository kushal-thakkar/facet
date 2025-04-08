"""Connector implementation for Google BigQuery databases."""

import asyncio
import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

from google.cloud import bigquery
from google.cloud.bigquery.job import QueryJob
from google.oauth2 import service_account

from connectors.base_connector import DatabaseConnector
from models.connection import Connection
from models.metadata import ColumnMetadata, RelationshipMetadata, TableMetadata
from models.query import ColumnInfo

logger = logging.getLogger(__name__)


class BigQueryConnector(DatabaseConnector):
    """Connector for Google BigQuery databases."""

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
            logger.info(f"Connecting to BigQuery with project {self.connection.config.project_id}")

            # Determine authentication method
            if (
                hasattr(self.connection.config, "credentials_json")
                and self.connection.config.credentials_json
            ):
                # Create credentials from service account JSON
                credentials_info = json.loads(self.connection.config.credentials_json)
                credentials = service_account.Credentials.from_service_account_info(
                    credentials_info
                )
                self.client = bigquery.Client(
                    project=self.connection.config.project_id, credentials=credentials
                )
            else:
                # Default credentials (environment or service account)
                self.client = bigquery.Client(project=self.connection.config.project_id)

            logger.info("BigQuery client initialized successfully")

        except Exception as e:
            logger.error(f"Error connecting to BigQuery: {str(e)}")
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
            # Attempt to create a client for testing
            if (
                hasattr(self.connection.config, "credentials_json")
                and self.connection.config.credentials_json
            ):
                credentials_info = json.loads(self.connection.config.credentials_json)
                credentials = service_account.Credentials.from_service_account_info(
                    credentials_info
                )
                client = bigquery.Client(
                    project=self.connection.config.project_id, credentials=credentials
                )
            else:
                client = bigquery.Client(project=self.connection.config.project_id)

            # Run a simple query to check connection
            query = "SELECT 1"
            job = client.query(query)
            result = job.result()
            list(result)  # Run the query to verify connection

            return (
                True,
                f"Connection successful. Connected to project: {self.connection.config.project_id}",
            )

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
                f"Fetching metadata for BigQuery project: {self.connection.config.project_id}"
            )

            # Get datasets
            client = await self.get_client()
            datasets = await self._run_in_executor(lambda: list(client.list_datasets()))

            # For each dataset, get tables
            for dataset in datasets:
                dataset_id = dataset.dataset_id

                # Get all tables in this dataset
                client = await self.get_client()
                bq_tables = await self._run_in_executor(
                    lambda: list(client.list_tables(dataset_id))
                )

                for table_ref in bq_tables:
                    table_id = table_ref.table_id
                    full_table_id = f"{dataset_id}.{table_id}"

                    # Get detailed table information
                    client = await self.get_client()
                    table = await self._run_in_executor(
                        lambda: client.get_table(f"{dataset_id}.{table_id}")
                    )

                    # Determine table type
                    table_type = "table"
                    if table.table_type == "VIEW":
                        table_type = "view"

                    # Add table metadata
                    tables.append(
                        TableMetadata(
                            name=full_table_id,
                            schema_name=dataset_id,
                            description=table.description,
                            type=table_type,
                            rowCount=table.num_rows,
                            explorable=True,
                        )
                    )

                    # Add column metadata
                    for field in table.schema:
                        # Map BigQuery types to normalized types
                        bq_type = field.field_type.lower()
                        normalized_type = bq_type

                        if bq_type in ("integer", "int64"):
                            normalized_type = "integer"
                        elif bq_type in ("float", "float64", "numeric"):
                            normalized_type = "number"
                        elif bq_type in ("string", "bytes"):
                            normalized_type = "string"
                        elif bq_type == "boolean":
                            normalized_type = "boolean"
                        elif bq_type in ("date", "datetime", "timestamp"):
                            normalized_type = "timestamp" if "time" in bq_type else "date"
                        elif bq_type in ("record", "struct"):
                            normalized_type = "json"

                        columns.append(
                            ColumnMetadata(
                                name=field.name,
                                tableName=full_table_id,
                                dataType=normalized_type,
                                nullable=field.mode == "NULLABLE",
                                description=field.description,
                                primaryKey=False,  # BigQuery doesn't have primary keys
                                explorable=True,
                            )
                        )

        except Exception as e:
            logger.error(f"Error getting BigQuery metadata: {str(e)}")
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
                # BigQuery uses named parameters with @
                for key, value in params.items():
                    param_key = f"@{key}"
                    if param_key in sql:
                        # For string parameters, we need to add quotes
                        if isinstance(value, str):
                            sql = sql.replace(param_key, f"'{value}'")
                        else:
                            sql = sql.replace(param_key, str(value))

            # Execute query using thread pool
            client = await self.get_client()
            job_config = bigquery.QueryJobConfig()
            job: QueryJob = await self._run_in_executor(
                lambda: client.query(sql, job_config=job_config)
            )

            results = await self._run_in_executor(lambda: list(job.result()))

            # Extract schema information
            columns = []
            for field in job.schema:
                columns.append(
                    ColumnInfo(
                        name=field.name,
                        type=field.field_type.lower(),
                    )
                )

            # Convert results to dictionaries
            result_dicts = []
            for row in results:
                result_dicts.append(dict(row.items()))

            execution_time = time.time() - start_time

            return result_dicts, columns, execution_time

        except Exception as e:
            logger.error(f"Error executing BigQuery query: {str(e)}")
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
        try:
            # Handle parameters
            if params:
                # BigQuery uses named parameters with @
                for key, value in params.items():
                    param_key = f"@{key}"
                    if param_key in sql:
                        if isinstance(value, str):
                            sql = sql.replace(param_key, f"'{value}'")
                        else:
                            sql = sql.replace(param_key, str(value))

            # Execute query
            client = await self.get_client()
            job_config = bigquery.QueryJobConfig()
            job: QueryJob = await self._run_in_executor(
                lambda: client.query(sql, job_config=job_config)
            )

            # Stream results with a custom buffer to avoid blocking
            buffer_size = 100  # Number of rows to fetch at once

            # Create a queue to manage results
            queue: asyncio.Queue = asyncio.Queue(maxsize=buffer_size)
            fetching_done = asyncio.Event()

            # Start a task to fetch results
            async def fetch_results():
                try:
                    # Use batches to avoid holding up the event loop
                    rows_iter = job.result()
                    while True:
                        batch = []
                        for _ in range(buffer_size):
                            try:
                                row = next(rows_iter)
                                batch.append(dict(row.items()))
                            except StopIteration:
                                if batch:
                                    await queue.put(batch)
                                fetching_done.set()
                                return

                        await queue.put(batch)
                except Exception as e:
                    logger.error(f"Error streaming results: {str(e)}")
                    fetching_done.set()

            # Start fetching task
            asyncio.create_task(fetch_results())

            # Yield results from queue
            while not (fetching_done.is_set() and queue.empty()):
                if not queue.empty():
                    batch = await queue.get()
                    for row in batch:
                        yield row
                    queue.task_done()
                else:
                    await asyncio.sleep(0.01)

        except Exception as e:
            logger.error(f"Error executing BigQuery streaming query: {str(e)}")
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
            # Modify the query to use EXPLAIN
            explain_sql = f"EXPLAIN {sql}"

            # Handle parameters
            if params:
                for key, value in params.items():
                    param_key = f"@{key}"
                    if param_key in explain_sql:
                        if isinstance(value, str):
                            explain_sql = explain_sql.replace(param_key, f"'{value}'")
                        else:
                            explain_sql = explain_sql.replace(param_key, str(value))

            # Execute the explain query
            client = await self.get_client()
            job_config = bigquery.QueryJobConfig()
            job = await self._run_in_executor(
                lambda: client.query(explain_sql, job_config=job_config)
            )

            # Get the plan from the result
            results = await self._run_in_executor(lambda: list(job.result()))

            # Construct the plan
            plan_details = {}
            for row in results:
                plan_details.update(dict(row.items()))

            return {
                "plan": plan_details,
                "cost": None,  # BigQuery doesn't provide cost in the same way as PostgreSQL
                "details": plan_details,
            }

        except Exception as e:
            logger.error(f"Error getting BigQuery query explanation: {str(e)}")
            raise

    def get_dialect(self) -> str:
        """
        Get SQL dialect information.

        Returns:
            String identifying the SQL dialect
        """
        return "bigquery"

    async def close(self) -> None:
        """Close the connection."""
        if self.client:
            try:
                await self._run_in_executor(lambda: self.client.close())
            except Exception as e:
                logger.error(f"Error closing BigQuery client: {str(e)}")
            finally:
                self.client = None

    async def _run_in_executor(self, func):
        """Run blocking calls in a thread pool."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._executor, func)

    async def __aenter__(self) -> "BigQueryConnector":
        """Async context manager support."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Ensure connection is closed when exiting context."""
        await self.close()
