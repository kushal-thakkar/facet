import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { useOutsideClickAndEscape } from '../../utils/hooks';

// Field search select component to fix ESLint errors with hooks in callbacks
function FieldSearchSelect({ filter, index, availableColumns, handleFilterChange }) {
  const [searchValue, setSearchValue] = useState(
    filter.column ? availableColumns.find((col) => col.id === filter.column)?.name || '' : ''
  );

  // Close the dropdown when clicking outside
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Custom hook to handle clicks outside the dropdown and input
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        dropdownRef.current.classList.add('hidden');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update search value when filter column changes externally
  useEffect(() => {
    if (filter.column) {
      const colName = availableColumns.find((col) => col.id === filter.column)?.name || '';
      if (colName && colName !== searchValue) {
        setSearchValue(colName);
      }
    }
  }, [filter.column, searchValue, availableColumns]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 h-10 w-full text-sm text-gray-800 dark:text-gray-200"
        value={searchValue}
        placeholder="Search fields..."
        onChange={(e) => {
          setSearchValue(e.target.value);
          // Show dropdown when typing
          if (dropdownRef.current) {
            dropdownRef.current.classList.remove('hidden');
          }

          // Only clear the column if input is empty
          if (e.target.value === '') {
            handleFilterChange({ ...filter, column: '' }, index);
          } else {
            // Check if there are multiple matching columns
            const matches = availableColumns.filter((col) =>
              col.name.toLowerCase().includes(e.target.value.toLowerCase())
            );

            // Only auto-select if it's an exact match AND there's only one match
            const exactMatch =
              matches.length === 1 &&
              matches[0].name.toLowerCase() === e.target.value.toLowerCase();

            if (exactMatch) {
              handleFilterChange({ ...filter, column: matches[0].id }, index);
            }
          }
        }}
        onClick={() => {
          // Show dropdown on click
          if (dropdownRef.current) {
            dropdownRef.current.classList.remove('hidden');
          }
        }}
      />
      <div
        ref={dropdownRef}
        className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-60 overflow-y-auto hidden"
      >
        {availableColumns
          .filter(
            (col) =>
              searchValue === '' || col.name.toLowerCase().includes(searchValue.toLowerCase())
          )
          .map((col) => (
            <div
              key={col.id}
              className="px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => {
                handleFilterChange({ ...filter, column: col.id }, index);
                setSearchValue(col.name);
                if (dropdownRef.current) {
                  dropdownRef.current.classList.add('hidden');
                }
              }}
            >
              {col.name}
            </div>
          ))}
      </div>
    </div>
  );
}

// Operators based on data type
const OPERATORS_BY_TYPE = {
  string: [
    { id: '=', label: '=' },
    { id: '!=', label: '!=' },
    { id: 'in', label: 'in' },
    { id: 'not_in', label: 'not in' },
    { id: 'contains', label: 'contains' },
    { id: 'starts_with', label: 'starts with' },
    { id: 'ends_with', label: 'ends with' },
    { id: 'is_null', label: 'is null' },
    { id: 'is_not_null', label: 'is not null' },
  ],
  integer: [
    { id: '=', label: '=' },
    { id: '!=', label: '!=' },
    { id: '>', label: '>' },
    { id: '>=', label: '>=' },
    { id: '<', label: '<' },
    { id: '<=', label: '<=' },
    { id: 'in', label: 'in' },
    { id: 'not_in', label: 'not in' },
    { id: 'is_null', label: 'is null' },
    { id: 'is_not_null', label: 'is not null' },
  ],
  number: [
    { id: '=', label: '=' },
    { id: '!=', label: '!=' },
    { id: '>', label: '>' },
    { id: '>=', label: '>=' },
    { id: '<', label: '<' },
    { id: '<=', label: '<=' },
    { id: 'in', label: 'in' },
    { id: 'not_in', label: 'not in' },
    { id: 'is_null', label: 'is null' },
    { id: 'is_not_null', label: 'is not null' },
  ],
  boolean: [
    { id: '=', label: '=' },
    { id: 'is_null', label: 'is null' },
    { id: 'is_not_null', label: 'is not null' },
  ],
  date: [
    { id: '=', label: '=' },
    { id: '!=', label: '!=' },
    { id: '>', label: 'after' },
    { id: '>=', label: 'on or after' },
    { id: '<', label: 'before' },
    { id: '<=', label: 'on or before' },
    { id: 'is_null', label: 'is null' },
    { id: 'is_not_null', label: 'is not null' },
  ],
  timestamp: [
    { id: '=', label: '=' },
    { id: '!=', label: '!=' },
    { id: '>', label: 'after' },
    { id: '>=', label: 'on or after' },
    { id: '<', label: 'before' },
    { id: '<=', label: 'on or before' },
    { id: 'is_null', label: 'is null' },
    { id: 'is_not_null', label: 'is not null' },
  ],
};

