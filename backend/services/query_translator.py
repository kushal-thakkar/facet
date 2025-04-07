# app/services/query_translator.py
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
            # Handle different visualization types
            visualization_type = (
                query_model.visualization.type if query_model.visualization else "table"
            )

            # Build the SELECT clause - handle table view differently
            if visualization_type == "table" and query_model.selectedFields:
                select_clause = self._build_select_for_table(
                    query_model.agg, query_model.groupBy, query_model.selectedFields
                )
            else:
                select_clause = self._build_select(query_model.agg, query_model.groupBy)

            # Build the FROM clause
            from_clause = self._build_from(query_model.source)

            # Build the WHERE clause
            where_clause = self._build_where(query_model.filters, query_model.timeRange)

            # Build the GROUP BY clause - only if agg or groupBy defined
            if query_model.agg or query_model.groupBy:
                group_by_clause = self._build_group_by(query_model.groupBy)
            else:
                group_by_clause = ""

            # Build the ORDER BY clause
            order_by_clause = self._build_order_by(query_model.sort)

            # Build the LIMIT clause
            limit_clause = self._build_limit(query_model.limit)

            # Combine all clauses
            sql = (
                f"{select_clause}\n{from_clause}\n{where_clause}\n"
                + f"{group_by_clause}\n{order_by_clause}\n{limit_clause}"
            )

            # Debug logging to see the final SQL
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

        # First add GROUP BY columns to the select list
        for dimension in group_by:
            select_items.append(dimension)

        # Get the primary aggregation function (first one in the list)
        agg_function = None
        if metrics and len(metrics) > 0 and metrics[0]:
            agg_function = metrics[0]

        # Handle aggregation based on function type
        if agg_function:
            func_name = agg_function.function.upper()

            # Case 1: COUNT function
            if func_name == "COUNT":
                # Just add COUNT(*) regardless of selected fields
                select_expr = f"COUNT(*) AS {agg_function.alias or 'count'}"
                select_items.append(select_expr)

            # Case 2: Other aggregation functions (SUM, AVG, etc.)
            else:
                # For other aggregations, we need selected fields
                if not selected_fields:
                    logger.error(f"No fields selected for {func_name} aggregation")
                    raise ValueError(f"You must select fields for {func_name} aggregation")

                # Apply aggregation to each selected field that isn't in GROUP BY
                for field in selected_fields:
                    # Skip fields already in GROUP BY
                    if field in group_by:
                        continue

                    # Skip empty fields
                    if not field or field.strip() == "":
                        continue

                    # Extract column name for alias
                    column_name = field.split(".")[-1] if "." in field else field

                    # Build the expression
                    expr = f"{func_name}({field})"
                    alias = f"{func_name.lower()}({column_name})"
                    # Quote the alias to handle special characters
                    select_expr = f'{expr} AS "{alias}"'
                    select_items.append(select_expr)

        # If no items have been added and no GROUP BY, default to SELECT *
        if not select_items:
            return "SELECT *"

        return f"SELECT {', '.join(select_items)}"

    def _build_select(self, metrics: List[Metric], group_by: List[str]) -> str:
        """Build the SELECT clause.

        Args:
            metrics: List of metrics to include
            group_by: List of dimensions to group by

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
                        logger.error(f"No column specified for {func_name} aggregation")
                        raise ValueError(f"Column must be specified for {func_name} aggregation")

                    # Extract column name for the alias
                    column_name = (
                        metric.column.split(".")[-1] if "." in metric.column else metric.column
                    )
                    alias = metric.alias or f"{func_name.lower()}({column_name})"

                    # Build the expression with quoted alias
                    select_expr = f'{func_name}({metric.column}) AS "{alias}"'
                    select_items.append(select_expr)

        if not select_items:
            # Default to SELECT *
            return "SELECT *"

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
            if hasattr(condition, "logic"):
                # It's a nested logical filter group
                nested_condition = self._build_filter_group(condition)
                if nested_condition:
                    group_conditions.append(nested_condition)
            else:
                # It's a single filter condition
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

    def _build_limit(self, limit: Optional[int]) -> str:
        """Build the LIMIT clause.

        Args:
            limit: Maximum number of rows to return

        Returns:
            LIMIT clause string
        """
        if not limit:
            return ""

        return f"LIMIT {limit}"
