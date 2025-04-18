"""Connector implementation for Google BigQuery databases."""

import asyncio
import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional, Tuple

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

            # Create credentials from service account JSON
            credentials_info = json.loads(self.connection.config.credentials_json)
            credentials = service_account.Credentials.from_service_account_info(credentials_info)

            # For public datasets like bigquery-public-data, we must use our own project ID
            # for creating jobs, while accessing the data from the public project
            self.client = bigquery.Client(
                project=self.connection.config.project_id, credentials=credentials
            )
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

            # TODO: Uncomment this when we have a scalable way to get datasets/tables
            # datasets = await self._run_in_executor(lambda: list(client.list_datasets()))
            # logger.info(f"Datasets: {datasets}")

            # For each dataset, get tables
            dataset_ids = [self.connection.config.bigquery_dataset_id]

            # Check if we're using a different project for dataset (like bigquery-public-data)
            dataset_project = getattr(
                self.connection.config,
                "bigquery_dataset_project_id",
                self.connection.config.project_id,
            )

            for dataset_id in dataset_ids:
                # TODO: Uncomment this when we have a scalable way to get datasets/tables
                # dataset_id = dataset

                logger.info(
                    f"Getting tables for dataset: {dataset_id} in project: {dataset_project}"
                )

                # Construct the fully qualified dataset ID if using a different project
                fully_qualified_dataset = (
                    f"{dataset_project}.{dataset_id}"
                    if dataset_project != self.connection.config.project_id
                    else dataset_id
                )

                # Get all tables in this dataset
                client = await self.get_client()
                bq_tables = await self._run_in_executor(
                    lambda: list(client.list_tables(fully_qualified_dataset))
                )
                logger.info(f"Tables: {bq_tables} for dataset: {dataset_id}")
                for table_ref in bq_tables:
                    table_id = table_ref.table_id

                    # For display purposes, include project in the ID if it's different
                    if dataset_project != self.connection.config.project_id:
                        full_table_id = f"{dataset_project}.{dataset_id}.{table_id}"
                    else:
                        full_table_id = f"{dataset_id}.{table_id}"

                    # Get detailed table information
                    client = await self.get_client()
                    table = await self._run_in_executor(
                        lambda: client.get_table(f"{fully_qualified_dataset}.{table_id}")
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

            # Enable query cache for better performance with frequently run queries
            job_config.use_query_cache = True

            # Set flatten_results to False to preserve nested structures (RECORD/STRUCT fields)
            # This is critical for tables with nested data like github_nested
            # When True (default), BigQuery flattens nested fields into dot-notation columns
            # When False, it preserves the nested structure,
            # allowing proper handling of complex records
            job_config.flatten_results = False

            logger.info(f"Executing BigQuery query with client project: {client.project}")
            job: QueryJob = await self._run_in_executor(
                lambda: client.query(sql, job_config=job_config)
            )

            logger.info(f"BigQuery job created with ID: {job.job_id}")
            results = await self._run_in_executor(lambda: list(job.result()))
            logger.info(f"BigQuery query returned {len(results)} rows")
            # FIXME Remove this
            logger.info(f"BigQuery results temp: {results[0]}")

            # Extract schema information
            columns = []
            if job.schema:  # Check if schema exists before iterating
                for field in job.schema:
                    columns.append(
                        ColumnInfo(
                            name=field.name,
                            type=field.field_type.lower(),
                        )
                    )
                logger.info(f"Extracted schema with {len(columns)} columns")
            else:
                logger.warning("No schema information available from BigQuery result")

            # Convert results to dictionaries
            result_dicts = []
            for row in results:
                try:
                    # Handle both regular and nested fields
                    result_dict = {}
                    for key, value in row.items():
                        if hasattr(value, "items"):  # This is a nested record
                            # Convert nested record to JSON string for display
                            try:
                                import json

                                result_dict[key] = json.dumps(dict(value.items()))
                            except Exception as nested_err:
                                logger.warning(
                                    f"Could not convert nested field {key}: {str(nested_err)}"
                                )
                                result_dict[key] = str(value)
                        else:
                            result_dict[key] = value

                    result_dicts.append(result_dict)
                except Exception as e:
                    logger.error(f"Error converting row to dict: {str(e)}")

            logger.info(f"Converted {len(result_dicts)} rows to dictionaries")

            execution_time = time.time() - start_time

            return result_dicts, columns, execution_time

        except Exception as e:
            logger.error(f"Error executing BigQuery query: {str(e)}")
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
