# app/database/clickhouse_connector.py
import logging
import time
from typing import List, Dict, Any, Optional, Tuple, AsyncGenerator
import aiochclient
import aiohttp
import json

from models.connection import Connection
from models.metadata import TableMetadata, ColumnMetadata, RelationshipMetadata
from database.base_connector import DatabaseConnector

logger = logging.getLogger(__name__)

class ClickHouseConnector(DatabaseConnector):
    """
    Connector for ClickHouse databases
    """
    
    def __init__(self, connection: Connection):
        """
        Initialize the connector with connection details
        
        Args:
            connection: The connection configuration
        """
        super().__init__(connection)
        self.client = None
        self.session = None
    
    async def connect(self) -> None:
        """
        Establish connection to the database
        """
        if self.client:
            return
        
        try:
            # Setup HTTP session
            self.session = aiohttp.ClientSession()
            
            # Create protocol prefix based on https setting
            protocol = "https" if self.connection.config.https else "http"
            
            # Build connection URL
            url = f"{protocol}://{self.connection.config.host}:{self.connection.config.port}"
            
            # Setup auth
            auth = {
                "user": self.connection.config.user,
                "password": self.connection.config.password
            }
            
            # Create client
            self.client = aiochclient.ChClient(
                self.session,
                url=url,
                user=auth["user"],
                password=auth["password"],
                database=self.connection.config.database
            )
        except Exception as e:
            logger.error(f"Error connecting to ClickHouse: {str(e)}")
            raise
    
    async def test_connection(self) -> Tuple[bool, str]:
        """
        Test if the connection is valid
        
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
                    database=self.connection.config.database
                )
                
                # Execute a simple query
                version = await client.fetchone("SELECT version() as version")
                
                return True, f"Connection successful. ClickHouse version: {version['version']}"
        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}")
            return False, f"Connection failed: {str(e)}"
    
    async def get_metadata(self) -> Tuple[List[TableMetadata], List[ColumnMetadata], List[RelationshipMetadata]]:
        """
        Extract metadata from the database
        
        Returns:
            Tuple of (tables, columns, relationships)
        """
        await self.connect()
        
        tables = []
        columns = []
        relationships = []
        
        try:
            # Get tables
            tables_query = f"""
            SELECT 
                name,
                database as schema,
                engine,
                total_rows as row_count
            FROM system.tables
            WHERE database = '{self.connection.config.database}'
            ORDER BY name
            """
            
            table_records = await self.client.fetch(tables_query)
            
            for record in table_records:
                tables.append(TableMetadata(
                    name=record['name'],
                    schema_name=record['schema'],
                    description=None,
                    type="table",
                    rowCount=record['row_count'],
                    explorable=True
                ))
            
            # Get columns
            columns_query = f"""
            SELECT 
                table,
                name,
                type,
                is_in_primary_key,
                default_kind
            FROM system.columns
            WHERE database = '{self.connection.config.database}'
            ORDER BY table, position
            """
            
            column_records = await self.client.fetch(columns_query)
            
            for record in column_records:
                # Map ClickHouse types to normalized types
                ch_type = record['type'].lower()
                normalized_type = ch_type
                
                if 'int' in ch_type:
                    normalized_type = 'integer'
                elif any(float_type in ch_type for float_type in ['float', 'double', 'decimal']):
                    normalized_type = 'number'
                elif any(str_type in ch_type for str_type in ['string', 'fixedstring']):
                    normalized_type = 'string'
                elif 'date' in ch_type:
                    normalized_type = 'date' if 'datetime' not in ch_type else 'timestamp'
                elif ch_type == 'array':
                    normalized_type = 'array'
                
                columns.append(ColumnMetadata(
                    name=record['name'],
                    tableName=record['table'],
                    dataType=normalized_type,
                    nullable=True,  # ClickHouse doesn't have NOT NULL constraint
                    description=None,
                    primaryKey=record['is_in_primary_key'],
                    explorable=True
                ))
            
            # ClickHouse doesn't have foreign key constraints like traditional RDBMS
            # For relationships, we would need to infer them from naming conventions
            # or use additional metadata
        
        except Exception as e:
            logger.error(f"Error getting metadata: {str(e)}")
            raise
        
        return tables, columns, relationships
    
    async def execute_query(self, sql: str, params: Optional[Dict[str, Any]] = None) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], float]:
        """
        Execute a SQL query and return results
        
        Args:
            sql: The SQL query to execute
            params: Query parameters
            
        Returns:
            Tuple of (results, columns, execution_time)
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
            results = await self.client.fetch(sql)
            
            # Get column information from first row
            columns = []
            if results and len(results) > 0:
                first_row = results[0]
                columns = [
                    {
                        "name": key,
                        "type": type(value).__name__
                    }
                    for key, value in first_row.items()
                ]
            
            execution_time = time.time() - start_time
            
            return results, columns, execution_time
        
        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            raise
    
    async def execute_with_streaming(self, sql: str, params: Optional[Dict[str, Any]] = None) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute a SQL query with streaming results
        
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
            async for row in self.client.iterate(sql):
                yield row
        
        except Exception as e:
            logger.error(f"Error executing streaming query: {str(e)}")
            raise
    
    async def get_query_explanation(self, sql: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Get execution plan for a query
        
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
            
            plan = await self.client.fetchone(explain_sql)
            
            return {
                "plan": plan.get("Plan", ""),
                "cost": None,  # ClickHouse doesn't provide cost estimates
                "details": plan
            }
        
        except Exception as e:
            logger.error(f"Error getting query explanation: {str(e)}")
            raise
    
    def get_dialect(self) -> str:
        """
        Get SQL dialect information
        
        Returns:
            String identifying the SQL dialect
        """
        return "clickhouse"
    
    async def close(self) -> None:
        """
        Close the connection
        """
        if self.session:
            await self.session.close()
            self.session = None
            self.client = None