"""Tests for the BigQuery connector."""

from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from connectors.bigquery_connector import BigQueryConnector
from models.connection import Connection, ConnectionConfig


@pytest.fixture
def connection_config():
    """Create a test connection configuration."""
    return ConnectionConfig(
        project_id="test-project",
        credentials_json='{"type": "service_account", "project_id": "test-project"}',
    )


@pytest.fixture
def connection(connection_config):
    """Create a test connection."""
    return Connection(
        id="test-conn-id",
        name="Test BigQuery Connection",
        type="bigquery",
        config=connection_config,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )


@pytest.fixture
def mock_bigquery_client():
    """Create a mock BigQuery client."""
    mock_client = MagicMock()

    # Mock query method
    mock_query_job = MagicMock()
    mock_query_job.result = MagicMock(
        return_value=[MagicMock(items=lambda: [("col1", "value1"), ("col2", 123)])]
    )
    mock_query_job.schema = [
        MagicMock(name="col1", field_type="STRING"),
        MagicMock(name="col2", field_type="INTEGER"),
    ]
    mock_client.query = MagicMock(return_value=mock_query_job)

    # Mock dataset and table listing
    mock_dataset = MagicMock()
    mock_dataset.dataset_id = "test_dataset"
    mock_client.list_datasets = MagicMock(return_value=[mock_dataset])

    mock_table_ref = MagicMock()
    mock_table_ref.table_id = "test_table"
    mock_client.list_tables = MagicMock(return_value=[mock_table_ref])

    mock_table = MagicMock()
    mock_table.table_type = "TABLE"
    mock_table.description = "Test table"
    mock_table.num_rows = 100
    mock_field = MagicMock()
    mock_field.name = "test_column"
    mock_field.field_type = "STRING"
    mock_field.mode = "NULLABLE"
    mock_field.description = "Test column"
    mock_table.schema = [mock_field]
    mock_client.get_table = MagicMock(return_value=mock_table)

    return mock_client


@pytest.mark.asyncio
async def test_connect(connection, mock_bigquery_client):
    """Test the connect method."""
    with patch("google.cloud.bigquery.Client", return_value=mock_bigquery_client):
        with patch("google.oauth2.service_account.Credentials.from_service_account_info"):
            connector = BigQueryConnector(connection)
            await connector.connect()

            assert connector.client is not None


@pytest.mark.asyncio
async def test_test_connection(connection):
    """Test the test_connection method."""
    with patch("google.cloud.bigquery.Client") as mock_client_class:
        mock_client = mock_client_class.return_value
        mock_job = MagicMock()
        mock_job.result = MagicMock(return_value=[MagicMock()])
        mock_client.query = MagicMock(return_value=mock_job)

        connector = BigQueryConnector(connection)
        success, message = await connector.test_connection()

        assert success is True
        assert "Connection successful" in message


@pytest.mark.asyncio
async def test_get_metadata(connection, mock_bigquery_client):
    """Test the get_metadata method."""
    with patch("google.cloud.bigquery.Client", return_value=mock_bigquery_client):
        with patch("google.oauth2.service_account.Credentials.from_service_account_info"):
            connector = BigQueryConnector(connection)
            connector.client = mock_bigquery_client

            tables, columns, relationships = await connector.get_metadata()

            assert len(tables) == 1
            assert tables[0].name == "test_dataset.test_table"
            assert tables[0].schema_name == "test_dataset"

            assert len(columns) == 1
            assert columns[0].name == "test_column"
            assert columns[0].tableName == "test_dataset.test_table"

            assert len(relationships) == 0


@pytest.mark.asyncio
async def test_execute_query(connection, mock_bigquery_client):
    """Test the execute_query method."""
    with patch("google.cloud.bigquery.Client", return_value=mock_bigquery_client):
        with patch("google.oauth2.service_account.Credentials.from_service_account_info"):
            connector = BigQueryConnector(connection)
            connector.client = mock_bigquery_client

            results, columns, execution_time = await connector.execute_query(
                "SELECT * FROM test_table"
            )

            assert len(results) == 1
            assert results[0]["col1"] == "value1"
            assert results[0]["col2"] == 123

            assert len(columns) == 2
            assert columns[0].name == "col1"
            assert columns[1].name == "col2"

            mock_bigquery_client.query.assert_called_once()


@pytest.mark.asyncio
async def test_get_query_explanation(connection, mock_bigquery_client):
    """Test the get_query_explanation method."""
    with patch("google.cloud.bigquery.Client", return_value=mock_bigquery_client):
        with patch("google.oauth2.service_account.Credentials.from_service_account_info"):
            connector = BigQueryConnector(connection)
            connector.client = mock_bigquery_client

            explanation = await connector.get_query_explanation("SELECT * FROM test_table")

            assert "plan" in explanation
            mock_bigquery_client.query.assert_called_once()


@pytest.mark.asyncio
async def test_get_dialect(connection):
    """Test the get_dialect method."""
    connector = BigQueryConnector(connection)
    dialect = connector.get_dialect()

    assert dialect == "bigquery"
