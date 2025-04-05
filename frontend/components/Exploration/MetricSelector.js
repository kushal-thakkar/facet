// components/Exploration/MetricSelector.js
import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';

// Available aggregation functions
const AGGREGATION_FUNCTIONS = [
  { id: 'count', label: 'Count', applicableTypes: ['*'] },
  { id: 'count_distinct', label: 'Count Distinct', applicableTypes: ['*'] },
  { id: 'sum', label: 'Sum', applicableTypes: ['number', 'integer', 'float', 'double', 'decimal'] },
  { id: 'avg', label: 'Average', applicableTypes: ['number', 'integer', 'float', 'double', 'decimal'] },
  { id: 'min', label: 'Minimum', applicableTypes: ['number', 'integer', 'float', 'double', 'decimal', 'date', 'timestamp'] },
  { id: 'max', label: 'Maximum', applicableTypes: ['number', 'integer', 'float', 'double', 'decimal', 'date', 'timestamp'] }
];

function MetricSelector() {
  const { state, actions } = useAppState();
  const { currentExploration, metadata } = state;
  
  const [showDialog, setShowDialog] = useState(false);
  const [newMetric, setNewMetric] = useState({
    column: '',
    function: 'count',
    alias: ''
  });
  
  // Get current metrics or default to empty array
  const metrics = currentExploration.metrics || [];
  
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
  
  // Get applicable aggregation functions for the selected column
  const getApplicableFunctions = (columnId) => {
    if (!columnId) return AGGREGATION_FUNCTIONS;
    
    const column = availableColumns.find(col => col.id === columnId);
    if (!column) return AGGREGATION_FUNCTIONS;
    
    return AGGREGATION_FUNCTIONS.filter(func => 
      func.applicableTypes.includes('*') || 
      func.applicableTypes.includes(column.type)
    );
  };
  
  // Handler for adding a new metric
  const addMetric = () => {
    // For count(*), column can be empty
    if (newMetric.function !== 'count' && !newMetric.column) {
      alert('Please select a column');
      return;
    }
    
    // Generate alias if not provided
    const alias = newMetric.alias || 
      (newMetric.function === 'count' && !newMetric.column 
        ? 'count' 
        : `${newMetric.function}_${newMetric.column}`);
    
    // Create metric object
    const metric = {
      column: newMetric.column || null,
      function: newMetric.function,
      alias
    };
    
    // Add to metrics
    actions.updateCurrentExploration({
      metrics: [...metrics, metric]
    });
    
    // Reset form
    setNewMetric({
      column: '',
      function: 'count',
      alias: ''
    });
    
    // Close dialog
    setShowDialog(false);
  };
  
  // Handler for removing a metric
  const removeMetric = (index) => {
    const updatedMetrics = [...metrics];
    updatedMetrics.splice(index, 1);
    
    actions.updateCurrentExploration({
      metrics: updatedMetrics
    });
  };
  
  // Format metric for display
  const formatMetric = (metric) => {
    const functionName = AGGREGATION_FUNCTIONS.find(f => f.id === metric.function)?.label || metric.function;
    
    if (metric.function === 'count' && !metric.column) {
      return `${functionName}(*)`;
    }
    
    const columnName = availableColumns.find(col => col.id === metric.column)?.name || metric.column;
    
    return `${functionName}(${columnName})${metric.alias !== `${metric.function}_${metric.column}` ? ` as ${metric.alias}` : ''}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">Metrics</label>
        
        <button
          type="button"
          className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
          onClick={() => setShowDialog(true)}
        >
          + Add Metric
        </button>
      </div>
      
      {/* Metrics Pills */}
      <div className="flex flex-wrap gap-2">
        {metrics.length > 0 ? (
          metrics.map((metric, index) => (
            <div 
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-sm"
            >
              <span>{formatMetric(metric)}</span>
              <button
                type="button"
                className="ml-1 text-purple-600 hover:text-purple-800"
                onClick={() => removeMetric(index)}
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500 italic">No metrics defined</div>
        )}
      </div>
      
      {/* Add Metric Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="metric-dialog-title">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            {/* Dialog */}
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="metric-dialog-title">
                  Add Metric
                </h3>
                
                <div className="mt-4 space-y-4">
                  {/* Aggregation Function */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aggregation Function
                    </label>
                    <select
                      value={newMetric.function}
                      onChange={(e) => setNewMetric({
                        ...newMetric,
                        function: e.target.value
                      })}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      {getApplicableFunctions(newMetric.column).map(func => (
                        <option key={func.id} value={func.id}>
                          {func.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Column Select (not required for count) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Column {newMetric.function === 'count' ? '(optional)' : ''}
                    </label>
                    <select
                      value={newMetric.column}
                      onChange={(e) => setNewMetric({
                        ...newMetric,
                        column: e.target.value
                      })}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="">
                        {newMetric.function === 'count' ? '(count all rows)' : 'Select a column'}
                      </option>
                      {availableColumns.map(column => (
                        <option 
                          key={column.id} 
                          value={column.id}
                          disabled={
                            newMetric.function !== 'count' && 
                            newMetric.function !== 'count_distinct' &&
                            !AGGREGATION_FUNCTIONS.find(f => f.id === newMetric.function)
                              .applicableTypes.includes(column.type)
                          }
                        >
                          {column.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Alias */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alias (optional)
                    </label>
                    <input
                      type="text"
                      value={newMetric.alias}
                      onChange={(e) => setNewMetric({
                        ...newMetric,
                        alias: e.target.value
                      })}
                      placeholder={
                        newMetric.function === 'count' && !newMetric.column 
                          ? 'count' 
                          : newMetric.column 
                            ? `${newMetric.function}_${newMetric.column}`
                            : ''
                      }
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    />
                  </div>
                  
                  {/* Dialog Actions */}
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                      onClick={addMetric}
                      disabled={newMetric.function !== 'count' && !newMetric.column}
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

export default MetricSelector;