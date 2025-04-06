// components/Exploration/ExplorationControls.js
import React, { useState, useRef } from 'react';
import TimeRangeSelector from './TimeRangeSelector';
import FilterBar from './FilterBar';
import GroupBySelector from './GroupBySelector';
import MetricSelector from './MetricSelector';
import { useAppState } from '../../context/AppStateContext';

function ExplorationControls({ onRunQuery, isLoading }) {
  const { state, actions } = useAppState();
  const { currentExploration, currentConnection, metadata } = state;
  const [filterText, setFilterText] = useState('');
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Get available tables from metadata
  const availableTables = metadata.tables ? Object.values(metadata.tables) : [];

  // Filter tables based on search text
  const filteredTables = availableTables.filter((table) =>
    table.name.toLowerCase().includes(filterText.toLowerCase())
  );

  // Handle table selection
  const handleTableSelect = (tableName) => {
    const connectionId = currentConnection?.id;

    actions.updateCurrentExploration({
      source: {
        table: tableName,
        connectionId: connectionId,
      },
      filters: [],
      groupBy: [],
      metrics: [],
    });
    setShowTableDropdown(false);
    setFilterText('');
  };

  // Handle click outside dropdown
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowTableDropdown(false);
    }
  };

  // Set up event listener for click outside
  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-gray-700">
        {/* Top Controls - with table selector and run button side by side */}
        <div className="flex items-center justify-between mb-3">
          {/* Table Selector with Typeahead */}
          <div className="relative flex-grow mr-3" ref={dropdownRef}>
            <div
              onClick={() => setShowTableDropdown(!showTableDropdown)}
              className="cursor-pointer flex items-center h-10 px-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-bg rounded-lg hover:border-primary dark:hover:border-primary transition-colors"
            >
              <span
                className={`text-sm ${
                  currentExploration.source?.table
                    ? 'text-gray-900 dark:text-gray-100 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {currentExploration.source?.table || 'Select a data table'}
              </span>
              <svg
                className="ml-auto w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </div>

            {/* Dropdown for table selection */}
            {showTableDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    placeholder="Search tables..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-dark-bg dark:text-gray-200"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {filteredTables.length > 0 ? (
                    filteredTables.map((table) => (
                      <div
                        key={table.name}
                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-800 dark:text-gray-100"
                        onClick={() => handleTableSelect(table.name)}
                      >
                        <div className="font-medium">{table.name}</div>
                        {table.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {table.description}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-gray-500 text-center">No tables found</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Run Query Button */}
          <div>
            <button
              className={`btn whitespace-nowrap ${
                isLoading
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'btn-primary'
              }`}
              onClick={onRunQuery}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  Running...
                </span>
              ) : (
                <span className="flex items-center">
                  <svg
                    className="mr-1.5 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    ></path>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  Query
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-3 space-y-5">
        {/* Time Range */}
        <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
          <TimeRangeSelector />
        </div>

        {/* Filters */}
        <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
          <FilterBar />
        </div>

        {/* Group By */}
        <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
          <GroupBySelector />
        </div>

        {/* Metrics */}
        <div>
          <MetricSelector />
        </div>
      </div>
    </div>
  );
}

export default ExplorationControls;
