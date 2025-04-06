// components/Exploration/GroupBySelector.js
import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';

function GroupBySelector() {
  const { state, actions } = useAppState();
  const { currentExploration, metadata } = state;

  const [showDialog, setShowDialog] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState('');

  // Get the current groupBy array or default to empty
  const groupBy = currentExploration.groupBy || [];

  // Get available columns for current table
  const availableDimensions = currentExploration.source?.table
    ? Object.keys(metadata.columns || {})
        .filter((key) => key.startsWith(`${currentExploration.source.table}.`))
        .map((key) => {
          const [table, column] = key.split('.');
          const columnMeta = metadata.columns[key] || {};

          // Only include dimensions that make sense for grouping
          // Typically avoid high cardinality fields or metrics
          const isGroupable =
            columnMeta.cardinality !== 'high' &&
            !['id', 'uuid'].includes(column.toLowerCase()) &&
            !['float', 'double', 'decimal'].includes(columnMeta.dataType);

          return {
            id: column,
            name: columnMeta.displayName || column,
            dataType: columnMeta.dataType || 'string',
            isGroupable,
          };
        })
        .filter((column) => column.isGroupable)
    : [];

  // Handler for adding a dimension to group by
  const addDimension = () => {
    if (!selectedDimension) return;

    // Avoid duplicates
    if (groupBy.includes(selectedDimension)) {
      setSelectedDimension('');
      setShowDialog(false);
      return;
    }

    // Add to group by
    actions.updateCurrentExploration({
      groupBy: [...groupBy, selectedDimension],
    });

    // Reset form
    setSelectedDimension('');
    setShowDialog(false);
  };

  // Handler for removing a dimension
  const removeDimension = (dimension) => {
    const updatedGroupBy = groupBy.filter((d) => d !== dimension);

    actions.updateCurrentExploration({
      groupBy: updatedGroupBy,
    });
  };

  // Handler for clearing all dimensions
  const clearAll = () => {
    actions.updateCurrentExploration({
      groupBy: [],
    });
  };

  // Format dimension for display
  const formatDimension = (dimension) => {
    // Find column metadata
    const columnKey = `${currentExploration.source?.table}.${dimension}`;
    const columnMeta = metadata.columns?.[columnKey] || {};

    // Return display name or the original dimension
    return columnMeta.displayName || dimension;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <label className="block text-sm font-medium text-gray-700 mr-2">Group By</label>
          <div className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
            {groupBy.length}
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            type="button"
            className="inline-flex items-center px-3 py-1.5 border border-green-500 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 transition-colors shadow-sm"
            onClick={() => setShowDialog(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Dimension
          </button>

          {groupBy.length > 0 && (
            <button
              type="button"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-600 bg-white hover:bg-gray-50 transition-colors shadow-sm"
              onClick={clearAll}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Group By Pills - Enhanced Scuba-like style */}
      <div className="flex flex-wrap gap-2">
        {groupBy.length > 0 ? (
          groupBy.map((dimension, index) => (
            <div
              key={index}
              className="inline-flex items-center px-3 py-1.5 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm shadow-sm hover:bg-green-100 transition-colors"
            >
              <div className="mr-2 p-1 bg-green-200 rounded-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 text-green-700"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="font-medium">{formatDimension(dimension)}</span>
              <button
                type="button"
                className="ml-2 text-green-600 hover:text-green-800 focus:outline-none"
                onClick={() => removeDimension(dimension)}
                aria-label="Remove dimension"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))
        ) : (
          <div className="p-3 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md w-full italic">
            No dimensions selected. Group by allows you to aggregate your data by specific
            attributes.
          </div>
        )}
      </div>

      {/* Add Dimension Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="group-by-dialog-title">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
            ></div>

            {/* Dialog */}
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3
                  className="text-lg leading-6 font-medium text-gray-900"
                  id="group-by-dialog-title"
                >
                  Add Group By Dimension
                </h3>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dimension</label>
                  <select
                    value={selectedDimension}
                    onChange={(e) => setSelectedDimension(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">Select a dimension</option>
                    {availableDimensions.map((dimension) => (
                      <option
                        key={dimension.id}
                        value={dimension.id}
                        disabled={groupBy.includes(dimension.id)}
                      >
                        {dimension.name}{' '}
                        {groupBy.includes(dimension.id) ? '(already selected)' : ''}
                      </option>
                    ))}
                  </select>

                  {/* Date dimensions might need additional options for grouping */}
                  {selectedDimension &&
                    availableDimensions.find(
                      (d) =>
                        d.id === selectedDimension &&
                        (d.dataType === 'date' || d.dataType === 'timestamp')
                    ) && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date Granularity
                        </label>
                        <select className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                          <option value="day">Day</option>
                          <option value="week">Week</option>
                          <option value="month">Month</option>
                          <option value="quarter">Quarter</option>
                          <option value="year">Year</option>
                        </select>
                      </div>
                    )}

                  {/* Dialog Actions */}
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                      onClick={addDimension}
                      disabled={!selectedDimension}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                      onClick={() => setShowDialog(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupBySelector;