// Default to string operators if type not found
const getOperatorsForType = (type) => {
  return OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.string;
};

function FilterBar({ disabled }) {
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
          return {
            id: metadata.columns[key]?.name,
            name: metadata.columns[key]?.name,
            type: metadata.columns[key]?.dataType,
          };
        })
    : [];

  // Filter row component
  const FilterRow = ({
    filter,
    index,
    editable = false,
    onSave,
    onRemove,
    onCancel,
    filterType = 'new',
  }) => {
    const columnType = filter.column
      ? availableColumns.find((col) => col.id === filter.column)?.type || 'string'
      : 'string';

    // Use a ref to track the current input value
    const inputRef = React.useRef(null);
    const [localValue, setLocalValue] = React.useState(filter.value);

    // Update local value when filter value changes externally (not from user input)
    React.useEffect(() => {
      if (filter.value !== localValue && document.activeElement !== inputRef.current) {
        setLocalValue(filter.value);
      }
    }, [filter.value, localValue]);

    // Handle local value change without immediately triggering save
    const handleLocalValueChange = (value) => {
      setLocalValue(value);
    };

    // Save changes when input loses focus
    const handleBlur = () => {
      if (filter.value !== localValue) {
        onSave({
          ...filter,
          value: columnType === 'number' && localValue !== '' ? parseFloat(localValue) : localValue,
        });
      }
    };

    const operators = getOperatorsForType(columnType);
    const requiresValue = !['is_null', 'is_not_null'].includes(filter.operator);

    return (
      <div className="relative bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 pt-7 mb-2">
        <div className="flex-grow flex space-x-2">
          {editable ? (
            <div className="w-full flex flex-col space-y-2">
              {/* Field selector at the top */}
              <FieldSearchSelect
                filter={filter}
                index={index}
                availableColumns={availableColumns}
                handleFilterChange={handleFilterChange}
              />

              {/* Operator and value on the same row */}
              <div className="flex space-x-2">
                <select
                  className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 h-10 min-w-[120px] text-sm text-gray-800 dark:text-gray-200"
                  value={filter.operator}
                  onChange={(e) =>
                    handleFilterChange({ ...filter, operator: e.target.value }, index)
                  }
                  disabled={!filter.column}
                >
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.label}
                    </option>
                  ))}
                </select>

                {requiresValue ? (
                  <div className="flex-grow">
                    {columnType === 'boolean' ? (
                      <select
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 h-10 w-full text-sm text-gray-800 dark:text-gray-200"
                        value={String(filter.value)}
                        onChange={(e) =>
                          handleFilterChange({ ...filter, value: e.target.value === 'true' }, index)
                        }
                      >
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    ) : columnType === 'date' || columnType === 'timestamp' ? (
                      <input
                        ref={inputRef}
                        type="date"
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 h-10 w-full text-sm text-gray-800 dark:text-gray-200"
                        value={localValue || ''}
                        onChange={(e) => handleLocalValueChange(e.target.value)}
                        onBlur={handleBlur}
                      />
                    ) : (
                      <input
                        ref={inputRef}
                        type={columnType === 'number' ? 'number' : 'text'}
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 h-10 w-full text-sm text-gray-800 dark:text-gray-200"
                        value={localValue || ''}
                        placeholder="Enter value"
                        onChange={(e) => handleLocalValueChange(e.target.value)}
                        onBlur={handleBlur}
                      />
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 h-10 flex-grow text-sm text-gray-400 dark:text-gray-500 flex items-center">
                    No value needed
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col space-y-2">
              {/* Field name at the top */}
              <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 h-10 w-full flex items-center">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {availableColumns.find((col) => col.id === filter.column)?.name || filter.column}
                </span>
              </div>

              {/* Operator and value on the same row */}
              <div className="flex space-x-2">
                <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 h-10 min-w-[120px] flex items-center">
                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {getOperatorsForType(
                      availableColumns.find((col) => col.id === filter.column)?.type || 'string'
                    ).find((op) => op.id === filter.operator)?.label || filter.operator}
                  </span>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 h-10 flex-grow flex items-center">
                  <span className="text-sm font-mono text-gray-800 dark:text-gray-200">
                    {['is_null', 'is_not_null'].includes(filter.operator)
                      ? '-'
                      : typeof filter.value === 'object'
                        ? JSON.stringify(filter.value)
                        : String(filter.value)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Simple removal button */}
        <button
          type="button"
          className="absolute z-10 top-1 right-1 cursor-pointer text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
          onMouseDown={(e) => {
            // Use mouseDown which happens before blur events
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={(e) => {
            // Simple approach
            e.stopPropagation();
            e.preventDefault();

            if (filterType === 'new' || index === -1) {
              // Cancel new filter creation
              onCancel && onCancel();
            } else {
              // Remove existing filter
              onRemove(index);
            }
          }}
          aria-label="Remove filter"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 pointer-events-none"
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
    );
  };

  // Handler for removing a filter
  const removeFilter = (index) => {
    const filtersCopy = [...filters];
    filtersCopy.splice(index, 1);

    actions.updateCurrentExploration({
      filters: filtersCopy,
      offset: 0, // Reset pagination when removing a filter
    });
  };

  // Handler for updating a filter
  const updateFilter = (index, updatedFilter) => {
    const updatedFilters = [...filters];
    updatedFilters[index] = updatedFilter;

    actions.updateCurrentExploration({
      filters: updatedFilters,
      offset: 0, // Reset pagination when updating a filter
    });
  };

  // Helper to determine if a value is required
  const isValueRequired = (operator) => {
    return !['is_null', 'is_not_null'].includes(operator);
  };

  // Handler for auto-saving a filter
  const handleFilterChange = (filter, index) => {
    // Determine if this filter requires a value
    const valueRequired = isValueRequired(filter.operator);
    const columnType = filter.column
      ? availableColumns.find((col) => col.id === filter.column)?.type || 'string'
      : 'string';

    // If this is a new filter being added
    if (index === -1) {
      // Only commit to filters array if all required fields are present
      if (filter.column && (!valueRequired || filter.value !== '' || columnType === 'boolean')) {
        const updatedFilters = [...filters, filter];
        actions.updateCurrentExploration({
          filters: updatedFilters,
          offset: 0, // Reset pagination when adding a filter
        });
        setShowNewFilter(false);
        setNewFilter({ column: '', operator: '=', value: '' });
      } else {
        // Just update the new filter state but don't save yet
        setNewFilter(filter);
      }
    } else {
      // Always update the existing filter to enable continuous editing
      updateFilter(index, filter);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
            Filters
          </label>
          <div className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
            {filters.length}
          </div>
        </div>

        <button
          type="button"
          className={`inline-flex items-center px-3 h-10 border text-sm font-medium rounded-md shadow-sm transition-colors
            border-blue-500 dark:border-blue-600 
            text-blue-700 dark:text-blue-400 
            bg-blue-50 dark:bg-blue-900/30 
            ${
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-100 dark:hover:bg-blue-800/50'
            }`}
          onClick={() => !disabled && setShowNewFilter(true)}
          disabled={disabled || showNewFilter}
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
            filterType="new"
            onSave={(updated) => handleFilterChange(updated, -1)}
            onCancel={() => {
              setShowNewFilter(false);
              setNewFilter({ column: '', operator: '=', value: '' });
            }}
          />
        )}

        {filters.length > 0 &&
          filters.map((filter, index) => (
            <FilterRow
              key={`saved-filter-${index}`}
              filter={filter}
              index={index}
              editable={true}
              onSave={(updated) => handleFilterChange(updated, index)}
              onRemove={removeFilter}
              filterType="saved"
            />
          ))}
      </div>
    </div>
  );
}

export default FilterBar;
