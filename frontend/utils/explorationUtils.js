// utils/explorationUtils.js

// Extract available columns for a given table from metadata
export const getAvailableColumns = (currentTable, metadata) => {
  if (!currentTable || !metadata.columns) return [];

  return Object.keys(metadata.columns)
    .filter((key) => key.startsWith(`${currentTable}.`))
    .map((key) => {
      const [table, column] = key.split('.');
      return {
        id: column,
        name: metadata.columns[key]?.displayName || column,
        type: metadata.columns[key]?.dataType || 'string',
      };
    });
};
