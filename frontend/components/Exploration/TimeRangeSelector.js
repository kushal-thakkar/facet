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

const COMPARISON_OPTIONS = [
  { id: 'none', label: 'No comparison' },
  { id: 'previous_period', label: 'Previous period' },
  { id: 'previous_year', label: 'Previous year' },
  { id: 'custom', label: 'Custom comparison' },
];

function TimeRangeSelector({ disabled }) {
  const { state, actions } = useAppState();
  const { currentExploration } = state;

  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);

  // Only using presets now
  const [tempTimeSettings, setTempTimeSettings] = useState({});

  // Get current time range
  const timeRange = currentExploration.timeRange;

  // Get current comparison or default
  const comparison = currentExploration.comparison || {
    enabled: false,
    range: 'none',
  };

  // Get visualization type and check if it's disabled for comparison
  // TODO: Disable for all viz types for now
  const isComparisonDisabled = true;

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
  const timeRangeDialogRef = useRef(null);
  const comparisonDialogRef = useRef(null);

  // Handle outside clicks and escape key for time range dialog
  useOutsideClickAndEscape(timeRangeDialogRef, () => {
    if (showTimeDialog) setShowTimeDialog(false);
  });

  // Handle outside clicks and escape key for comparison dialog
  useOutsideClickAndEscape(comparisonDialogRef, () => {
    if (showComparisonDialog) setShowComparisonDialog(false);
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
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Comparison
          </label>
          {/* Empty space to match Order By's button layout */}
          <div className="ml-1 w-10 h-6"></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <button
            type="button"
            className={`inline-flex justify-between items-center w-full h-10 px-3 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            } focus:outline-none shadow-sm`}
            onClick={() => !disabled && setShowTimeDialog(true)}
            disabled={disabled}
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

        <div className="relative">
          <button
            type="button"
            className={`inline-flex justify-between items-center w-full h-10 px-3 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none shadow-sm ${
              disabled || isComparisonDisabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={() => !disabled && !isComparisonDisabled && setShowComparisonDialog(true)}
            disabled={disabled || isComparisonDisabled}
          >
            <span>{comparisonLabel}</span>
            <span className="ml-1">▾</span>
          </button>

          {/* Comparison Dialog */}
          {showComparisonDialog && (
            <div
              ref={comparisonDialogRef}
              className="comparison-dialog absolute z-10 mt-1 w-56 bg-white dark:bg-dark-card shadow-lg rounded-lg border border-gray-200 dark:border-gray-700"
            >
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
