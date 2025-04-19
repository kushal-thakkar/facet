import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAppState } from '../../context/AppStateContext';
import { CHART_COLORS, formatXAxisTick, CustomTooltip } from '../../utils/chartUtils';
import { getGranularityForTimeRange } from '../../utils/explorationUtils';

function ResultsChart({ results, type }) {
  const { state } = useAppState();
  const { currentExploration } = state;

  // Helper function to resolve granularity based on current settings
  const resolveGranularity = () => {
    let displayGranularity = currentExploration.granularity;
    if (displayGranularity === 'auto' && currentExploration.timeRange?.range) {
      try {
        displayGranularity = getGranularityForTimeRange(currentExploration.timeRange.range);
      } catch (error) {
        console.warn('Unable to resolve granularity');
      }
    }
    return displayGranularity;
  };

  // Helper function to format axis ticks with granularity awareness
  const formatAxisTick = (value) => {
    return formatXAxisTick(value, resolveGranularity());
  };

  // Display a nicer title showing the active granularity when applicable
  const granularityDisplay = useMemo(() => {
    // Only show granularity for line charts when grouping by a time column
    const isTimeBasedGrouping =
      type === 'line' &&
      currentExploration.timeRange?.column &&
      currentExploration.groupBy?.includes(currentExploration.timeRange.column);

    if (!isTimeBasedGrouping) return null;

    // Get the appropriate granularity - if it's auto, resolve it based on the time range
    let displayGranularity = currentExploration.granularity;
    if (displayGranularity === 'auto' && currentExploration.timeRange?.range) {
      try {
        displayGranularity = getGranularityForTimeRange(currentExploration.timeRange.range);
      } catch (error) {
        // Just log the error and don't display anything
        // This is display-only code so we don't need to throw, just hide the UI element
        console.error('Error resolving display granularity:', error);
        return null;
      }
    }

    if (!displayGranularity) return null;

    // Get the aggregation function name for display
    if (
      !currentExploration.agg ||
      !currentExploration.agg.length ||
      !currentExploration.agg[0].function
    ) {
      return null;
    }

    const aggFunction = currentExploration.agg[0].function.toUpperCase();

    return `${aggFunction} per ${displayGranularity}${
      currentExploration.granularity === 'auto' ? ' (auto)' : ''
    }`;
  }, [
    type,
    currentExploration.granularity,
    currentExploration.timeRange,
    currentExploration.groupBy,
    currentExploration.agg,
  ]);

  const [chartConfig, setChartConfig] = useState({
    xAxisKey: '',
    yAxisKeys: [],
  });

  // Effect to auto-select axis fields when results or type changes
  useEffect(() => {
    if (!results || !results.columns || results.columns.length === 0) return;

    // Find potential x-axis and y-axis fields
    // For x-axis: prefer time fields, then categorical fields, avoid numeric
    // For y-axis: prefer numeric fields

    const columns = results.columns;
    let xAxisCandidates = [];
    let yAxisCandidates = [];

    // First try to use time-based fields for x-axis
    const timeFields = columns.filter(
      (col) =>
        col.type === 'date' ||
        col.type === 'timestamp' ||
        col.name.toLowerCase().includes('date') ||
        col.name.toLowerCase().includes('time')
    );

    if (timeFields.length > 0) {
      xAxisCandidates = timeFields;
    } else {
      // Next, use categorical fields (low cardinality strings)
      const categoricalFields = columns.filter(
        (col) => col.type === 'string' && (!col.cardinality || col.cardinality === 'low')
      );

      if (categoricalFields.length > 0) {
        xAxisCandidates = categoricalFields;
      } else {
        // Fallback to any non-numeric field
        xAxisCandidates = columns.filter(
          (col) => col.type !== 'number' && col.type !== 'float' && col.type !== 'integer'
        );
      }
    }

    // For y-axis, prefer numeric fields
    yAxisCandidates = columns.filter(
      (col) =>
        col.type === 'number' ||
        col.type === 'float' ||
        col.type === 'integer' ||
        // Also include fields that look like metrics
        col.name.toLowerCase().includes('count') ||
        col.name.toLowerCase().includes('sum') ||
        col.name.toLowerCase().includes('avg') ||
        col.name.toLowerCase().includes('min') ||
        col.name.toLowerCase().includes('max')
    );

    // If no numeric fields, use all non-x-axis fields
    if (yAxisCandidates.length === 0) {
      const xAxisField = xAxisCandidates.length > 0 ? xAxisCandidates[0].name : '';
      yAxisCandidates = columns.filter((col) => col.name !== xAxisField);
    }

    // Set chart configuration
    setChartConfig({
      xAxisKey: xAxisCandidates.length > 0 ? xAxisCandidates[0].name : columns[0].name,
      yAxisKeys: yAxisCandidates.slice(0, 3).map((col) => col.name), // Limit to 3 series initially
    });
  }, [results, type]);

  // Format data for the chart
  const prepareChartData = () => {
    if (!results || !results.data || !chartConfig.xAxisKey) {
      return [];
    }

    // For pie charts, we need to aggregate the data by the x-axis
    if (type === 'pie') {
      const aggregatedData = {};
      const yAxisKey = chartConfig.yAxisKeys[0] || ''; // Pie charts only use first y-axis

      results.data.forEach((row) => {
        const key = String(row[chartConfig.xAxisKey] || 'Unknown');
        if (!aggregatedData[key]) {
          aggregatedData[key] = 0;
        }
        const value = row[yAxisKey];
        // Ensure we're adding a number, defaulting to 0 for null/undefined/NaN
        aggregatedData[key] +=
          value === null || value === undefined || isNaN(Number(value)) ? 0 : Number(value);
      });

      return Object.keys(aggregatedData).map((key) => ({
        name: key,
        value: aggregatedData[key],
      }));
    }

    // For line and bar charts, we use the data as is but ensure values are numeric
    return results.data.map((row) => {
      const formattedRow = {
        [chartConfig.xAxisKey]: row[chartConfig.xAxisKey],
      };

      // Add y-axis values, ensuring they are valid numbers
      chartConfig.yAxisKeys.forEach((key) => {
        const value = row[key];
        formattedRow[key] =
          value === null || value === undefined || isNaN(Number(value)) ? null : Number(value);
      });

      return formattedRow;
    });
  };

  // Prepare chart data
  const chartData = prepareChartData();

  // Create a custom tooltip component that uses our resolved granularity
  const TooltipWithGranularity = (props) => (
    <CustomTooltip
      {...props}
      granularity={resolveGranularity()}
      xAxisDisplayName={results?.columns.find((col) => col.name === chartConfig.xAxisKey)?.name}
    />
  );

  return (
    <div className="h-full">
      {/* Chart container */}
      <div className="h-full p-4">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
                No data available for chart
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Please check your data selection or try a different query
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Display granularity information for line charts */}
            {type === 'line' && granularityDisplay && (
              <div className="text-right pr-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                {granularityDisplay}
              </div>
            )}

            <div className="flex-grow">
              <ResponsiveContainer width="100%" height="100%" margin={{ bottom: 20 }}>
                {type === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid opacity={0} />
                    <XAxis
                      dataKey={chartConfig.xAxisKey}
                      tickFormatter={formatAxisTick}
                      height={30}
                      tickMargin={3}
                    />
                    <YAxis />
                    <Tooltip content={<TooltipWithGranularity />} />
                    <Legend />
                    {chartConfig.yAxisKeys.map((key, index) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        activeDot={{ r: 8 }}
                        connectNulls={true}
                        name={results.columns.find((col) => col.name === key)?.name}
                      />
                    ))}
                  </LineChart>
                ) : type === 'bar' ? (
                  <BarChart
                    data={chartData}
                    barGap={4}
                    margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid opacity={0} />
                    <XAxis
                      dataKey={chartConfig.xAxisKey}
                      tickFormatter={formatAxisTick}
                      height={30}
                      tickMargin={3}
                    />
                    <YAxis />
                    <Tooltip
                      content={<TooltipWithGranularity />}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Legend />
                    {chartConfig.yAxisKeys.map((key, index) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        name={results.columns.find((col) => col.name === key)?.name}
                        isAnimationActive={true}
                        background={{ fill: 'transparent' }}
                      />
                    ))}
                  </BarChart>
                ) : (
                  <PieChart margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                    {chartData.length > 0 && (
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value, percent }) =>
                          `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`
                        }
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    )}
                    <Tooltip content={<TooltipWithGranularity />} />
                    <Legend />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
            {/* Display x-axis column name below the chart */}
            <div className="text-center -mt-4 mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              {results.columns.find((col) => col.name === chartConfig.xAxisKey)?.name}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResultsChart;
