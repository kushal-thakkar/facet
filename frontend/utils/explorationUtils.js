// Extract available columns for a given table from metadata
export const getAvailableColumns = (currentTable, metadata) => {
  if (!currentTable || !metadata.columns) return [];

  return Object.keys(metadata.columns)
    .filter((key) => key.startsWith(`${currentTable}.`))
    .map((key) => {
      return {
        id: metadata.columns[key]?.name,
        name: metadata.columns[key]?.name,
        type: metadata.columns[key]?.dataType,
      };
    });
};

// Determine appropriate granularity based on time range
export const getGranularityForTimeRange = (timeRangePeriod) => {
  if (!timeRangePeriod) {
    throw new Error('Time range period must be provided');
  }

  switch (timeRangePeriod) {
    case 'last_15_min':
      return 'minute';
    case 'last_1_hour':
      return 'minute';
    case 'last_24_hours':
      return 'hour';
    case 'last_7_days':
      return 'day';
    case 'last_30_days':
      return 'day';
    case 'last_90_days':
      return 'week';
    case 'this_quarter':
      return 'week';
    case 'this_year':
      return 'month';
    case 'custom':
      return 'day';
    default:
      throw new Error(`Unrecognized time range period: ${timeRangePeriod}`);
  }
};
