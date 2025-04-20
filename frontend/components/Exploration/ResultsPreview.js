import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';

function ResultsPreview({ results, onPageChange }) {
  const { state, actions } = useAppState();
  const { preferences, currentExploration } = state;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(preferences.tablePageSize);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [paginationError, setPaginationError] = useState(null);

  // Update pageSize when preferences change
  useEffect(() => {
    setPageSize(preferences.tablePageSize);
  }, [preferences.tablePageSize]);

  // Reset to page 1 when results change (new query)
  useEffect(() => {
    setCurrentPage(1);
  }, [results?.sql]);

  // Sorting state
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Calculate pagination values
  const totalRows = results?.totalCount || results?.data?.length || 0;
  const totalPages = Math.ceil(totalRows / pageSize);

  // Use the explicit isServerPagination flag
  const isServerPagination = currentExploration?.isServerPagination === true;

  // Calculate display positions
  const startRow = (currentPage - 1) * pageSize;
  const endRow = isServerPagination
    ? startRow + (results?.data?.length || 0)
    : Math.min(startRow + pageSize, totalRows);

  // Get current page of data
  const currentData = isServerPagination
    ? results?.data || [] // For server pagination, just use what the server sent
    : results?.data?.slice(startRow, endRow) || []; // For client pagination, slice the data

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
    if (value === null || value === undefined) {
      return <i className="text-gray-400">(null)</i>;
    }

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

    // Clear any previous errors
    setPaginationError(null);

    // If using server pagination, fetch the new page
    if (onPageChange && isServerPagination) {
      setIsLoadingPage(true);
      const offset = (page - 1) * pageSize;

      onPageChange(offset, pageSize)
        .then(() => {
          // Update the current page on success
          setCurrentPage(page);
        })
        .catch((error) => {
          // Show the error to the user
          setPaginationError(`Error loading page ${page}: ${error.message}`);
          console.error('Pagination error:', error);
        })
        .finally(() => {
          setIsLoadingPage(false);
        });
    } else {
      // For client-side pagination, we can just update the page immediately
      setCurrentPage(page);
    }
  };

  // Change page size
  const changePageSize = (size) => {
    // Clear any previous errors
    setPaginationError(null);

    // Update component state
    setPageSize(size);

    // Update app preferences so both components stay in sync
    actions.updatePreferences({
      tablePageSize: size,
    });

    // Trigger fetch with new page size if using server pagination
    if (onPageChange && isServerPagination) {
      setIsLoadingPage(true);

      onPageChange(0, size)
        .then(() => {
          // Reset to first page on success
          setCurrentPage(1);
        })
        .catch((error) => {
          // Show the error to the user
          setPaginationError(`Error changing page size: ${error.message}`);
          console.error('Page size change error:', error);
        })
        .finally(() => {
          setIsLoadingPage(false);
        });
    } else {
      // For client-side, we can just reset the page immediately
      setCurrentPage(1);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        {totalRows === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
                No data available for preview
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Please check your data selection or try a different query
              </p>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 shadow-sm">
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                {results.columns.map((column) => (
                  <th
                    key={column.name}
                    scope="col"
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={() => handleSort(column.name)}
                  >
                    <div className="flex items-center">
                      <span>{column.name}</span>
                      {sortColumn === column.name && (
                        <span className="ml-1 text-primary dark:text-primary">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedData().map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  {results.columns.map((column) => {
                    const value = row[column.name];
                    const columnType = getColumnType(column.name, value);

                    return (
                      <td
                        key={column.name}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300"
                      >
                        {formatCellValue(value, columnType)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination controls */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
        {paginationError && (
          <div className="absolute inset-x-0 -top-8 flex justify-center">
            <div className="px-4 py-2 bg-red-100 text-red-800 rounded-md shadow-md">
              {paginationError}
            </div>
          </div>
        )}

        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1 || isLoadingPage}
            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
              currentPage === 1 || isLoadingPage
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages || isLoadingPage}
            className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
              currentPage === totalPages || isLoadingPage
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {isLoadingPage ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Loading page {currentPage}...
                </span>
              ) : totalRows > 0 ? (
                <>
                  Showing <span className="font-medium">{startRow + 1}</span> to{' '}
                  <span className="font-medium">{endRow}</span> of{' '}
                  <span className="font-medium">{totalRows}</span> results
                  {isServerPagination && results?.hasMore && (
                    <span className="text-gray-500 ml-1">(more available)</span>
                  )}
                </>
              ) : (
                <>No results found</>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Page size select */}
            <div>
              <select
                id="pageSize"
                name="pageSize"
                className="mt-1 block pl-3 pr-10 py-1 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
              >
                <option value={100}>100 per page</option>
                <option value={200}>200 per page</option>
                <option value={1000}>1000 per page</option>
              </select>
            </div>

            {/* Pagination buttons */}
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1 || isLoadingPage}
                className={`relative inline-flex items-center px-2 py-1 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
                  currentPage === 1 || isLoadingPage
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="sr-only">First</span>⟪
              </button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || isLoadingPage}
                className={`relative inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
                  currentPage === 1 || isLoadingPage
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="sr-only">Previous</span>←
              </button>

              {/* Page number indicators */}
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 3) {
                  pageNum = i + 1;
                } else if (currentPage <= 2) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 1) {
                  pageNum = totalPages - 2 + i;
                } else {
                  pageNum = currentPage - 1 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    disabled={isLoadingPage}
                    className={`relative inline-flex items-center px-3 py-1 border text-sm font-medium ${
                      isLoadingPage
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : currentPage === pageNum
                          ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-300'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || isLoadingPage}
                className={`relative inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
                  currentPage === totalPages || isLoadingPage
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="sr-only">Next</span>→
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages || isLoadingPage}
                className={`relative inline-flex items-center px-2 py-1 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
                  currentPage === totalPages || isLoadingPage
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
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

export default ResultsPreview;
