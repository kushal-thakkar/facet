// components/Exploration/TimeRangeSelector.js
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';

const TIME_RANGE_PRESETS = [
  { id: 'last_15_min', label: 'Last 15 minutes' },
  { id: 'last_1_hour', label: 'Last hour' },
  { id: 'last_24_hours', label: 'Last 24 hours' },
  { id: 'last_7_days', label: 'Last 7 days' },
  { id: 'last_30_days', label: 'Last 30 days' },
  { id: 'last_90_days', label: 'Last 90 days' },
  { id: 'this_quarter', label: 'This quarter' },
  { id: 'this_year', label: 'This year' },
];

const COMPARISON_OPTIONS = [
  { id: 'none', label: 'No comparison' },
  { id: 'previous_period', label: 'Previous period' },
  { id: 'previous_year', label: 'Previous year' },
  { id: 'custom', label: 'Custom comparison' },
];

function TimeRangeSelector() {
  const { state, actions } = useAppState();
  const { currentExploration } = state;

  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);

  // Only using presets now
  const [tempTimeSettings, setTempTimeSettings] = useState({});

  // Get current time range or default
  const timeRange = currentExploration.timeRange || {
    column: null,
    range: 'last_7_days',
  };

  // Get current comparison or default
  const comparison = currentExploration.comparison || {
    enabled: false,
    range: 'none',
  };

  // Find the labels for current selections
  const timeRangeLabel =
    TIME_RANGE_PRESETS.find((preset) => preset.id === timeRange.range)?.label ||
    'Select time range';

  const comparisonLabel =
    COMPARISON_OPTIONS.find((option) => option.id === comparison.range)?.label || 'No comparison';

  // We're only using presets now
  const applyTimeRange = () => {
    setShowTimeDialog(false);
  };

  // Handler for applying comparison
  const applyComparison = (comparisonType) => {
    actions.updateCurrentExploration({
      comparison: {
        enabled: comparisonType !== 'none',
        range: comparisonType,
      },
    });

    setShowComparisonDialog(false);
  };

  // Close dropdowns when clicking outside or pressing Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (event.target.closest('.time-range-dialog') === null) {
        setShowTimeDialog(false);
      }
      if (event.target.closest('.comparison-dialog') === null) {
        setShowComparisonDialog(false);
      }
    }

    function handleEscapeKey(event) {
      if (event.key === 'Escape') {
        setShowTimeDialog(false);
        setShowComparisonDialog(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Time Range
      </label>
      <div className="flex space-x-2">
        <div className="relative">
          <button
            type="button"
            className="inline-flex justify-between items-center w-40 px-3 py-1.5 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={() => setShowTimeDialog(true)}
          >
            <span>{timeRangeLabel}</span>
            <span className="ml-1">▾</span>
          </button>

          {/* Time Range Dialog */}
          {showTimeDialog && (
            <div className="time-range-dialog absolute z-10 mt-1 w-80 bg-white dark:bg-dark-card shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Select Time Range
                </h3>
                {/* Time Range Presets */}
                <div className="mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_RANGE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className="px-3 py-1 text-xs text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        onClick={() => {
                          actions.updateCurrentExploration({
                            timeRange: {
                              ...timeRange,
                              range: preset.id,
                              column: timeRange.column || 'timestamp',
                            },
                          });
                          setShowTimeDialog(false);
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
                    onClick={() => setShowTimeDialog(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-indigo-600 dark:hover:bg-indigo-500 rounded-md shadow-sm"
                    onClick={applyTimeRange}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            className="inline-flex justify-between items-center w-40 px-3 py-1.5 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={() => setShowComparisonDialog(true)}
          >
            <span>{comparisonLabel}</span>
            <span className="ml-1">▾</span>
          </button>

          {/* Comparison Dialog */}
          {showComparisonDialog && (
            <div className="comparison-dialog absolute z-10 mt-1 w-56 bg-white dark:bg-dark-card shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Comparison
                </h3>

                <div className="space-y-2">
                  {COMPARISON_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                      onClick={() => applyComparison(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TimeRangeSelector;
