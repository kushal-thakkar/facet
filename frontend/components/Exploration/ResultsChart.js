// components/Exploration/ResultsChart.js
import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell
} from 'recharts';
import { useAppState } from '../../context/AppStateContext';

// Chart color palette
const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

function ResultsChart({ results, type }) {
  const { state } = useAppState();
  const { currentExploration } = state;
  
  const [chartConfig, setChartConfig] = useState({
    xAxisKey: '',
    yAxisKeys: [],
    showSettings: false
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
    const timeFields = columns.filter(col => 
      col.type === 'date' || 
      col.type === 'timestamp' || 
      col.name.toLowerCase().includes('date') || 
      col.name.toLowerCase().includes('time')
    );
    
    if (timeFields.length > 0) {
      xAxisCandidates = timeFields;
    } else {
      // Next, use categorical fields (low cardinality strings)
      const categoricalFields = columns.filter(col => 
        col.type === 'string' && 
        (!col.cardinality || col.cardinality === 'low')
      );
      
      if (categoricalFields.length > 0) {
        xAxisCandidates = categoricalFields;
      } else {
        // Fallback to any non-numeric field
        xAxisCandidates = columns.filter(col => 
          col.type !== 'number' && 
          col.type !== 'float' && 
          col.type !== 'integer'
        );
      }
    }
    
    // For y-axis, prefer numeric fields
    yAxisCandidates = columns.filter(col => 
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
      yAxisCandidates = columns.filter(col => col.name !== xAxisField);
    }
    
    // Set chart configuration
    setChartConfig({
      xAxisKey: xAxisCandidates.length > 0 ? xAxisCandidates[0].name : columns[0].name,
      yAxisKeys: yAxisCandidates.slice(0, 3).map(col => col.name), // Limit to 3 series initially
      showSettings: false
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
      
      results.data.forEach(row => {
        const key = String(row[chartConfig.xAxisKey] || 'Unknown');
        if (!aggregatedData[key]) {
          aggregatedData[key] = 0;
        }
        aggregatedData[key] += Number(row[yAxisKey] || 0);
      });
      
      return Object.keys(aggregatedData).map(key => ({
        name: key,
        value: aggregatedData[key]
      }));
    }
    
    // For line and bar charts, we use the data as is
    return results.data.map(row => {
      const formattedRow = {
        [chartConfig.xAxisKey]: row[chartConfig.xAxisKey]
      };
      
      // Add y-axis values
      chartConfig.yAxisKeys.forEach(key => {
        formattedRow[key] = row[key];
      });
      
      return formattedRow;
    });
  };
  
  // Format the x-axis tick values
  const formatXAxisTick = (value) => {
    if (value === null || value === undefined) return '';
    
    // If it looks like a date, format it
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        return new Date(value).toLocaleDateString();
      } catch (e) {
        return value;
      }
    }
    
    // If it's too long, truncate it
    if (typeof value === 'string' && value.length > 15) {
      return value.substring(0, 12) + '...';
    }
    
    return value;
  };
  
  // Toggle chart settings panel
  const toggleSettings = () => {
    setChartConfig({
      ...chartConfig,
      showSettings: !chartConfig.showSettings
    });
  };
  
  // Update chart settings
  const updateChartConfig = (key, value) => {
    setChartConfig({
      ...chartConfig,
      [key]: value
    });
  };
  
  // Get all available columns as options
  const columnOptions = results?.columns?.map(col => ({
    id: col.name,
    name: col.displayName || col.name,
    type: col.type
  })) || [];
  
  // Prepare chart data
  const chartData = prepareChartData();
  
  return (
    <div className="h-full flex flex-col">
      {/* Chart settings toggle button */}
      <div className="px-4 py-2 border-b border-gray-200">
        <button
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          onClick={toggleSettings}
        >
          {chartConfig.showSettings ? 'Hide Chart Settings' : 'Show Chart Settings'}
        </button>
      </div>
      
      
      {/* Chart container */}
      <div className="flex-1 p-4">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={chartConfig.xAxisKey} 
                tickFormatter={formatXAxisTick} 
              />
              <YAxis />
              <Tooltip />
              <Legend />
              {chartConfig.yAxisKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  activeDot={{ r: 8 }}
                  name={results.columns.find(col => col.name === key)?.displayName || key}
                />
              ))}
            </LineChart>
          ) : type === 'bar' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={chartConfig.xAxisKey} 
                tickFormatter={formatXAxisTick} 
              />
              <YAxis />
              <Tooltip />
              <Legend />
              {chartConfig.yAxisKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[index % COLORS.length]}
                  name={results.columns.find(col => col.name === key)?.displayName || key}
                />
              ))}
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ResultsChart;