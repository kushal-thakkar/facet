// components/Exploration/ExplorationControls.js
import React from 'react';
import TimeRangeSelector from './TimeRangeSelector';
import FilterBar from './FilterBar';
import GroupBySelector from './GroupBySelector';
import MetricSelector from './MetricSelector';
import { useAppState } from '../../context/AppStateContext';

function ExplorationControls({ onRunQuery, isLoading }) {
  const { state } = useAppState();
  const { currentExploration } = state;

  return (
    <div className="mb-4 bg-white p-4 border border-gray-200 rounded-md space-y-4">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800">
          {currentExploration.name || 'New Exploration'}
        </h2>

        <div className="flex space-x-2">
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
