/**
 * Rounds a number to 2 decimal places and correctly handles edge cases
 * @param {number} value - The number to round
 * @returns {number} - The rounded number or the original value if not a number
 */
export function roundToTwoDecimals(value) {
  // Handle non-numeric values by returning them unchanged
  if (value === null || value === undefined || isNaN(Number(value))) {
    return value;
  }

  const numValue = Number(value);
  return Math.round((numValue + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a value for display with rounding and locale formatting for numbers
 * @param {any} value - The value to format
 * @returns {string} - The formatted string
 */
export function formatValue(value) {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'number') {
    const roundedValue = roundToTwoDecimals(value);
    return roundedValue !== null ? roundedValue.toLocaleString() : '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}
