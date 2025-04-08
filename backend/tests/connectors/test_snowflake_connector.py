"""Tests for the Snowflake connector."""

from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from connectors.snowflake_connector import SnowflakeConnector
from models.connection import Connection, ConnectionConfig


@pytest.fixture
def connection_config():
    """Create a test connection configuration."""
    return ConnectionConfig(
        account="testaccount",
        user="testuser",
        password="testpassword",
        warehouse="testwarehouse",
        database="testdatabase",
        schema="public",
    )


@pytest.fixture
def connection(connection_config):
    """Create a test connection."""
    return Connection(
        id="test-conn-id",
        name="Test Snowflake Connection",
        type="snowflake",
        config=connection_config,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )


@pytest.fixture
def mock_cursor():
    """Create a mock cursor."""
    cursor = MagicMock()
    cursor.description = [
        ["COL1", "STRING", None, None, None, None, None],
        ["COL2", 0, None, None, None, None, None],  # 0 is NUMBER type
    ]
    cursor.fetchall.return_value = [["value1", 123]]
    cursor.fetchone.return_value = ["test_plan"]
    cursor.fetchmany.side_effect = [[["value1", 123]], []]  # For streaming
    return cursor


@pytest.fixture
def mock_snowflake_client(mock_cursor):
    """Create a mock Snowflake client."""
    client = MagicMock()
    client.cursor.return_value = mock_cursor
    return client


@pytest.mark.asyncio
async def test_connect(connection):
    """Test the connect method."""
    with patch("snowflake.connector.connect") as mock_connect:
        connector = SnowflakeConnector(connection)
        await connector.connect()

        mock_connect.assert_called_once_with(
            user="testuser",
            password="testpassword",
            account="testaccount",
            warehouse="testwarehouse",
            database="testdatabase",
            schema="public",
            role=None,
        )


@pytest.mark.asyncio
async def test_test_connection(connection):
    """Test the test_connection method."""
    with patch("snowflake.connector.connect") as mock_connect:
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = ["Snowflake 5.0.0"]
        mock_connect.return_value.cursor.return_value = mock_cursor

        connector = SnowflakeConnector(connection)
        success, message = await connector.test_connection()

        assert success is True
        assert "Connection successful" in message
        assert "Snowflake 5.0.0" in message


@pytest.mark.asyncio
async def test_get_metadata(connection, mock_snowflake_client):
    """Test the get_metadata method."""
    mock_cursor = mock_snowflake_client.cursor.return_value
    mock_cursor.description = [
        ["NAME", "STRING", None, None, None, None, None],
        ["SCHEMA", "STRING", None, None, None, None, None],
        ["DESCRIPTION", "STRING", None, None, None, None, None],
        ["TYPE", "STRING", None, None, None, None, None],
        ["ROW_COUNT", 0, None, None, None, None, None],
    ]
    mock_cursor.fetchall.side_effect = [
        [["test_table", "public", "Test table", "BASE TABLE", 100]],  # Tables
        [
            ["test_table", "test_column", "VARCHAR", "YES", "Test column", False, None, None]
        ],  # Columns
    ]

    with patch("snowflake.connector.connect", return_value=mock_snowflake_client):
        connector = SnowflakeConnector(connection)
        connector.client = mock_snowflake_client

        tables, columns, relationships = await connector.get_metadata()

        assert len(tables) == 1
        assert tables[0].name == "test_table"
        assert tables[0].schema_name == "public"

        assert len(columns) == 1
        assert columns[0].name == "test_column"
        assert columns[0].tableName == "test_table"

        assert len(relationships) == 0


@pytest.mark.asyncio
async def test_execute_query(connection, mock_snowflake_client):
    """Test the execute_query method."""
    with patch("snowflake.connector.connect", return_value=mock_snowflake_client):
        connector = SnowflakeConnector(connection)
        connector.client = mock_snowflake_client

        results, columns, execution_time = await connector.execute_query("SELECT * FROM test_table")

        assert len(results) == 1
        assert results[0]["COL1"] == "value1"
        assert results[0]["COL2"] == 123

        assert len(columns) == 2
        assert columns[0].name == "COL1"
        assert columns[1].name == "COL2"

        mock_snowflake_client.cursor.return_value.execute.assert_called_once_with(
            "SELECT * FROM test_table"
        )


@pytest.mark.asyncio
async def test_execute_with_streaming(connection, mock_snowflake_client):
    """Test the execute_with_streaming method."""
    with patch("snowflake.connector.connect", return_value=mock_snowflake_client):
        connector = SnowflakeConnector(connection)
        connector.client = mock_snowflake_client

        results = []
        async for row in connector.execute_with_streaming("SELECT * FROM test_table"):
            results.append(row)

        assert len(results) == 1
        assert results[0]["COL1"] == "value1"
        assert results[0]["COL2"] == 123

        mock_snowflake_client.cursor.return_value.execute.assert_called_once_with(
            "SELECT * FROM test_table"
        )


@pytest.mark.asyncio
async def test_get_query_explanation(connection, mock_snowflake_client):
    """Test the get_query_explanation method."""
    with patch("snowflake.connector.connect", return_value=mock_snowflake_client):
        with patch("json.loads", return_value={"test": "plan"}):
            connector = SnowflakeConnector(connection)
            connector.client = mock_snowflake_client

            explanation = await connector.get_query_explanation("SELECT * FROM test_table")

            assert "plan" in explanation
            assert explanation["plan"] == {"test": "plan"}


@pytest.mark.asyncio
async def test_get_dialect(connection):
    """Test the get_dialect method."""
    connector = SnowflakeConnector(connection)
    dialect = connector.get_dialect()

    assert dialect == "snowflake"
