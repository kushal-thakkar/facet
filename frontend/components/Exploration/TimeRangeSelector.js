import React, { useState, useRef } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { useOutsideClickAndEscape } from '../../utils/hooks';

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

function TimeRangeSelector({ disabled, hasTimestampColumns = true }) {
  // Combine both disabled conditions
  const isDisabled = disabled || !hasTimestampColumns;
  const { state, actions } = useAppState();
  const { currentExploration } = state;

  const [showTimeDialog, setShowTimeDialog] = useState(false);
  // Only using presets now
  const [tempTimeSettings, setTempTimeSettings] = useState({});

  // Get current time range
  const timeRange = currentExploration.timeRange;

  // Find the labels for current selections
  const timeRangeLabel =
    TIME_RANGE_PRESETS.find((preset) => preset.id === timeRange.range)?.label ||
    'Select time range';

  // We're only using presets now
  const applyTimeRange = () => {
    setShowTimeDialog(false);
  };

  // Close dropdowns when clicking outside or pressing Escape key
  const timeRangeDialogRef = useRef(null);

  // Handle outside clicks and escape key for time range dialog
  useOutsideClickAndEscape(timeRangeDialogRef, () => {
    if (showTimeDialog) setShowTimeDialog(false);
  });

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-1.5">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Time Range
          </label>
          {/* Empty space to match Order By's button layout */}
          <div className="ml-1 w-10 h-6"></div>
        </div>

        {/* Comparison section with tooltip covering the whole column */}
        <div className="flex justify-between items-center group relative">
          <label className="block text-sm font-medium text-gray-400 dark:text-gray-500 cursor-default">
            Comparison
          </label>
          {/* Empty space to match Order By's button layout */}
          <div className="ml-1 w-10 h-6"></div>

          {/* Tooltip that covers both label and dropdown */}
          <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 z-10 top-20 left-1/2 transform -translate-x-1/2 w-32 text-center pointer-events-none">
            Coming soon
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <button
            type="button"
            className={`inline-flex justify-between items-center w-full h-10 px-3 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 ${
              isDisabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            } focus:outline-none shadow-sm`}
            onClick={() => !isDisabled && setShowTimeDialog(true)}
            disabled={isDisabled}
          >
            <span>{timeRangeLabel}</span>
            <span className="ml-1">▾</span>
          </button>

          {/* Time Range Dialog */}
          {showTimeDialog && (
            <div
              ref={timeRangeDialogRef}
              className="time-range-dialog absolute z-10 mt-1 w-80 bg-white dark:bg-dark-card shadow-lg rounded-lg border border-gray-200 dark:border-gray-700"
            >
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

        <div className="relative group">
          <button
            type="button"
            className="inline-flex justify-between items-center w-full h-10 px-3 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 opacity-50 cursor-not-allowed focus:outline-none shadow-sm"
            disabled={true}
          >
            <span>No comparison</span>
            <span className="ml-1">▾</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TimeRangeSelector;
