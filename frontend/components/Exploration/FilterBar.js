// components/Exploration/FilterBar.js
import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';

// Operators based on data type
const OPERATORS_BY_TYPE = {
  string: [
    { id: '=', label: 'equals' },
    { id: '!=', label: 'not equals' },
    { id: 'in', label: 'in list' },
    { id: 'not_in', label: 'not in list' },
    { id: 'contains', label: 'contains' },
    { id: 'starts_with', label: 'starts with' },
    { id: 'ends_with', label: 'ends with' },
    { id: 'is_null', label: 'is empty' },
    { id: 'is_not_null', label: 'is not empty' },
  ],
  number: [
    { id: '=', label: 'equals' },
    { id: '!=', label: 'not equals' },
    { id: '>', label: 'greater than' },
    { id: '>=', label: 'greater than or equal' },
    { id: '<', label: 'less than' },
    { id: '<=', label: 'less than or equal' },
    { id: 'in', label: 'in list' },
    { id: 'not_in', label: 'not in list' },
    { id: 'is_null', label: 'is empty' },
    { id: 'is_not_null', label: 'is not empty' },
  ],
  boolean: [
    { id: '=', label: 'equals' },
    { id: 'is_null', label: 'is empty' },
    { id: 'is_not_null', label: 'is not empty' },
  ],
  date: [
    { id: '=', label: 'equals' },
    { id: '!=', label: 'not equals' },
    { id: '>', label: 'after' },
    { id: '>=', label: 'on or after' },
    { id: '<', label: 'before' },
    { id: '<=', label: 'on or before' },
    { id: 'is_null', label: 'is empty' },
    { id: 'is_not_null', label: 'is not empty' },
  ],
  timestamp: [
    { id: '=', label: 'equals' },
    { id: '!=', label: 'not equals' },
    { id: '>', label: 'after' },
    { id: '>=', label: 'on or after' },
    { id: '<', label: 'before' },
    { id: '<=', label: 'on or before' },
    { id: 'is_null', label: 'is empty' },
    { id: 'is_not_null', label: 'is not empty' },
  ],
};

// Default to string operators if type not found
const getOperatorsForType = (type) => {
  return OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.string;
};

