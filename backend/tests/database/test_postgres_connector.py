import pytest
import asyncpg
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from database.postgres_connector import PostgresConnector
from models.connection import Connection, ConnectionConfig

@pytest.fixture
def mock_connection():
    return Connection(
        id="conn1",
        name="Test PostgreSQL",
        type="postgres",
        config=ConnectionConfig(
            host="localhost",
            port=5432,
            database="test",
            user="user",
            password="password",
            ssl=True
        ),
        created_at=datetime.now(),
        updated_at=datetime.now()
    )

@pytest.fixture
def postgres_connector(mock_connection):
    return PostgresConnector(mock_connection)

class TestPostgresConnector:
    @pytest.mark.asyncio
    @patch('asyncpg.create_pool')
    async def test_connect(self, mock_create_pool, postgres_connector):
        # Setup mock pool
        mock_pool = AsyncMock()
        mock_create_pool.return_value = mock_pool
        
        # Call connect
        await postgres_connector.connect()
        
        # Verify create_pool was called with correct parameters
        mock_create_pool.assert_called_once_with(
            host="localhost",
            port=5432,
            user="user",
            password="password",
            database="test",
            ssl=True
        )
        
        # Verify pool was set
        assert postgres_connector.pool == mock_pool
    
    @pytest.mark.asyncio
    @patch('asyncpg.connect')
    async def test_test_connection(self, mock_connect, postgres_connector):
        # Setup mock connection
        mock_conn = AsyncMock()
        mock_conn.fetchval.return_value = "PostgreSQL 14.0"
        mock_conn.close = AsyncMock()
        mock_connect.return_value = mock_conn
        
        # Call test_connection
        success, message = await postgres_connector.test_connection()
        
        # Verify connect was called with correct parameters
        mock_connect.assert_called_once_with(
            host="localhost",
            port=5432,
            user="user",
            password="password",
            database="test",
            ssl=True
        )
        
        # Verify fetchval was called
        mock_conn.fetchval.assert_called_once_with('SELECT version()')
        
        # Verify close was called
        mock_conn.close.assert_called_once()
        
        # Verify result
        assert success is True
        assert "PostgreSQL 14.0" in message
    
    @pytest.mark.asyncio
    @patch('asyncpg.connect')
    async def test_test_connection_error(self, mock_connect, postgres_connector):
        # Setup mock connection to raise an exception
        mock_connect.side_effect = Exception("Connection error")
        
        # Call test_connection
        success, message = await postgres_connector.test_connection()
        
        # Verify result
        assert success is False
        assert "Connection error" in message
    
    @pytest.mark.asyncio
    @patch('asyncpg.create_pool')
    async def test_get_metadata(self, mock_create_pool, postgres_connector):
        # Setup mock pool and connection
        mock_conn = AsyncMock()
        mock_pool = AsyncMock()
        mock_pool.acquire.return_value.__aenter__.return_value = mock_conn
        mock_create_pool.return_value = mock_pool
        
        # Setup mock query results
        mock_table_records = [
            {
                'name': 'users',
                'schema': 'public',
                'description': 'User table',
                'type': 'table',
                'row_count': 1000
            }
        ]
        mock_column_records = [
            {
                'table_name': 'users',
                'name': 'id',
                'data_type': 'integer',
                'nullable': False,
                'description': 'User ID',
                'primary_key': True,
                'foreign_key': None
            },
            {
                'table_name': 'users',
                'name': 'name',
                'data_type': 'character varying',
                'nullable': False,
                'description': 'User name',
                'primary_key': False,
                'foreign_key': None
            }
        ]
        mock_relationship_records = [
            {
                'constraint_name': 'fk_test',
                'source_table': 'posts',
                'source_column': 'user_id',
                'target_table': 'users',
                'target_column': 'id'
            }
        ]
        
        # Set up mock responses for the three queries
        mock_conn.fetch.side_effect = [
            mock_table_records,
            mock_column_records,
            mock_relationship_records
        ]
        
        # Connect
        await postgres_connector.connect()
        
        # Get metadata
        tables, columns, relationships = await postgres_connector.get_metadata()
        
        # Verify fetch was called three times
        assert mock_conn.fetch.call_count == 3
        
        # Verify result counts
        assert len(tables) == 1
        assert len(columns) == 2
        assert len(relationships) == 1
        
        # Verify table content
        assert tables[0].name == 'users'
        assert tables[0].description == 'User table'
        
        # Verify column content
        assert columns[0].name == 'id'
        assert columns[0].primaryKey is True
        assert columns[1].name == 'name'
        assert columns[1].dataType == 'string'  # Normalized from 'character varying'
        
        # Verify relationship content
        assert relationships[0].sourceTable == 'posts'
        assert relationships[0].targetTable == 'users'
    
    @pytest.mark.asyncio
    @patch('asyncpg.create_pool')
    async def test_execute_query(self, mock_create_pool, postgres_connector):
        # Setup mock pool and connection
        mock_conn = AsyncMock()
        mock_pool = AsyncMock()
        mock_pool.acquire.return_value.__aenter__.return_value = mock_conn
        mock_create_pool.return_value = mock_pool
        
        # Setup mock prepare, statement, and records
        mock_statement = MagicMock()
        mock_statement.get_attributes.return_value = ['id', 'name']
        mock_record1 = {'id': 1, 'name': 'Test 1'}
        mock_record2 = {'id': 2, 'name': 'Test 2'}
        mock_statement.fetch.return_value = [mock_record1, mock_record2]
        mock_conn.prepare.return_value = mock_statement
        
        # Connect
        await postgres_connector.connect()
        
        # Execute query
        sql = "SELECT * FROM users"
        params = {'limit': 10}
        results, columns, execution_time = await postgres_connector.execute_query(sql, params)
        
        # Verify prepare was called
        mock_conn.prepare.assert_called_once_with(sql)
        
        # Verify fetch was called with parameters
        mock_statement.fetch.assert_called_once_with(10)
        
        # Verify results
        assert len(results) == 2
        assert results[0]['id'] == 1
        assert results[1]['name'] == 'Test 2'
        
        # Verify column info
        assert len(columns) == 2
        assert columns[0]['name'] == 'id'
        assert columns[1]['name'] == 'name'
        
        # Verify execution time is a float
        assert isinstance(execution_time, float)