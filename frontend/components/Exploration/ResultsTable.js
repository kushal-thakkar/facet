// components/Exploration/ResultsTable.js
import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';

function ResultsTable({ results }) {
  const { state } = useAppState();
  const { preferences } = state;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(preferences.tablePageSize || 50);

  // Sorting state
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Calculate pagination values
  const totalRows = results?.data?.length || 0;
  const totalPages = Math.ceil(totalRows / pageSize);
  const startRow = (currentPage - 1) * pageSize;
  const endRow = Math.min(startRow + pageSize, totalRows);

  // Get current page of data
  const currentData = results?.data?.slice(startRow, endRow) || [];

  // Handle sort click
  const handleSort = (columnName) => {
    if (sortColumn === columnName) {
      // Toggle direction if already sorting by this column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column
      setSortColumn(columnName);
      setSortDirection('asc');
    }
  };

  // Sort the data
  const sortedData = () => {
    if (!sortColumn || !results?.data) return currentData;

    return [...currentData].sort((a, b) => {
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

  // Format cell value for display
  const formatCellValue = (value, columnType) => {
    if (value === null || value === undefined) return '-';

    if (columnType === 'date' || columnType === 'timestamp') {
      // Format dates in a user-friendly way
      try {
        return new Date(value).toLocaleString();
      } catch (e) {
        return value;
      }
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (typeof value === 'number') {
      // Format numbers with thousands separators
      return value.toLocaleString();
    }

    return String(value);
  };

  // Get column type from metadata or infer from value
  const getColumnType = (columnName, sampleValue) => {
    // Try to find in metadata
    const columnMeta = results?.columns?.find((col) => col.name === columnName);
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

  // Handle page change
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Change page size
  const changePageSize = (size) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page on size change
  };

  return (
    <div className="h-full flex flex-col">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {results?.columns?.map((column) => (
                <th
                  key={column.name}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort(column.name)}
                >
                  <div className="flex items-center">
                    <span>{column.displayName || column.name}</span>
                    {sortColumn === column.name && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData().map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {results.columns.map((column) => {
                  const value = row[column.name];
                  const columnType = getColumnType(column.name, value);

                  return (
                    <td
                      key={column.name}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      {formatCellValue(value, columnType)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{startRow + 1}</span> to{' '}
              <span className="font-medium">{endRow}</span> of{' '}
              <span className="font-medium">{totalRows}</span> results
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Page size select */}
            <div>
              <select
                id="pageSize"
                name="pageSize"
                className="mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
              >
                <option value={10}>10 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
                <option value={250}>250 per page</option>
              </select>
            </div>

            {/* Pagination buttons */}
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">First</span>⟪
              </button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Previous</span>←
              </button>

              {/* Page number buttons - show 5 pages around current page */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                // Calculate which page numbers to show
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === pageNum
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === totalPages
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Next</span>→
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === totalPages
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Last</span>⟫
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultsTable;
