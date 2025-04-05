// components/Exploration/ExplorationControls.js
import React from 'react';
import TimeRangeSelector from './TimeRangeSelector';
import FilterBar from './FilterBar';
import GroupBySelector from './GroupBySelector';
import MetricSelector from './MetricSelector';
import { useAppState } from '../../context/AppStateContext';

function ExplorationControls({ onRunQuery, isLoading }) {
  const { state, actions } = useAppState();
  const { currentExploration } = state;

  // Handler for saving the current exploration
  const handleSave = () => {
    // Generate a unique ID if this is a new exploration
    const id = currentExploration.id || `exp_${Date.now()}`;
    
    // Prompt for a name if it doesn't have one
    let name = currentExploration.name;
    if (!name) {
      name = prompt('Enter a name for this exploration:');
      if (!name) return; // User cancelled
    }
    
    const savedExploration = {
      ...currentExploration,
      id,
      name,
      lastRun: new Date().toISOString()
    };
    
    // Update the current exploration with ID and name
    actions.setCurrentExploration(savedExploration);
    
    // Add to saved explorations
    const updatedExplorations = [
      ...state.explorations.filter(exp => exp.id !== id),
      savedExploration
    ];
    
    actions.setExplorations(updatedExplorations);
  };

  return (
    <div className="mb-4 bg-white p-4 border border-gray-200 rounded-md space-y-4">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800">
          {currentExploration.name || 'New Exploration'}
        </h2>
        
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={handleSave}
          >
            Save
          </button>
          
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            onClick={onRunQuery}
            disabled={isLoading}
          >
            {isLoading ? 'Running...' : 'Run Query'}
          </button>
        </div>
      </div>
      
      {/* Time Range */}
      <div className="pb-3 border-b border-gray-200">
        <TimeRangeSelector />
      </div>
      
      {/* Filters */}
      <div className="pb-3 border-b border-gray-200">
        <FilterBar />
      </div>
      
      {/* Group By */}
      <div className="pb-3 border-b border-gray-200">
        <GroupBySelector />
      </div>
      
      {/* Metrics */}
      <div>
        <MetricSelector />
      </div>
    </div>
  );
}

export default ExplorationControls;