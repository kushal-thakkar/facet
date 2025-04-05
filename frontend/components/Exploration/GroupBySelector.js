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
        <label className="block text-sm font-medium text-gray-700">Group By</label>

        <div className="flex space-x-2">
          <button
            type="button"
            className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
            onClick={() => setShowDialog(true)}
          >
            + Add Dimension
          </button>

          {groupBy.length > 0 && (
            <button
              type="button"
              className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
              onClick={clearAll}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Group By Pills */}
      <div className="flex flex-wrap gap-2">
        {groupBy.length > 0 ? (
          groupBy.map((dimension, index) => (
            <div
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-800 text-sm"
            >
              <span>{formatDimension(dimension)}</span>
              <button
                type="button"
                className="ml-1 text-green-600 hover:text-green-800"
                onClick={() => removeDimension(dimension)}
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500 italic">No dimensions selected</div>
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
