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

// Format x-axis tick values with time granularity awareness
// Note: We keep original timezone and don't convert to local timezone
export const formatXAxisTick = (value, granularity) => {
  if (value === null || value === undefined) return '';

  // If it looks like a date/timestamp, format it based on granularity
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      // Keep the original date format without timezone conversion
      // Just display different parts based on granularity
      const parts = {
        year: value.substring(0, 4),
        month: value.substring(5, 7),
        day: value.substring(8, 10),
        hour: value.length >= 13 ? value.substring(11, 13) : '00',
        minute: value.length >= 16 ? value.substring(14, 16) : '00',
      };

      // Simple month name mapping
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const monthIndex = parseInt(parts.month, 10) - 1;
      const monthName = monthNames[monthIndex] || parts.month;

      // Format based on granularity
      if (granularity === 'minute') {
        return `${monthName} ${parseInt(parts.day, 10)} ${parts.hour}:${parts.minute}`;
      } else if (granularity === 'hour') {
        return `${monthName} ${parseInt(parts.day, 10)} ${parts.hour}:00`;
      } else if (granularity === 'day') {
        return `${monthName} ${parseInt(parts.day, 10)}`;
      } else if (granularity === 'week') {
        return `${monthName} ${parseInt(parts.day, 10)}`;
      } else if (granularity === 'month') {
        return `${monthName} ${parts.year}`;
      } else {
        // Default: keep original ISO format
        return value.substring(0, 10);
      }
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
export const CustomTooltip = ({ active, payload, label, granularity }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  // Format the label if it's a date and we have granularity info
  let formattedLabel = label;
  if (typeof label === 'string' && /^\d{4}-\d{2}-\d{2}/.test(label) && granularity) {
    formattedLabel = formatXAxisTick(label, granularity);
  }

  return (
    <div className="bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 border border-gray-300 dark:border-gray-700 shadow-md rounded-md p-2 text-xs max-w-xs">
      <div className="font-medium text-gray-900 dark:text-gray-200 mb-1">{formattedLabel}</div>
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
