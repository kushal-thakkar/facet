import React, { useState, useEffect } from 'react';
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

function ResultsChart({ results, type }) {
  const { state } = useAppState();
  const { currentExploration } = state;

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
          <ResponsiveContainer width="100%" height="100%">
            {type === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid opacity={0} />
                <XAxis dataKey={chartConfig.xAxisKey} tickFormatter={formatXAxisTick} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {chartConfig.yAxisKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    activeDot={{ r: 8 }}
                    connectNulls={true}
                    name={results.columns.find((col) => col.name === key)?.displayName || key}
                  />
                ))}
              </LineChart>
            ) : type === 'bar' ? (
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid opacity={0} />
                <XAxis dataKey={chartConfig.xAxisKey} tickFormatter={formatXAxisTick} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <Legend />
                {chartConfig.yAxisKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    name={results.columns.find((col) => col.name === key)?.displayName || key}
                    isAnimationActive={true}
                    background={{ fill: 'transparent' }}
                  />
                ))}
              </BarChart>
            ) : (
              <PieChart>
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
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default ResultsChart;
