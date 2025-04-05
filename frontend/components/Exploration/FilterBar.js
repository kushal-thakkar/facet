// components/Exploration/FilterBar.js
import React, { useState } from 'react';
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
    { id: 'is_not_null', label: 'is not empty' }
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
    { id: 'is_not_null', label: 'is not empty' }
  ],
  boolean: [
    { id: '=', label: 'equals' },
    { id: 'is_null', label: 'is empty' },
    { id: 'is_not_null', label: 'is not empty' }
  ],
  date: [
    { id: '=', label: 'equals' },
    { id: '!=', label: 'not equals' },
    { id: '>', label: 'after' },
    { id: '>=', label: 'on or after' },
    { id: '<', label: 'before' },
    { id: '<=', label: 'on or before' },
    { id: 'is_null', label: 'is empty' },
    { id: 'is_not_null', label: 'is not empty' }
  ],
  timestamp: [
    { id: '=', label: 'equals' },
    { id: '!=', label: 'not equals' },
    { id: '>', label: 'after' },
    { id: '>=', label: 'on or after' },
    { id: '<', label: 'before' },
    { id: '<=', label: 'on or before' },
    { id: 'is_null', label: 'is empty' },
    { id: 'is_not_null', label: 'is not empty' }
  ]
};

// Default to string operators if type not found
const getOperatorsForType = (type) => {
  return OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.string;
};

function FilterBar() {
  const { state, actions } = useAppState();
  const { currentExploration, metadata } = state;
  
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [newFilter, setNewFilter] = useState({
    column: '',
    operator: '=',
    value: ''
  });
  
  // Get current filters or default to empty array
  const filters = currentExploration.filters || [];
  
  // Get available columns for current table
  const availableColumns = currentExploration.source?.table 
    ? Object.keys(metadata.columns || {})
        .filter(key => key.startsWith(`${currentExploration.source.table}.`))
        .map(key => {
          const [table, column] = key.split('.');
          return {
            id: column,
            name: metadata.columns[key]?.displayName || column,
            type: metadata.columns[key]?.dataType || 'string'
          };
        })
    : [];
  
  // Handler for removing a filter
  const removeFilter = (index) => {
    const updatedFilters = [...filters];
    updatedFilters.splice(index, 1);
    
    actions.updateCurrentExploration({
      filters: updatedFilters
    });
  };
  
  // Handler for adding a new filter
  const addFilter = () => {
    if (!newFilter.column) return;
    
    // Get column type for validation
    const columnMeta = availableColumns.find(col => col.id === newFilter.column);
    const columnType = columnMeta?.type || 'string';
    
    // Skip value validation for null operators
    const requiresValue = !['is_null', 'is_not_null'].includes(newFilter.operator);
    
    // Validate value based on type
    if (requiresValue && !newFilter.value && columnType !== 'boolean') {
      alert('Please enter a value for the filter');
      return;
    }
    
    // Create the filter object
    const filter = {
      column: newFilter.column,
      operator: newFilter.operator,
      value: requiresValue ? newFilter.value : null
    };
    
    // Add to filters
    actions.updateCurrentExploration({
      filters: [...filters, filter]
    });
    
    // Reset new filter form
    setNewFilter({
      column: '',
      operator: '=',
      value: ''
    });
    
    // Close dialog
    setShowFilterDialog(false);
  };
  
  // Get the column's data type
  const getSelectedColumnType = () => {
    if (!newFilter.column) return 'string';
    const column = availableColumns.find(col => col.id === newFilter.column);
    return column?.type || 'string';
  };
  
  // Get operators for selected column type
  const availableOperators = getOperatorsForType(getSelectedColumnType());
  
  // Format filter for display
  const formatFilterText = (filter) => {
    const column = availableColumns.find(col => col.id === filter.column);
    const columnName = column?.name || filter.column;
    
    const operator = getOperatorsForType(column?.type || 'string')
      .find(op => op.id === filter.operator)?.label || filter.operator;
    
    // Format value based on type and operator
    let valueDisplay = '';
    if (['is_null', 'is_not_null'].includes(filter.operator)) {
      valueDisplay = '';
    } else if (filter.operator === 'in' || filter.operator === 'not_in') {
      if (Array.isArray(filter.value)) {
        valueDisplay = `[${filter.value.join(', ')}]`;
      } else {
        valueDisplay = String(filter.value);
      }
    } else {
      valueDisplay = String(filter.value);
    }
    
    return `${columnName} ${operator} ${valueDisplay}`.trim();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">Filters</label>
        
        <button
          type="button"
          className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
          onClick={() => setShowFilterDialog(true)}
        >
          + Add Filter
        </button>
      </div>
      
      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {filters.length > 0 ? (
          filters.map((filter, index) => (
            <div 
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-sm"
            >
              <span>{formatFilterText(filter)}</span>
              <button
                type="button"
                className="ml-1 text-blue-600 hover:text-blue-800"
                onClick={() => removeFilter(index)}
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500 italic">No filters applied</div>
        )}
      </div>
      
      {/* Filter Dialog */}
      {showFilterDialog && (
        <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="filter-dialog-title">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            {/* Dialog */}
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="filter-dialog-title">
                  Add Filter
                </h3>
                
                <div className="mt-4 space-y-4">
                  {/* Column Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Field
                    </label>
                    <select
                      value={newFilter.column}
                      onChange={(e) => setNewFilter({
                        ...newFilter,
                        column: e.target.value
                      })}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="">Select a field</option>
                      {availableColumns.map(column => (
                        <option key={column.id} value={column.id}>
                          {column.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Operator Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Operator
                    </label>
                    <select
                      value={newFilter.operator}
                      onChange={(e) => setNewFilter({
                        ...newFilter,
                        operator: e.target.value
                      })}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      disabled={!newFilter.column}
                    >
                      {availableOperators.map(operator => (
                        <option key={operator.id} value={operator.id}>
                          {operator.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Value Input */}
                  {!['is_null', 'is_not_null'].includes(newFilter.operator) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Value
                      </label>
                      
                      {getSelectedColumnType() === 'boolean' ? (
                        <select
                          value={newFilter.value}
                          onChange={(e) => setNewFilter({
                            ...newFilter,
                            value: e.target.value === 'true'
                          })}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : getSelectedColumnType() === 'date' || getSelectedColumnType() === 'timestamp' ? (
                        <input
                          type="date"
                          value={newFilter.value}
                          onChange={(e) => setNewFilter({
                            ...newFilter,
                            value: e.target.value
                          })}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        />
                      ) : newFilter.operator === 'in' || newFilter.operator === 'not_in' ? (
                        <textarea
                          value={newFilter.value}
                          onChange={(e) => setNewFilter({
                            ...newFilter,
                            value: e.target.value
                          })}
                          placeholder="Enter comma-separated values"
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          rows={3}
                        />
                      ) : (
                        <input
                          type={getSelectedColumnType() === 'number' ? 'number' : 'text'}
                          value={newFilter.value}
                          onChange={(e) => setNewFilter({
                            ...newFilter,
                            value: getSelectedColumnType() === 'number' 
                              ? parseFloat(e.target.value) 
                              : e.target.value
                          })}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        />
                      )}
                    </div>
                  )}
                  
                  {/* Dialog Actions */}
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                      onClick={addFilter}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                      onClick={() => setShowFilterDialog(false)}
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

export default FilterBar;