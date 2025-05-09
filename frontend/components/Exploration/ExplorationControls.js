import React, { useState, useRef, useEffect, useMemo } from 'react';
import TimeRangeSelector from './TimeRangeSelector';
import FilterBar from './FilterBar';
import Dropdown from './Dropdown';
import { useAppState } from '../../context/AppStateContext';
import api from '../../utils/apiClient';
import { useOutsideClickAndEscape } from '../../utils/hooks';
import { getAvailableColumns } from '../../utils/explorationUtils';
import { isServerPagination } from '../../utils/tableUtils';

function ExplorationControls({ onRunQuery, isLoading }) {
  const { state, actions } = useAppState();
  const { currentExploration, currentConnection, metadata } = state;
  const [filterText, setFilterText] = useState('');
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Check if a table is selected
  const isTableSelected = Boolean(currentExploration.source?.table);

  // Get available columns for current table - used for fields selector and dropdowns
  const availableColumns = getAvailableColumns(currentExploration.source?.table, metadata);

  // Detect and prioritize timestamp columns based on type and name
  const timestampColumns = useMemo(() => {
    // First collect all timestamp-compatible columns
    const timeColumns = availableColumns.filter(
      (col) =>
        col.type &&
        (col.type.toLowerCase().includes('timestamp') || col.type.toLowerCase().includes('date'))
    );

    // Sort columns by priority:
    // 1. Type priority: timestamp > date
    // 2. Name priority: timestamp > time > date > created_at > updated_at > everything else
    return timeColumns.sort((a, b) => {
      // First prioritize by type (timestamp over date)
      const aIsTimestamp = a.type.toLowerCase().includes('timestamp');
      const bIsTimestamp = b.type.toLowerCase().includes('timestamp');

      if (aIsTimestamp && !bIsTimestamp) return -1;
      if (!aIsTimestamp && bIsTimestamp) return 1;

      // If same type, prioritize by name
      const nameOrder = ['timestamp', 'time', 'date', 'created_at', 'updated_at'];

      // Get the priority index of each column name (or max value if not found)
      const aNameIndex = nameOrder.findIndex((name) => a.name.toLowerCase().includes(name));
      const bNameIndex = nameOrder.findIndex((name) => b.name.toLowerCase().includes(name));

      // If neither name is in the priority list, maintain original order
      if (aNameIndex === -1 && bNameIndex === -1) return 0;

      // If one name is in the list and the other isn't, prioritize the one in the list
      if (aNameIndex === -1) return 1;
      if (bNameIndex === -1) return -1;

      // Both names are in the list, prioritize by index
      return aNameIndex - bNameIndex;
    });
  }, [availableColumns]);

  // Check if we have any timestamp columns
  const hasTimestampColumns = timestampColumns.length > 0;

  // Pick a default timestamp column if available and needed
  useEffect(() => {
    // Only run this when table changes or timestamp columns change
    if (currentExploration.source?.table) {
      const currentTimestampColumn = currentExploration.timeRange?.column;

      if (hasTimestampColumns) {
        // If no current timestamp column or it's not valid, set the best one
        const isCurrentColumnValid = timestampColumns.some(
          (col) => col.id === currentTimestampColumn || col.name === currentTimestampColumn
        );

        if (!currentTimestampColumn || !isCurrentColumnValid) {
          // Choose the highest priority timestamp column
          const bestTimestampColumn = timestampColumns[0].id;

          // Update exploration with the selected timestamp column
          actions.updateCurrentExploration({
            timeRange: {
              ...currentExploration.timeRange,
              column: bestTimestampColumn,
            },
          });

          console.log(`Selected best timestamp column: ${bestTimestampColumn}`);
        }
      } else {
        // If no timestamp columns, ensure timeRange has column set to null
        // This prevents a validation error on the backend
        if (currentExploration.timeRange && currentExploration.timeRange.column !== null) {
          actions.updateCurrentExploration({
            timeRange: {
              ...currentExploration.timeRange,
              column: null,
            },
          });

          console.log('No timestamp columns available, set timeRange column to null');
        }
      }
    }
  }, [currentExploration.source?.table, timestampColumns]);

  // Get available tables from metadata
  const availableTables = metadata.tables ? Object.values(metadata.tables) : [];

  // Filter tables based on search text
  const filteredTables = availableTables.filter((table) =>
    table.name.toLowerCase().includes(filterText.toLowerCase())
  );

  // Handle table selection
  const handleTableSelect = async (tableName) => {
    // Close dropdown immediately for better responsiveness
    setShowTableDropdown(false);
    setFilterText('');

    const connectionId = currentConnection?.id;
    const vizType = currentExploration.visualization?.type;

    // Prepare update object
    const updateObj = {
      source: {
        table: tableName,
        connectionId: connectionId,
      },
      filters: [],
      groupBy: [],
      selectedFields: [], // Reset selected fields when table changes
    };

    // Only set aggregation for non-preview visualizations
    if (vizType !== 'preview') {
      updateObj.agg = [{ function: 'count', column: null, alias: 'count' }];
    } else {
      updateObj.agg = []; // Clear aggregation for preview mode
    }

    // Update the current exploration with the selected table and reset pagination offset
    actions.updateCurrentExploration({
      ...updateObj,
      offset: 0, // Reset pagination to first page when table changes
    });

    // Clear query results when table changes
    actions.updateQueryResults(null);

    // Fetch columns for the selected table
    try {
      const columns = await api.get(
        `/api/v1/metadata/connections/${connectionId}/tables/${tableName}/columns`
      );
      console.log('Fetched columns for table:', columns);

      // Convert array of columns to object with keys formatted as "tableName.columnName"
      const columnsObject = {};
      columns.forEach((column) => {
        const key = `${tableName}.${column.name}`;
        columnsObject[key] = {
          name: column.name,
          dataType: column.dataType,
          description: column.description,
        };
      });

      actions.updateMetadata({
        columns: { ...metadata.columns, ...columnsObject },
      });
    } catch (error) {
      console.error(`Error fetching columns for table ${tableName}:`, error);
    }
  };

  useOutsideClickAndEscape(dropdownRef, () => {
    setShowTableDropdown(false);
  });

  const FieldsSelector = ({ columns, currentSelection, onSelectionChange }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedFields, setSelectedFields] = useState(currentSelection);
    const [searchTerm, setSearchTerm] = useState('');
    const isInitialRender = useRef(true);
    const fieldsRef = useRef(null);
    const { state } = useAppState();
    const { currentExploration } = state;

    // Helper functions to check column types and aggregation
    const isNumericType = (columnType) =>
      ['number', 'integer', 'float', 'decimal', 'numeric'].includes(columnType);

    // Check if using a non-COUNT aggregate function
    const isNonCountAgg =
      currentExploration.agg?.length > 0 &&
      currentExploration.agg[0]?.function !== 'count' &&
      currentExploration.visualization?.type !== 'preview';

    useEffect(() => {
      setSelectedFields(currentSelection || []);
    }, [currentSelection]);

    useEffect(() => {
      if (isInitialRender.current) {
        isInitialRender.current = false;
        return;
      }

      onSelectionChange(selectedFields);
    }, [selectedFields]); // Intentionally omitting onSelectionChange to prevent infinite loops

    useOutsideClickAndEscape(fieldsRef, () => {
      if (isExpanded) setIsExpanded(false);
    });

    const toggleDropdown = () => {
      setIsExpanded(!isExpanded);
    };

    const toggleField = (columnId, columnType) => {
      // If using non-COUNT aggregation (and not in preview visualization),
      // only allow numeric columns to be selected
      if (isNonCountAgg && !isNumericType(columnType) && !selectedFields.includes(columnId)) {
        console.log(`Blocking non-numeric column: ${columnId} of type ${columnType}`);
        return; // Prevent non-numeric column selection
      }

      if (selectedFields.includes(columnId)) {
        setSelectedFields(selectedFields.filter((id) => id !== columnId));
      } else {
        setSelectedFields([...selectedFields, columnId]);
      }
    };

    const selectAll = () => {
      // If using non-COUNT aggregation (and not in preview visualization),
      // only select numeric columns
      if (isNonCountAgg) {
        // Debug the columns and their types
        console.log('Columns data:', columns);
        // Find columns that have numeric data types
        const numericColumns = columns.filter((col) => isNumericType(col.type));
        console.log('Numeric columns:', numericColumns);

        if (numericColumns.length > 0) {
          setSelectedFields(numericColumns.map((col) => col.id));
        } else {
          // If no numeric columns found, don't change the selection
          console.warn('No numeric columns found for non-COUNT aggregation');
        }
      } else {
        setSelectedFields(columns.map((col) => col.id));
      }
    };

    const selectNone = () => {
      setSelectedFields([]);
    };

    const filteredColumns = columns.filter(
      (col) => col.name && col.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div
        ref={fieldsRef}
        className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm overflow-hidden ${
          isExpanded ? 'fields-selector-expanded' : ''
        }`}
      >
        {/* Header */}
        <div
          className="fields-selector-header px-4 py-3 bg-gray-50 dark:bg-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          onClick={toggleDropdown}
        >
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fields</span>
            <div className="ml-2 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
              {selectedFields.length}/{columns.length}
            </div>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${
              isExpanded ? 'transform rotate-180' : ''
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Expandable content */}
        {isExpanded && (
          <div className="p-4">
            {/* Search and actions */}
            <div className="flex items-center justify-between mb-3">
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search fields..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex space-x-2 ml-2">
                <button
                  type="button"
                  className={`px-3 py-1.5 min-w-[60px] text-sm font-medium rounded-md transition-colors ${
                    selectedFields.length === columns.length
                      ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                      : 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => selectAll()}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 min-w-[60px] text-sm font-medium rounded-md transition-colors ${
                    selectedFields.length === 0
                      ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                      : 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => selectNone()}
                >
                  None
                </button>
              </div>
            </div>

            {/* Field list with checkboxes */}
            <div className="overflow-y-auto max-h-60">
              {isNonCountAgg && (
                <div className="mb-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                  <strong>Note:</strong> For non-COUNT aggregations, only numeric fields can be
                  selected.
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {filteredColumns.length > 0 ? (
                  filteredColumns.map((column) => (
                    <div key={column.id} className="flex items-center">
                      <input
                        id={`field-${column.id}`}
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={selectedFields.includes(column.id)}
                        onChange={() => toggleField(column.id, column.type)}
                        disabled={
                          isNonCountAgg &&
                          !isNumericType(column.type) &&
                          !selectedFields.includes(column.id)
                        }
                      />
                      <label
                        htmlFor={`field-${column.id}`}
                        className={`ml-2 block text-sm truncate ${
                          isNonCountAgg &&
                          !isNumericType(column.type) &&
                          !selectedFields.includes(column.id)
                            ? 'text-gray-400 dark:text-gray-500'
                            : 'text-gray-900 dark:text-gray-200'
                        }`}
                        title={`${column.name}${
                          isNonCountAgg && !isNumericType(column.type)
                            ? ' (non-numeric columns disabled for non-COUNT aggregations)'
                            : ''
                        }`}
                      >
                        {column.name}
                        {isNumericType(column.type) && (
                          <span className="ml-1 text-xs text-blue-500">#</span>
                        )}
                      </label>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                    No fields match your search
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Top Controls - with table selector and run button side by side */}
        <div className="flex items-center justify-between mb-3">
          {/* Table Selector with Typeahead */}
          <div className="relative w-3/4 mr-4" ref={dropdownRef}>
            <div
              onClick={() => setShowTableDropdown(!showTableDropdown)}
              className="cursor-pointer flex items-center h-10 px-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md hover:border-blue-500 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                />
              </svg>
              <span
                className={`text-sm truncate overflow-hidden ${
                  currentExploration.source?.table
                    ? 'text-gray-900 dark:text-gray-200 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                title={currentExploration.source?.table}
              >
                {currentExploration.source?.table
                  ? currentExploration.source.table.split('.').pop() ||
                    currentExploration.source.table
                  : 'Select a data table'}
              </span>
              <svg
                className="ml-auto flex-shrink-0 w-4 h-4 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search tables..."
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {filteredTables.length > 0 ? (
                    filteredTables.map((table) => (
                      <div
                        key={table.name}
                        className={`px-3 py-2 ${
                          table.name === currentExploration.source?.table
                            ? 'bg-blue-100 dark:bg-blue-900/40 cursor-default'
                            : 'hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer'
                        } text-gray-800 dark:text-gray-200`}
                        onClick={() => {
                          // Only process click if this isn't the current table
                          if (table.name !== currentExploration.source?.table) {
                            handleTableSelect(table.name);
                          }
                        }}
                        title={table.name}
                      >
                        <div className="font-medium flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2 flex-shrink-0 text-blue-500 dark:text-blue-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                            />
                          </svg>
                          {table.name.split('.').pop() || table.name}
                        </div>
                        {table.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                            {table.description}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-gray-500 dark:text-gray-400 text-center">
                      No tables found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              className={`inline-flex items-center px-4 py-2 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isLoading || !isTableSelected
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              }`}
              onClick={onRunQuery}
              disabled={isLoading || !isTableSelected}
              title={
                !isTableSelected
                  ? 'Select a table first'
                  : isLoading
                    ? 'Query is running...'
                    : 'Query'
              }
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

      <div className="overflow-y-auto flex-1 p-4 space-y-4 bg-gray-50 dark:bg-dark-bg">
        {!isTableSelected && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-4">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                Please select a table first to configure your query.
              </p>
            </div>
          </div>
        )}

        {/* Visualization Type Selection */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Visualization Type
            </label>
            {/* Empty space to match Order By's button layout */}
            <div className="ml-1 w-10 h-6"></div>
          </div>
          <Dropdown
            label=""
            options={[
              {
                id: 'preview',
                label: 'Preview 👁️',
                tooltip: 'Raw data preview showing a sample of rows',
              },
              {
                id: 'table',
                label: 'Table 🔢',
                tooltip: 'Aggregations, sorting, and grouping',
              },
              {
                id: 'line',
                label: 'Line Chart 📈',
                tooltip: 'Trends over time or sequences',
              },
              {
                id: 'bar',
                label: 'Bar Chart 📊',
                tooltip: 'Compare values across categories',
              },
              {
                id: 'pie',
                label: 'Pie Chart 🥧',
                tooltip: 'Proportion of parts to a whole',
              },
            ]}
            value={currentExploration.visualization?.type}
            onChange={(type) => {
              // Create update object for visualization type
              const updateObj = {
                visualization: {
                  ...currentExploration.visualization,
                  type,
                },
                // Reset selected fields when changing visualization type
                selectedFields: [],
              };

              // Special handling for different visualization types
              if (type === 'pie') {
                // For pie charts, clear sort and reset granularity
                updateObj.sort = [];
                updateObj.granularity = 'auto';
              }

              if (type === 'preview') {
                // For preview mode, clear aggregation and group by (but allow Order By and Limit)
                updateObj.agg = [];
                updateObj.groupBy = [];
              } else if (currentExploration.visualization?.type === 'preview' && !updateObj.agg) {
                // When switching from preview to another viz type, add default aggregation
                updateObj.agg = [{ function: 'count', column: null, alias: 'count' }];
              }

              // Clear query results when visualization type changes
              actions.updateQueryResults(null);

              // Reset pagination offset when visualization type changes
              actions.updateCurrentExploration({
                ...updateObj,
                offset: 0, // Reset to first page
              });
            }}
            enableTypeahead={true}
            disabled={!isTableSelected}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 ${isTableSelected ? 'text-blue-600' : 'text-gray-400'}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
            }
          />
        </div>

        {/* Time Range Selector */}
        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <TimeRangeSelector
            disabled={!isTableSelected}
            hasTimestampColumns={hasTimestampColumns}
          />
          {isTableSelected && !hasTimestampColumns && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800">
              <strong>Note:</strong> No time/date columns were found in this table. Time range
              filtering is disabled.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Group By - Dropdown with label outside */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Group By
              </label>
              <div className="ml-1 w-10 h-6"></div>
            </div>
            <Dropdown
              label=""
              options={[
                { id: 'none', label: 'None' },
                ...availableColumns.map((column) => ({
                  id: column.id,
                  label: column.name,
                })),
              ]}
              value={(currentExploration.groupBy || [])[0] || 'none'}
              onChange={(value) => {
                if (value === 'none') {
                  actions.updateCurrentExploration({
                    groupBy: [],
                    offset: 0, // Reset pagination when changing groupBy
                  });
                } else {
                  actions.updateCurrentExploration({
                    groupBy: [value],
                    offset: 0, // Reset pagination when changing groupBy
                  });
                }
              }}
              enableTypeahead={true}
              disabled={!isTableSelected || currentExploration.visualization?.type === 'preview'}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 ${isTableSelected ? 'text-green-600' : 'text-gray-400'}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              }
            />
          </div>

          {/* Order By - With tiny direction button near label */}
          <div>
            {/* Use the same structure and margin as other dropdowns */}
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Order By
              </label>

              <button
                type="button"
                className={`ml-1 px-1 py-0.5 h-6 text-xs border rounded focus:outline-none ${
                  !isTableSelected ||
                  !(currentExploration.sort && currentExploration.sort.length > 0) ||
                  currentExploration.visualization?.type === 'pie'
                    ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => {
                  // Only proceed if table is selected, sort exists, and viz type is not pie
                  if (
                    !isTableSelected ||
                    !(currentExploration.sort && currentExploration.sort.length > 0) ||
                    currentExploration.visualization?.type === 'pie'
                  )
                    return;

                  // Get the current sort setting
                  const currentSort = currentExploration.sort[0];

                  // Toggle the direction
                  const newDirection = currentSort.direction === 'desc' ? 'asc' : 'desc';

                  // Update with the new direction
                  actions.updateCurrentExploration({
                    sort: [{ column: currentSort.column, direction: newDirection }],
                    offset: 0, // Reset pagination when changing sort direction
                  });
                }}
                title={
                  !isTableSelected
                    ? 'Select a table first'
                    : !(currentExploration.sort && currentExploration.sort.length > 0)
                      ? 'Select a column to sort'
                      : currentExploration.sort[0]?.direction === 'desc'
                        ? 'Descending order'
                        : 'Ascending order'
                }
                disabled={
                  !isTableSelected ||
                  !(currentExploration.sort && currentExploration.sort.length > 0)
                }
              >
                <div className="flex items-center">
                  <span>
                    {currentExploration.sort &&
                    currentExploration.sort.length > 0 &&
                    currentExploration.sort[0].direction === 'desc'
                      ? 'Desc'
                      : 'Asc'}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-3 w-3 ml-1 ${
                      !isTableSelected ||
                      !(currentExploration.sort && currentExploration.sort.length > 0)
                        ? 'text-gray-400 dark:text-gray-600'
                        : 'text-blue-600'
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    {currentExploration.sort &&
                    currentExploration.sort.length > 0 &&
                    currentExploration.sort[0].direction === 'desc' ? (
                      <path d="M5 9l5 5 5-5H5z" /> // Down arrow
                    ) : (
                      <path d="M5 11l5-5 5 5H5z" /> // Up arrow
                    )}
                  </svg>
                </div>
              </button>
            </div>

            <Dropdown
              label=""
              options={[
                { id: 'none', label: 'None' },
                ...availableColumns.map((column) => ({
                  id: column.id,
                  label: column.name,
                })),
              ]}
              value={
                // Get the column from sort if it exists, otherwise 'none'
                currentExploration.sort && currentExploration.sort.length > 0
                  ? currentExploration.sort[0].column
                  : 'none'
              }
              onChange={(value) => {
                if (value === 'none') {
                  // Clear the sort
                  actions.updateCurrentExploration({
                    sort: [],
                    offset: 0, // Reset pagination when changing sort
                  });
                } else {
                  // Get current direction or use default
                  let currentDirection = 'asc';

                  if (currentExploration.sort && currentExploration.sort.length > 0) {
                    currentDirection = currentExploration.sort[0].direction;
                  }

                  // Set the sort with the new column and current direction
                  actions.updateCurrentExploration({
                    sort: [{ column: value, direction: currentDirection }],
                    offset: 0, // Reset pagination when changing sort
                  });
                }
              }}
              enableTypeahead={true}
              disabled={!isTableSelected || currentExploration.visualization?.type === 'pie'}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 ${
                    isTableSelected && currentExploration.visualization?.type !== 'pie'
                      ? 'text-blue-600'
                      : 'text-gray-400'
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3z" />
                </svg>
              }
            />
          </div>

          {/* Aggregate - Dropdown */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Aggregate
              </label>
              <div className="ml-1 w-10 h-6"></div>
            </div>
            <Dropdown
              label=""
              options={[
                { id: 'count', label: 'Count' },
                { id: 'sum', label: 'Sum' },
                { id: 'avg', label: 'Avg' },
                { id: 'min', label: 'Min' },
                { id: 'max', label: 'Max' },
              ]}
              value={(currentExploration.agg && currentExploration.agg[0]?.function) || 'avg'}
              onChange={(value) => {
                // Check if we're switching between COUNT and non-COUNT
                const isFromCount = currentExploration.agg?.[0]?.function === 'count';
                const isToCount = value === 'count';

                // Reset selected fields when changing between count and non-count
                const updateObj = {
                  agg: [
                    {
                      function: value,
                      column: null,
                      alias: value,
                    },
                  ],
                };

                // Reset field selection when switching between COUNT and non-COUNT
                if (isFromCount !== isToCount) {
                  updateObj.selectedFields = [];
                }

                actions.updateCurrentExploration({
                  ...updateObj,
                  offset: 0, // Reset pagination when changing aggregation
                });
              }}
              disabled={!isTableSelected || currentExploration.visualization?.type === 'preview'}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 ${isTableSelected ? 'text-purple-600' : 'text-gray-400'}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
          </div>

          {/* Limit - Dropdown */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Limit
              </label>
              <div className="ml-1 w-10 h-6"></div>
            </div>
            <Dropdown
              label=""
              options={[
                { id: '50', label: '50 rows' },
                { id: '100', label: '100 rows' },
                { id: '1000', label: '1000 rows' },
                { id: 'none', label: 'No limit' },
              ]}
              value={currentExploration.limit}
              onChange={(value) => {
                actions.updateCurrentExploration({
                  limit: value,
                  offset: isServerPagination(value, currentExploration.visualization?.type)
                    ? 0
                    : null,
                });
              }}
              disabled={!isTableSelected}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 ${isTableSelected ? 'text-yellow-600' : 'text-gray-400'}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
          </div>

          {/* Granularity - Dropdown (for time-based data) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Granularity
              </label>
              <div className="ml-1 w-10 h-6"></div>
            </div>
            <Dropdown
              label=""
              options={[
                { id: 'auto', label: 'Auto' },
                { id: 'second', label: 'Second' },
                { id: 'minute', label: 'Minute' },
                { id: 'hour', label: 'Hour' },
                { id: 'day', label: 'Day' },
                { id: 'month', label: 'Month' },
              ]}
              value={currentExploration.granularity}
              onChange={(value) => {
                // Update the exploration with the selected granularity
                // When auto is selected, it will be resolved by the frontend
                // before sending to backend
                actions.updateCurrentExploration({
                  granularity: value,
                  offset: 0, // Reset pagination when changing granularity
                });

                // Clear existing results when granularity changes
                actions.updateQueryResults(null);
              }}
              disabled={
                !isTableSelected ||
                !hasTimestampColumns ||
                ['table', 'pie', 'bar', 'preview'].includes(currentExploration.visualization?.type)
              } // Disable granularity when no time columns or for incompatible viz types
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 ${
                    isTableSelected && hasTimestampColumns ? 'text-indigo-600' : 'text-gray-400'
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
          </div>

          {/* Timestamp Column Selector */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Time Column
              </label>
              <div className="ml-1 w-10 h-6"></div>
            </div>
            <Dropdown
              label=""
              options={
                hasTimestampColumns
                  ? timestampColumns.map((col) => ({ id: col.id, label: col.name }))
                  : [{ id: 'none', label: 'None' }]
              }
              value={currentExploration.timeRange?.column || 'none'}
              onChange={(value) => {
                if (value !== 'none') {
                  actions.updateCurrentExploration({
                    timeRange: {
                      ...currentExploration.timeRange,
                      column: value,
                    },
                    offset: 0, // Reset pagination when changing time column
                  });
                }
              }}
              disabled={!isTableSelected || !hasTimestampColumns}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 ${
                    isTableSelected && hasTimestampColumns ? 'text-teal-600' : 'text-gray-400'
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
          </div>
        </div>

        {/* Fields Selector (Collapsible) */}
        <div className={!isTableSelected ? 'opacity-50 cursor-not-allowed' : ''}>
          <div className={!isTableSelected ? 'pointer-events-none' : ''}>
            <FieldsSelector
              columns={availableColumns}
              currentSelection={currentExploration.selectedFields}
              onSelectionChange={(selectedFields) => {
                // Only update if the selection actually changed
                const current = currentExploration.selectedFields;
                const hasChanged =
                  current.length !== selectedFields.length ||
                  current.some((field) => !selectedFields.includes(field)) ||
                  selectedFields.some((field) => !current.includes(field));

                if (hasChanged) {
                  actions.updateCurrentExploration({
                    selectedFields,
                  });
                }
              }}
            />
          </div>
        </div>

        {/* Filters Section */}
        <div
          className={`mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm p-4 ${
            !isTableSelected ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className={!isTableSelected ? 'pointer-events-none' : ''}>
            <FilterBar disabled={!isTableSelected} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExplorationControls;
