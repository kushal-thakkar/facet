// Utility functions for data tables

// Format cell value for display
export const formatCellValue = (value, columnType) => {
  if (value === null || value === undefined) {
    return { type: 'component', content: 'null' };
  }

  if (columnType === 'date' || columnType === 'timestamp') {
    // Display timestamp in original format without timezone conversion
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const parts = {
        year: value.substring(0, 4),
        month: value.substring(5, 7),
        day: value.substring(8, 10),
        time: value.length > 10 ? value.substring(11) : '',
      };

      return {
        type: 'text',
        content: parts.time
          ? `${parts.year}-${parts.month}-${parts.day} ${parts.time}`
          : `${parts.year}-${parts.month}-${parts.day}`,
      };
    }
    return { type: 'text', content: value };
  }

  if (typeof value === 'boolean') {
    return { type: 'text', content: value ? 'Yes' : 'No' };
  }

  if (typeof value === 'number') {
    // Format numbers with thousands separators
    return { type: 'text', content: value.toLocaleString() };
  }

  return { type: 'text', content: String(value) };
};

// Get column type from metadata or infer from value
export const getColumnType = (columnName, sampleValue, columns) => {
  // Try to find in metadata
  const columnMeta = columns?.find((col) => col.name === columnName);
  if (columnMeta?.type) return columnMeta.type;

  // Infer from value
  if (sampleValue === null || sampleValue === undefined) return 'string';
  if (typeof sampleValue === 'number') return 'number';
  if (typeof sampleValue === 'boolean') return 'boolean';
  if (typeof sampleValue === 'string') {
    // Check if it looks like a date
    if (/^\d{4}-\d{2}-\d{2}/.test(sampleValue)) return 'date';
  }

  return 'string';
};

// Sort data based on column and direction
export const sortData = (data, sortColumn, sortDirection) => {
  if (!sortColumn || !data) return data;

  return [...data].sort((a, b) => {
    const valueA = a[sortColumn];
    const valueB = b[sortColumn];

    // Handle null/undefined values
    if (valueA === null || valueA === undefined) return sortDirection === 'asc' ? -1 : 1;
    if (valueB === null || valueB === undefined) return sortDirection === 'asc' ? 1 : -1;

    // Compare based on data type
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    }

    // Default string comparison
    const strA = String(valueA);
    const strB = String(valueB);
    return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
  });
};

// Calculate pagination values
export const getPaginationInfo = (data, currentPage, pageSize) => {
  const totalRows = data?.length || 0;
  const totalPages = Math.ceil(totalRows / pageSize);
  const startRow = (currentPage - 1) * pageSize;
  const endRow = Math.min(startRow + pageSize, totalRows);

  return {
    totalRows,
    totalPages,
    startRow,
    endRow,
    currentData: data?.slice(startRow, endRow) || [],
  };
};

export const isServerPagination = (limit, visualizationType) => {
  return limit === 'none' && (visualizationType === 'preview' || visualizationType === 'table');
};
