import pytest
from services.query_translator import SQLTranslator
from models.query import (
    QueryModel, 
    FilterCondition, 
    LogicalFilterGroup, 
    TimeRange, 
    Comparison, 
    Metric, 
    SortOrder,
    QuerySource
)

@pytest.fixture
def postgres_translator():
    return SQLTranslator('postgresql')

@pytest.fixture
def clickhouse_translator():
    return SQLTranslator('clickhouse')

@pytest.fixture
def simple_query():
    return QueryModel(
        source=QuerySource(connectionId="conn1", table="events"),
        filters=[
            FilterCondition(column="status", operator="=", value="active")
        ],
        groupBy=["service"],
        metrics=[
            Metric(function="count", alias="event_count")
        ],
        sort=[
            SortOrder(column="event_count", direction="desc")
        ],
        limit=10
    )

@pytest.fixture
def complex_query():
    return QueryModel(
        source=QuerySource(connectionId="conn1", table="events"),
        filters=[
            FilterCondition(column="timestamp", operator=">=", value="2025-03-01T00:00:00Z"),
            LogicalFilterGroup(
                logic="or",
                conditions=[
                    FilterCondition(column="country", operator="=", value="US"),
                    FilterCondition(column="country", operator="=", value="CA")
                ]
            )
        ],
        groupBy=["service", "endpoint"],
        metrics=[
            Metric(function="count", alias="request_count"),
            Metric(column="duration", function="avg", alias="avg_duration")
        ],
        timeRange=TimeRange(
            column="timestamp",
            range="last_7_days"
        ),
        comparison=Comparison(
            enabled=True,
            range="previous_period"
        ),
        sort=[
            SortOrder(column="request_count", direction="desc")
        ],
        limit=100
    )

class TestSQLTranslator:
    
    def test_simple_query_postgresql(self, postgres_translator, simple_query):
        # Generate SQL
        sql = postgres_translator.translate(simple_query)
        
        # Check essential parts
        assert "SELECT" in sql
        assert "service" in sql
        assert "COUNT(*) AS event_count" in sql
        assert "FROM events" in sql
        assert "WHERE status = 'active'" in sql
        assert "GROUP BY service" in sql
        assert "ORDER BY event_count DESC" in sql
        assert "LIMIT 10" in sql
    
    def test_simple_query_clickhouse(self, clickhouse_translator, simple_query):
        # Generate SQL
        sql = clickhouse_translator.translate(simple_query)
        
        # Check essential parts
        assert "SELECT" in sql
        assert "service" in sql
        assert "COUNT(*) AS event_count" in sql
        assert "FROM events" in sql
        assert "WHERE status = 'active'" in sql
        assert "GROUP BY service" in sql
        assert "ORDER BY event_count DESC" in sql
        assert "LIMIT 10" in sql
    
    def test_complex_query_postgresql(self, postgres_translator, complex_query):
        # Generate SQL
        sql = postgres_translator.translate(complex_query)
        
        # Check essential parts
        assert "SELECT" in sql
        assert "service" in sql
        assert "endpoint" in sql
        assert "COUNT(*) AS request_count" in sql
        assert "AVG(duration) AS avg_duration" in sql
        assert "FROM events" in sql
        assert "WHERE" in sql
        assert "timestamp >=" in sql
        assert "(country = 'US' OR country = 'CA')" in sql
        assert "GROUP BY service, endpoint" in sql
        assert "ORDER BY request_count DESC" in sql
        assert "LIMIT 100" in sql
    
    def test_filter_condition_operators(self, postgres_translator):
        # Test different operators
        query = QueryModel(
            source=QuerySource(connectionId="conn1", table="users"),
            filters=[
                FilterCondition(column="name", operator="contains", value="John"),
                FilterCondition(column="age", operator=">", value=30),
                FilterCondition(column="status", operator="in", value=["active", "pending"]),
                FilterCondition(column="email", operator="is_not_null", value=None)
            ]
        )
        
        sql = postgres_translator.translate(query)
        
        # Check operators translation
        assert "name ILIKE '%John%'" in sql
        assert "age > 30" in sql
        assert "status IN ('active', 'pending')" in sql
        assert "email IS NOT NULL" in sql
    
    def test_time_range_translation(self, postgres_translator):
        # Test time range translation
        query = QueryModel(
            source=QuerySource(connectionId="conn1", table="events"),
            timeRange=TimeRange(
                column="created_at",
                range="last_30_days"
            )
        )
        
        sql = postgres_translator.translate(query)
        
        # Check time range condition in PostgreSQL format
        assert "created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'" in sql
        
        # Test with clickhouse translator
        clickhouse_translator = SQLTranslator('clickhouse')
        sql = clickhouse_translator.translate(query)
        
        # Check time range condition in ClickHouse format
        assert "created_at >= now() - INTERVAL 30 days" in sql