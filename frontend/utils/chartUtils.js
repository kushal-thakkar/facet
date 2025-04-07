// utils/chartUtils.js

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
