// components/Exploration/TimeRangeSelector.js
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';

const TIME_RANGE_PRESETS = [
  { id: 'last_15_min', label: 'Last 15 minutes' },
  { id: 'last_1_hour', label: 'Last hour' },
  { id: 'last_24_hours', label: 'Last 24 hours' },
  { id: 'last_7_days', label: 'Last 7 days' },
  { id: 'last_30_days', label: 'Last 30 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'this_quarter', label: 'This quarter' },
  { id: 'this_year', label: 'This year' },
  { id: 'custom', label: 'Custom range' },
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

  const [tempTimeSettings, setTempTimeSettings] = useState({
    type: 'relative',
    relative: {
      value: 7,
      unit: 'days',
      direction: 'last',
    },
    absolute: {
      from: new Date().toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0],
    },
  });

  // Get current time range or default
  const timeRange = currentExploration.timeRange || {
    column: null,
    range: 'last_7_days',
  };

  // Get current comparison or default
  const comparison = currentExploration.comparison || {
    enabled: false,
    range: 'previous_period',
  };

  // Find the labels for current selections
  const timeRangeLabel =
    TIME_RANGE_PRESETS.find((preset) => preset.id === timeRange.range)?.label ||
    'Select time range';

  const comparisonLabel =
    COMPARISON_OPTIONS.find((option) => option.id === comparison.range)?.label || 'No comparison';

  // Handler for applying time range
  const applyTimeRange = () => {
    let newRange;

    if (tempTimeSettings.type === 'relative') {
      const { direction, value, unit } = tempTimeSettings.relative;
      newRange = `${direction}_${value}_${unit}`;
    } else {
      newRange = 'custom';
    }

    actions.updateCurrentExploration({
      timeRange: {
        ...timeRange,
        range: newRange,
        column: timeRange.column || 'timestamp', // Default column if not set
        customRange:
          tempTimeSettings.type === 'absolute'
            ? {
                from: tempTimeSettings.absolute.from,
                to: tempTimeSettings.absolute.to,
              }
            : undefined,
      },
    });

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (event.target.closest('.time-range-dialog') === null) {
        setShowTimeDialog(false);
      }
      if (event.target.closest('.comparison-dialog') === null) {
        setShowComparisonDialog(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

                <div className="space-y-4">
                  {/* Radio options for relative vs absolute */}
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="timeType"
                        checked={tempTimeSettings.type === 'relative'}
                        onChange={() =>
                          setTempTimeSettings({
                            ...tempTimeSettings,
                            type: 'relative',
                          })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Relative
                      </span>
                    </label>

                    {tempTimeSettings.type === 'relative' && (
                      <div className="ml-6 flex items-center space-x-2">
                        <select
                          value={tempTimeSettings.relative.direction}
                          onChange={(e) =>
                            setTempTimeSettings({
                              ...tempTimeSettings,
                              relative: {
                                ...tempTimeSettings.relative,
                                direction: e.target.value,
                              },
                            })
                          }
                          className="block w-24 pl-3 pr-10 py-1 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                        >
                          <option value="last">Last</option>
                          <option value="previous">Previous</option>
                          <option value="this">This</option>
                        </select>

                        <input
                          type="number"
                          min="1"
                          value={tempTimeSettings.relative.value}
                          onChange={(e) =>
                            setTempTimeSettings({
                              ...tempTimeSettings,
                              relative: {
                                ...tempTimeSettings.relative,
                                value: parseInt(e.target.value, 10),
                              },
                            })
                          }
                          className="block w-16 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />

                        <select
                          value={tempTimeSettings.relative.unit}
                          onChange={(e) =>
                            setTempTimeSettings({
                              ...tempTimeSettings,
                              relative: {
                                ...tempTimeSettings.relative,
                                unit: e.target.value,
                              },
                            })
                          }
                          className="block w-24 pl-3 pr-10 py-1 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                          <option value="months">Months</option>
                          <option value="years">Years</option>
                        </select>
                      </div>
                    )}

                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="timeType"
                        checked={tempTimeSettings.type === 'absolute'}
                        onChange={() =>
                          setTempTimeSettings({
                            ...tempTimeSettings,
                            type: 'absolute',
                          })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Absolute
                      </span>
                    </label>

                    {tempTimeSettings.type === 'absolute' && (
                      <div className="ml-6 space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-10">
                            From:
                          </span>
                          <input
                            type="date"
                            value={tempTimeSettings.absolute.from}
                            onChange={(e) =>
                              setTempTimeSettings({
                                ...tempTimeSettings,
                                absolute: {
                                  ...tempTimeSettings.absolute,
                                  from: e.target.value,
                                },
                              })
                            }
                            className="block border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-10">To:</span>
                          <input
                            type="date"
                            value={tempTimeSettings.absolute.to}
                            onChange={(e) =>
                              setTempTimeSettings({
                                ...tempTimeSettings,
                                absolute: {
                                  ...tempTimeSettings.absolute,
                                  to: e.target.value,
                                },
                              })
                            }
                            className="block border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Presets */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Presets
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_RANGE_PRESETS.slice(0, 6).map((preset) => (
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
