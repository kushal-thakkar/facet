"""Translator for converting query models to SQL statements."""

import logging
from typing import List, Optional, Union

from models.query import (
    FilterCondition,
    LogicalFilterGroup,
    Metric,
    QueryModel,
    SortOrder,
    TimeRange,
)

logger = logging.getLogger(__name__)


class SQLTranslator:
    """Translates JSON query model to SQL."""

    def __init__(self, dialect: str):
        """Initialize the translator with a specific SQL dialect.

        Args:
            dialect: The SQL dialect to use (postgresql, clickhouse, etc.)
        """
        self.dialect = dialect

    def translate(self, query_model: QueryModel) -> str:
        """Convert JSON query model to SQL string.

        Args:
            query_model: The query model to translate

        Returns:
            SQL query string
        """
        try:
            # Log the original query model properties
            logger.debug(
                f"Query model before translate: limit={query_model.limit}, "
                f"offset={query_model.offset}, server_pagination={query_model.isServerPagination}"
            )

            # Check for required values with server-side pagination
            if query_model.isServerPagination:
                if query_model.limit is None:
                    raise ValueError("Server-side pagination requires a limit value")
                if query_model.offset is None:
                    raise ValueError("Server-side pagination requires an offset value")
            else:
                # When server-side pagination is disabled, offset should not be used
                if query_model.offset is not None:
                    raise ValueError("Offset can only be used with server-side pagination")

            visualization_type = query_model.visualization.type

            # Check if time-based granularity should be applied (for line charts)
            # Only apply time-based granularity when:
            # 1. Visualization is line chart
            # 2. Granularity is specified
            # 3. TimeRange column is specified
            # 4. We're grouping by the time column (important!)
            is_time_granularity = (
                visualization_type == "line"
                and query_model.granularity
                and query_model.timeRange is not None
                and query_model.timeRange.column is not None
                and query_model.groupBy
                and query_model.timeRange.column in query_model.groupBy
            )

            # Build SELECT clause based on visualization type and granularity
            if is_time_granularity:
                time_column = (
                    query_model.timeRange.column if query_model.timeRange is not None else None
                )
                select_clause = self._build_select_with_granularity(
                    query_model.agg,
                    query_model.groupBy,
                    query_model.selectedFields,
                    time_column,
                    query_model.granularity,
                )
            elif visualization_type == "table" and query_model.selectedFields:
                select_clause = self._build_select_for_table(
                    query_model.agg, query_model.groupBy, query_model.selectedFields
                )
            else:
                select_clause = self._build_select(
                    query_model.agg, query_model.groupBy, query_model.selectedFields
                )

            # Common clauses for all query types
            from_clause = self._build_from(query_model.source)
            where_clause = self._build_where(query_model.filters, query_model.timeRange)

            # Handle group by clause, with special case for time granularity
            if (
                is_time_granularity
                and query_model.groupBy
                and query_model.timeRange is not None
                and query_model.timeRange.column is not None
                and query_model.groupBy[0] == query_model.timeRange.column
            ):
                group_by_clause = self._build_group_by_with_granularity(
                    query_model.groupBy, query_model.timeRange.column, query_model.granularity
                )
            elif query_model.agg or query_model.groupBy:
                group_by_clause = self._build_group_by(query_model.groupBy)
            else:
                group_by_clause = ""

            # Remaining clauses
            order_by_clause = self._build_order_by(query_model.sort)
            limit_clause = self._build_limit(
                query_model.limit, query_model.offset, query_model.isServerPagination
            )

            # Assemble final SQL
            sql = (
                f"{select_clause}\n{from_clause}\n{where_clause}\n"
                + f"{group_by_clause}\n{order_by_clause}\n{limit_clause}"
            )

            logger.info(f"Generated SQL: {sql}")
            return sql
        except Exception as e:
            logger.error(f"Error translating query: {str(e)}")
            raise

    def _build_select_for_table(
        self, metrics: List[Metric], group_by: List[str], selected_fields: List[str]
    ) -> str:
        """Build the SELECT clause specifically for table visualization.

        Args:
            metrics: List of metrics to include
            group_by: List of dimensions to group by
            selected_fields: List of explicitly selected fields to include

        Returns:
            SELECT clause string
        """
        select_items = []

        for dimension in group_by:
            select_items.append(dimension)

        agg_function = None
        if metrics and len(metrics) > 0 and metrics[0]:
            agg_function = metrics[0]
        if agg_function:
            func_name = agg_function.function.upper()

            if func_name == "COUNT":
                select_expr = f"COUNT(*) AS {agg_function.alias or 'count'}"
                select_items.append(select_expr)

            else:
                if not selected_fields:
                    logger.error(f"No fields selected for {func_name} aggregation")
                    raise ValueError(f"You must select fields for {func_name} aggregation")

                for field in selected_fields:
                    if field in group_by:
                        continue

                    if not field or field.strip() == "":
                        continue
                    column_name = field.split(".")[-1] if "." in field else field

                    expr = f"{func_name}({field})"
                    # Use a consistent alias format without parentheses for all databases
                    alias = f"{func_name.lower()}_{column_name}"
                    select_expr = f"{expr} AS {alias}"

                    select_items.append(select_expr)

        if not select_items:
            return "SELECT *"

        return f"SELECT {', '.join(select_items)}"

    def _build_select(
        self,
        metrics: List[Metric],
        group_by: List[str],
        selected_fields: Optional[List[str]] = None,
    ) -> str:
        """Build the SELECT clause.

        Args:
            metrics: List of metrics to include
            group_by: List of dimensions to group by
            selected_fields: Optional list of explicitly selected fields.
                Used for picking an aggregation column.

        Returns:
            SELECT clause string
        """
        select_items = []

        # First add GROUP BY columns to the select list
        for dimension in group_by:
            select_items.append(dimension)

        # Handle all metrics (aggregations)
        if metrics:
            for metric in metrics:
                func_name = metric.function.upper() if metric.function else "COUNT"

                # Case 1: COUNT function
                if func_name == "COUNT":
                    # Use COUNT(*) if no column specified or column is "*"
                    select_expr = f"COUNT(*) AS {metric.alias or 'count'}"
                    select_items.append(select_expr)

                # Case 2: Other aggregation functions
                else:
                    # For non-COUNT aggregations, we must have a specific column
                    if not metric.column:
                        # Check if we have selectedFields (used in pie charts)
                        if selected_fields and len(selected_fields) > 0:
                            # Use the first selected field for the aggregation
                            metric.column = selected_fields[0]
                            logger.info(f"Using selected field '{metric.column}' for {func_name}")
                        else:
                            logger.error(f"No column specified for {func_name} aggregation")
                            raise ValueError(
                                f"Column must be specified for {func_name} aggregation"
                            )

                    # Extract column name for the alias
                    column_name = (
                        metric.column.split(".")[-1] if "." in metric.column else metric.column
                    )

                    # Use a consistent alias format without parentheses for all databases
                    alias = metric.alias or f"{func_name.lower()}_{column_name}"
                    select_expr = f"{func_name}({metric.column}) AS {alias}"

                    select_items.append(select_expr)

        # If there are selected fields and no metrics/group by, use the selected fields directly
        if not select_items and selected_fields:
            for field in selected_fields:
                select_items.append(field)

        if not select_items:
            # Default to SELECT * only if no fields were selected
            return "SELECT *"

        return f"SELECT {', '.join(select_items)}"

    def _build_select_with_granularity(
        self,
        metrics: List[Metric],
        group_by: List[str],
        selected_fields: Optional[List[str]] = None,
        time_column: Optional[str] = None,
        granularity: Optional[str] = None,
    ) -> str:
        """Build the SELECT clause with time granularity bucketing.

        Args:
            metrics: List of metrics to include
            group_by: List of dimensions to group by
            selected_fields: Optional list of explicitly selected fields
            time_column: The timestamp column to apply granularity to
            granularity: Time granularity level (minute, hour, day, week, month)

        Returns:
            SELECT clause string with time granularity applied
        """
        select_items = []

        # First handle the time granularity for the time column
        if time_column and granularity:
            # Generate the appropriate date_trunc expression based on dialect
            truncated_alias = f"trunc_{time_column.replace('.', '_')}_{granularity}"

            if self.dialect == "postgresql":
                select_items.append(
                    f"DATE_TRUNC('{granularity}', {time_column}) AS {truncated_alias}"
                )
            elif self.dialect == "clickhouse":
                if granularity == "minute":
                    select_items.append(f"toStartOfMinute({time_column}) AS {truncated_alias}")
                elif granularity == "hour":
                    select_items.append(f"toStartOfHour({time_column}) AS {truncated_alias}")
                elif granularity == "day":
                    select_items.append(f"toStartOfDay({time_column}) AS {truncated_alias}")
                elif granularity == "week":
                    select_items.append(f"toStartOfWeek({time_column}) AS {truncated_alias}")
                elif granularity == "month":
                    select_items.append(f"toStartOfMonth({time_column}) AS {truncated_alias}")
                else:
                    raise ValueError(f"Unsupported granularity for ClickHouse: {granularity}")
            elif self.dialect == "bigquery":
                select_items.append(
                    f"TIMESTAMP_TRUNC({time_column}, {granularity.upper()}) AS {truncated_alias}"
                )
            elif self.dialect == "snowflake":
                select_items.append(
                    f"DATE_TRUNC('{granularity}', {time_column}) AS {truncated_alias}"
                )
            else:
                # For unknown dialects, use PostgreSQL syntax as default
                select_items.append(
                    f"DATE_TRUNC('{granularity}', {time_column}) AS {truncated_alias}"
                )

        # Add other GROUP BY columns to the select list
        # (excluding the time column that was already added)
        for dimension in group_by:
            if dimension != time_column:
                select_items.append(dimension)

        # Handle all metrics (aggregations)
        if metrics:
            for metric in metrics:
                func_name = metric.function.upper() if metric.function else "COUNT"

                # Case 1: COUNT function
                if func_name == "COUNT":
                    select_expr = f"COUNT(*) AS {metric.alias or 'count'}"
                    select_items.append(select_expr)
                # Case 2: Other aggregation functions
                else:
                    # For non-COUNT aggregations, we must have a specific column
                    if not metric.column:
                        if selected_fields and len(selected_fields) > 0:
                            metric.column = selected_fields[0]
                            logger.info(f"Using selected field '{metric.column}' for {func_name}")
                        else:
                            logger.error(f"No column specified for {func_name} aggregation")
                            raise ValueError(
                                f"Column must be specified for {func_name} aggregation"
                            )

                    # Extract column name for the alias
                    column_name = (
                        metric.column.split(".")[-1] if "." in metric.column else metric.column
                    )
                    alias = metric.alias or f"{func_name.lower()}_{column_name}"

                    # Use a consistent alias format for all databases
                    select_expr = f"{func_name}({metric.column}) AS {alias}"

                    select_items.append(select_expr)

        # With granularity, we should always have at least the truncated time column
        return f"SELECT {', '.join(select_items)}"

    def _build_from(self, source) -> str:
        """Build the FROM clause.

        Args:
            source: Source table information (QuerySource Pydantic model)

        Returns:
            FROM clause string
        """
        if not source:
            raise ValueError("Query must specify a source table")

        if not hasattr(source, "table"):
            raise ValueError("QuerySource must have a table attribute")

        table_name = source.table

        # Add schema if needed (dialect-specific)
        if self.dialect == "postgresql" and "." not in table_name:
            table_name = f"public.{table_name}"

        return f"FROM {table_name}"

    def _build_where(
        self,
        filters: List[Union[FilterCondition, LogicalFilterGroup]],
        time_range: Optional[TimeRange],
    ) -> str:
        """Build the WHERE clause.

        Args:
            filters: List of filter conditions
            time_range: Time range specification

        Returns:
            WHERE clause string
        """
        conditions = []

        # Add filter conditions
        if filters:
            for filter_item in filters:
                if hasattr(filter_item, "logic"):
                    # It's a logical filter group
                    if isinstance(filter_item, LogicalFilterGroup):
                        group_condition = self._build_filter_group(filter_item)
                        if group_condition:
                            conditions.append(group_condition)
                else:
                    # It's a single filter condition
                    condition = self._build_filter_condition(filter_item)
                    if condition:
                        conditions.append(condition)

        # Add time range condition
        if time_range:
            time_condition = self._build_time_range_condition(time_range)
            if time_condition:
                conditions.append(time_condition)

        if not conditions:
            return ""

        return f"WHERE {' AND '.join(conditions)}"

    def _build_filter_group(self, filter_group: LogicalFilterGroup) -> str:
        """Build a filter group condition.

        Args:
            filter_group: The logical filter group

        Returns:
            Filter group condition string
        """
        group_conditions = []

        for condition in filter_group.conditions:
            if hasattr(condition, "logic") and isinstance(condition, LogicalFilterGroup):
                # It's a nested logical filter group
                nested_condition = self._build_filter_group(condition)
                if nested_condition:
                    group_conditions.append(nested_condition)
            else:
                # It's a single filter condition
                if isinstance(condition, FilterCondition):
                    condition_str = self._build_filter_condition(condition)
                    if condition_str:
                        group_conditions.append(condition_str)

        if not group_conditions:
            return ""

        logic_op = filter_group.logic.upper()
        return f"({' ' + logic_op + ' '.join(group_conditions)})"

    def _build_filter_condition(self, condition: FilterCondition) -> str:
        """Build a single filter condition.

        Args:
            condition: The filter condition

        Returns:
            Filter condition string
        """
        column = condition.column
        operator = condition.operator
        value = condition.value

        # Handle NULL operators
        if operator == "is_null":
            return f"{column} IS NULL"
        elif operator == "is_not_null":
            return f"{column} IS NOT NULL"

        # Handle operators with values
        if operator == "=":
            if isinstance(value, str):
                return f"{column} = '{value}'"
            else:
                return f"{column} = {value}"
        elif operator == "!=":
            if isinstance(value, str):
                return f"{column} != '{value}'"
            else:
                return f"{column} != {value}"
        elif operator in [">", ">=", "<", "<="]:
            if isinstance(value, str):
                return f"{column} {operator} '{value}'"
            else:
                return f"{column} {operator} {value}"
        elif operator == "in":
            # Format values for IN clause
            if isinstance(value, list):
                formatted_values = []
                for item in value:
                    if isinstance(item, str):
                        formatted_values.append(f"'{item}'")
                    else:
                        formatted_values.append(str(item))
                values_str = ", ".join(formatted_values)
            else:
                values_str = value

            return f"{column} IN ({values_str})"
        elif operator == "not_in":
            # Format values for NOT IN clause
            if isinstance(value, list):
                formatted_values = []
                for item in value:
                    if isinstance(item, str):
                        formatted_values.append(f"'{item}'")
                    else:
                        formatted_values.append(str(item))
                values_str = ", ".join(formatted_values)
            else:
                values_str = value

            return f"{column} NOT IN ({values_str})"
        elif operator == "contains":
            # Use dialect-specific LIKE or ILIKE
            if self.dialect == "postgresql":
                return f"{column} ILIKE '%{value}%'"
            else:
                return f"{column} LIKE '%{value}%'"
        elif operator == "starts_with":
            # Use dialect-specific LIKE or ILIKE
            if self.dialect == "postgresql":
                return f"{column} ILIKE '{value}%'"
            else:
                return f"{column} LIKE '{value}%'"
        elif operator == "ends_with":
            # Use dialect-specific LIKE or ILIKE
            if self.dialect == "postgresql":
                return f"{column} ILIKE '%{value}'"
            else:
                return f"{column} LIKE '%{value}'"

        # Default case
        logger.warning(f"Unsupported operator: {operator}")
        return ""

    def _build_time_range_condition(self, time_range: TimeRange) -> str:
        """Build a time range condition.

        Args:
            time_range: The time range specification

        Returns:
            Time range condition string
        """
        column = time_range.column
        range_type = time_range.range

        # If column is None or empty, don't apply time filter
        if not column:
            logger.info("No time column specified, skipping time range filter")
            return ""

        # Handle custom range
        if range_type == "custom" and time_range.customRange:
            from_date = time_range.customRange.get("from")
            to_date = time_range.customRange.get("to")

            if from_date and to_date:
                return f"{column} BETWEEN '{from_date}' AND '{to_date}'"
            elif from_date:
                return f"{column} >= '{from_date}'"
            elif to_date:
                return f"{column} <= '{to_date}'"

        # Handle relative ranges
        if range_type.startswith("last_"):
            # Extract the value and unit from last_X_unit
            parts = range_type.split("_")
            if len(parts) >= 3:
                value = parts[1]
                unit = parts[2]

                # Postgres interval syntax
                if self.dialect == "postgresql":
                    return f"{column} >= CURRENT_TIMESTAMP - INTERVAL '{value} {unit}'"
                # ClickHouse interval syntax
                elif self.dialect == "clickhouse":
                    return f"{column} >= now() - INTERVAL {value} {unit}"
        elif range_type.startswith("this_"):
            unit = range_type.split("_")[1]

            # Postgres date trunc syntax
            if self.dialect == "postgresql":
                return f"{column} >= DATE_TRUNC('{unit}', CURRENT_TIMESTAMP)"
            # ClickHouse date trunc syntax
            elif self.dialect == "clickhouse":
                if unit == "day":
                    return f"{column} >= toStartOfDay(now())"
                elif unit == "week":
                    return f"{column} >= toStartOfWeek(now())"
                elif unit == "month":
                    return f"{column} >= toStartOfMonth(now())"
                elif unit == "quarter":
                    return f"{column} >= toStartOfQuarter(now())"
                elif unit == "year":
                    return f"{column} >= toStartOfYear(now())"

        # Default empty string if range type not recognized
        logger.warning(f"Unsupported time range: {range_type}")
        return ""

    def _build_group_by(self, group_by: List[str]) -> str:
        """Build the GROUP BY clause.

        Args:
            group_by: List of dimensions to group by

        Returns:
            GROUP BY clause string
        """
        if not group_by:
            return ""

        return f"GROUP BY {', '.join(group_by)}"

    def _build_group_by_with_granularity(
        self, group_by: List[str], time_column: Optional[str], granularity: Optional[str]
    ) -> str:
        """Build the GROUP BY clause with time granularity support.

        Args:
            group_by: List of dimensions to group by
            time_column: The time column to apply granularity to
            granularity: Granularity level (minute, hour, day, etc.)

        Returns:
            GROUP BY clause string with time granularity applied
        """
        if not group_by or time_column is None or granularity is None:
            return ""

        # Create a new list with the time column replaced by its truncated version
        modified_group_by = []
        for col in group_by:
            if col == time_column:
                # Use the truncated time alias instead of the original column
                truncated_alias = f"trunc_{time_column.replace('.', '_')}_{granularity}"
                modified_group_by.append(truncated_alias)
            else:
                modified_group_by.append(col)

        return f"GROUP BY {', '.join(modified_group_by)}"

    def _build_order_by(self, sort: List[SortOrder]) -> str:
        """Build the ORDER BY clause.

        Args:
            sort: List of sort specifications

        Returns:
            ORDER BY clause string
        """
        if not sort:
            return ""

        sort_items = []
        for sort_spec in sort:
            direction = sort_spec.direction.upper()
            sort_items.append(f"{sort_spec.column} {direction}")

        return f"ORDER BY {', '.join(sort_items)}"

    def _build_limit(
        self, limit: Optional[int], offset: Optional[int] = None, is_server_pagination: bool = False
    ) -> str:
        """Build the LIMIT and OFFSET clauses.

        Args:
            limit: Maximum number of rows to return
            offset: Number of rows to skip
            is_server_pagination: Flag to indicate server-side pagination

        Returns:
            LIMIT and OFFSET clause string
        """
        # For server-side pagination, always include both LIMIT and OFFSET (even when offset is 0)
        if is_server_pagination:
            # Validation is already done in the translate method
            actual_offset = 0 if offset is None else offset
            return f"LIMIT {limit} OFFSET {actual_offset}"

        # For standard queries (no server pagination):
        if limit is None:
            # If no limit is specified, don't use LIMIT clause
            return ""

        # When limit is specified, always apply it
        limit_clause = f"LIMIT {limit}"

        # We don't include OFFSET for non-server pagination
        # The translate method already validates this
        return limit_clause

    def translate_count(self, query_model: QueryModel) -> str:
        """Generate a SQL COUNT query for the given query model.

        Args:
            query_model: The query model

        Returns:
            SQL COUNT query string
        """
        base_sql = self.translate(query_model)

        # Start building the query
        sql = f"SELECT COUNT(*) AS count FROM ({base_sql})"

        if self.dialect == "clickhouse":
            sql += " AS sub_query"

        return sql
