import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.services.query_service import QueryService
from app.models.connection import Connection, ConnectionConfig
from app.models.query import QueryModel, QueryResult, QuerySource

@pytest.fixture
def mock_connection():
    return Connection(
        id="conn1",
        name="Test Connection",
        type="postgres",
        config=ConnectionConfig(
            host="localhost",
            port=5432,
            database="test",
            user="user",
            password="password"
        ),
        created_at=datetime.now(),
        updated_at=datetime.now()
    )

@pytest.fixture
def mock_query_model():
    return QueryModel(
        source=QuerySource(connectionId="conn1", table="events"),
        filters=[],
        groupBy=[],
        metrics=[],
        limit=100
    )

@pytest.fixture
def mock_query_result():
    return QueryResult(
        columns=[{"name": "id", "type": "integer"}],
        data=[{"id": 1}, {"id": 2}],
        rowCount=2,
        executionTime=0.1,
        sql="SELECT * FROM events LIMIT 100",
        cacheHit=False,
        warnings=[]
    )

class TestQueryService:
    @pytest.mark.asyncio
    @patch('app.database.connector_factory.DatabaseConnectorFactory.create_connector')
    async def test_execute_query(self, mock_create_connector, mock_connection, mock_query_model, mock_query_result):
        # Setup mock connector
        mock_connector = AsyncMock()
        mock_connector.get_dialect.return_value = "postgresql"
        mock_connector.execute_query.return_value = (
            [{"id": 1}, {"id": 2}],  # results
            [{"name": "id", "type": "integer"}],  # columns
            0.1  # execution time
        )
        mock_create_connector.return_value = mock_connector
        
        # Create query service
        query_service = QueryService()
        
        # Execute query
        result = await query_service.execute_query(mock_connection, mock_query_model)
        
        # Verify connector was created with the correct connection
        mock_create_connector.assert_called_once_with(mock_connection)
        
        # Verify connect was called
        mock_connector.connect.assert_called_once()
        
        # Verify execute_query was called
        mock_connector.execute_query.assert_called_once()
        
        # Verify expected result
        assert result.rowCount == 2
        assert len(result.data) == 2
        assert result.executionTime == 0.1
        assert not result.cacheHit
        assert result.sql is not None
    
    @pytest.mark.asyncio
    @patch('app.database.connector_factory.DatabaseConnectorFactory.create_connector')
    async def test_execute_query_error(self, mock_create_connector, mock_connection, mock_query_model):
        # Setup mock connector to raise an exception
        mock_connector = AsyncMock()
        mock_connector.get_dialect.return_value = "postgresql"
        mock_connector.execute_query.side_effect = Exception("Test error")
        mock_create_connector.return_value = mock_connector
        
        # Create query service
        query_service = QueryService()
        
        # Execute query
        result = await query_service.execute_query(mock_connection, mock_query_model)
        
        # Verify error handling
        assert result.error is not None
        assert "Test error" in result.error
        assert result.data == []
        assert result.rowCount == 0
        assert len(result.suggestions) > 0
    
    @pytest.mark.asyncio
    @patch('app.database.connector_factory.DatabaseConnectorFactory.create_connector')
    async def test_validate_query(self, mock_create_connector, mock_connection, mock_query_model):
        # Setup mock connector
        mock_connector = AsyncMock()
        mock_connector.get_dialect.return_value = "postgresql"
        mock_connector.get_query_explanation.return_value = {"plan": "Test plan"}
        mock_create_connector.return_value = mock_connector
        
        # Create query service
        query_service = QueryService()
        
        # Validate query
        result = await query_service.validate_query(mock_connection, mock_query_model)
        
        # Verify connector was created
        mock_create_connector.assert_called_once()
        
        # Verify get_query_explanation was called
        mock_connector.get_query_explanation.assert_called_once()
        
        # Verify result
        assert result.valid is True
        assert len(result.errors) == 0
    
    @pytest.mark.asyncio
    async def test_save_to_history(self, mock_connection, mock_query_model, mock_query_result):
        # Create query service
        query_service = QueryService()
        
        # Initial state
        assert len(query_service.query_history) == 0
        
        # Save to history
        await query_service.save_to_history(
            mock_connection.id, 
            mock_query_model, 
            mock_query_result
        )
        
        # Verify entry was added
        assert len(query_service.query_history) == 1
        entry = query_service.query_history[0]
        assert entry.connectionId == mock_connection.id
        assert entry.sql == mock_query_result.sql
        assert entry.rowCount == mock_query_result.rowCount