import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
  formatCellValue,
  getColumnType,
  sortData,
  getPaginationInfo,
} from '../../utils/tableUtils';

function DataTable({ results, emptyMessage = 'No data available' }) {
  const { state, actions } = useAppState();
  const { preferences } = state;

  // Store the columns to display at the time results are received
  const [displayColumns, setDisplayColumns] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(preferences.tablePageSize);

  // Update pageSize when preferences change
  useEffect(() => {
    setPageSize(preferences.tablePageSize);
  }, [preferences.tablePageSize]);

  // Sorting state
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Set the display columns when results are received
  useEffect(() => {
    if (results && results.columns) {
      setDisplayColumns(results.columns);
    }
  }, [results]);

  // Get pagination info
  const { totalRows, totalPages, startRow, endRow, currentData } = getPaginationInfo(
    results?.data,
    currentPage,
    pageSize
  );

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
  const sortedData = sortData(currentData, sortColumn, sortDirection);

  // Handle page change
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Change page size
  const changePageSize = (size) => {
    // Update component state
    setPageSize(size);
    setCurrentPage(1); // Reset to first page on size change

    // Update app preferences so both components stay in sync
    actions.updatePreferences({
      tablePageSize: size,
    });
  };

  // Render cell content
  const renderCellContent = (value, columnType) => {
    const formattedValue = formatCellValue(value, columnType);

    if (formattedValue.type === 'component') {
      return <i className="text-gray-400">(null)</i>;
    }

    return formattedValue.content;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        {totalRows === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
                {emptyMessage}
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
                {displayColumns.map((column) => (
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
              {sortedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  {displayColumns.map((column) => {
                    const value = row[column.name];
                    const columnType = getColumnType(column.name, value, displayColumns);

                    return (
                      <td
                        key={column.name}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300"
                      >
                        {renderCellContent(value, columnType)}
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
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
              currentPage === 1
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
              currentPage === totalPages
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
              {totalRows > 0 ? (
                <>
                  Showing <span className="font-medium">{startRow + 1}</span> to{' '}
                  <span className="font-medium">{endRow}</span> of{' '}
                  <span className="font-medium">{totalRows}</span> results
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
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-1 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
                  currentPage === 1
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="sr-only">First</span>⟪
              </button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
                  currentPage === 1
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
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
                    className={`relative inline-flex items-center px-3 py-1 border text-sm font-medium ${
                      currentPage === pageNum
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
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
                  currentPage === totalPages
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="sr-only">Next</span>→
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-1 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
                  currentPage === totalPages
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

export default DataTable;