function FilterBar() {
  const { state, actions } = useAppState();
  const { currentExploration, metadata } = state;

  const [showNewFilter, setShowNewFilter] = useState(false);
  const [newFilter, setNewFilter] = useState({
    column: '',
    operator: '=',
    value: '',
  });

  // Get current filters or default to empty array
  const filters = currentExploration.filters || [];

  // Get available columns for current table
  const availableColumns = currentExploration.source?.table
    ? Object.keys(metadata.columns || {})
        .filter((key) => key.startsWith(`${currentExploration.source.table}.`))
        .map((key) => {
          const [table, column] = key.split('.');
          return {
            id: column,
            name: metadata.columns[key]?.displayName || column,
            type: metadata.columns[key]?.dataType || 'string',
          };
        })
    : [];

  // Filter row component
  const FilterRow = ({ filter, index, editable = false, onSave, onRemove, onCancel }) => {
    const columnType = filter.column
      ? availableColumns.find((col) => col.id === filter.column)?.type || 'string'
      : 'string';

    const operators = getOperatorsForType(columnType);
    const requiresValue = !['is_null', 'is_not_null'].includes(filter.operator);

    return (
      <div className="flex items-center bg-blue-50 border border-blue-200 rounded-md p-2 mb-2">
        <div className="flex-grow flex space-x-2">
          {editable ? (
            <>
              <select
                className="bg-white border border-gray-300 rounded px-2 py-1.5 min-w-[120px] text-sm"
                value={filter.column}
                onChange={(e) => onSave({ ...filter, column: e.target.value })}
              >
                <option value="">Select field</option>
                {availableColumns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>

              <select
                className="bg-white border border-gray-300 rounded px-2 py-1.5 min-w-[120px] text-sm"
                value={filter.operator}
                onChange={(e) => onSave({ ...filter, operator: e.target.value })}
                disabled={!filter.column}
              >
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.label}
                  </option>
                ))}
              </select>

              {requiresValue ? (
                columnType === 'boolean' ? (
                  <select
                    className="bg-white border border-gray-300 rounded px-2 py-1.5 flex-grow text-sm"
                    value={String(filter.value)}
                    onChange={(e) => onSave({ ...filter, value: e.target.value === 'true' })}
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : columnType === 'date' || columnType === 'timestamp' ? (
                  <input
                    type="date"
                    className="bg-white border border-gray-300 rounded px-2 py-1.5 flex-grow text-sm"
                    value={filter.value || ''}
                    onChange={(e) => onSave({ ...filter, value: e.target.value })}
                  />
                ) : (
                  <input
                    type={columnType === 'number' ? 'number' : 'text'}
                    className="bg-white border border-gray-300 rounded px-2 py-1.5 flex-grow text-sm"
                    value={filter.value || ''}
                    placeholder="Enter value"
                    onChange={(e) =>
                      onSave({
                        ...filter,
                        value:
                          columnType === 'number' ? parseFloat(e.target.value) : e.target.value,
                      })
                    }
                  />
                )
              ) : (
                <div className="bg-white border border-gray-300 rounded px-2 py-1.5 flex-grow text-sm text-gray-400">
                  No value needed
                </div>
              )}
            </>
          ) : (
            <>
              <div className="bg-white border border-gray-300 rounded px-2 py-1.5 min-w-[120px]">
                <span className="text-sm font-medium">
                  {availableColumns.find((col) => col.id === filter.column)?.name || filter.column}
                </span>
              </div>
              <div className="bg-white border border-gray-300 rounded px-2 py-1.5 min-w-[120px]">
                <span className="text-sm">
                  {getOperatorsForType(
                    availableColumns.find((col) => col.id === filter.column)?.type || 'string'
                  ).find((op) => op.id === filter.operator)?.label || filter.operator}
                </span>
              </div>
              <div className="bg-white border border-gray-300 rounded px-2 py-1.5 flex-grow">
                <span className="text-sm font-mono">
                  {['is_null', 'is_not_null'].includes(filter.operator)
                    ? '-'
                    : typeof filter.value === 'object'
                      ? JSON.stringify(filter.value)
                      : String(filter.value)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="ml-2 flex space-x-1">
          {editable ? (
            <>
              <button
                type="button"
                className="text-green-600 hover:text-green-800 focus:outline-none p-1"
                onClick={() => {
                  // Validate
                  if (!filter.column) {
                    alert('Please select a field');
                    return;
                  }

                  if (requiresValue && filter.value === '' && columnType !== 'boolean') {
                    alert('Please enter a value');
                    return;
                  }

                  // If this is a new filter being added
                  if (index === -1) {
                    const updatedFilters = [...filters, filter];
                    actions.updateCurrentExploration({ filters: updatedFilters });
                    setShowNewFilter(false);
                    setNewFilter({ column: '', operator: '=', value: '' });
                  } else {
                    // Just apply edited values
                    onSave(filter);
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="text-red-600 hover:text-red-800 focus:outline-none p-1"
                onClick={onCancel}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
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
            </>
          ) : (
            <button
              type="button"
              className="text-gray-400 hover:text-red-500 focus:outline-none"
              onClick={() => onRemove(index)}
              aria-label="Remove filter"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
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
          )}
        </div>
      </div>
    );
  };

  // Handler for removing a filter
  const removeFilter = (index) => {
    const updatedFilters = [...filters];
    updatedFilters.splice(index, 1);

    actions.updateCurrentExploration({
      filters: updatedFilters,
    });
  };

  // Handler for updating a filter
  const updateFilter = (index, updatedFilter) => {
    const updatedFilters = [...filters];
    updatedFilters[index] = updatedFilter;

    actions.updateCurrentExploration({
      filters: updatedFilters,
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <label className="block text-sm font-medium text-gray-700 mr-2">Filters</label>
          <div className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
            {filters.length}
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center px-3 py-1.5 border border-blue-500 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors shadow-sm"
          onClick={() => setShowNewFilter(true)}
          disabled={showNewFilter}
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
          Add Filter
        </button>
      </div>

      {/* Inline Filter Builder UI */}
      <div className="space-y-2">
        {showNewFilter && (
          <FilterRow
            filter={newFilter}
            index={-1}
            editable={true}
            onSave={(updated) => setNewFilter(updated)}
            onCancel={() => {
              setShowNewFilter(false);
              setNewFilter({ column: '', operator: '=', value: '' });
            }}
          />
        )}

        {filters.length > 0
          ? filters.map((filter, index) => (
              <FilterRow
                key={index}
                filter={filter}
                index={index}
                editable={false}
                onSave={(updated) => updateFilter(index, updated)}
                onRemove={removeFilter}
              />
            ))
          : !showNewFilter && (
              <div className="p-3 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md w-full text-center">
                No filters applied
              </div>
            )}
      </div>
    </div>
  );
}

export default FilterBar;
