// Chart color palette used across visualizations
export const CHART_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

// Format x-axis tick values
export const formatXAxisTick = (value) => {
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

// Custom tooltip component for charts
export const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 border border-gray-300 dark:border-gray-700 shadow-md rounded-md p-2 text-xs max-w-xs">
      <div className="font-medium text-gray-900 dark:text-gray-200 mb-1">{label}</div>
      {payload.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center my-1">
          <span className="w-2 h-2 mr-1 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="font-medium mr-1">{entry.name}:</span>
          <span>
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};
