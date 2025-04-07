import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import ExplorationControls from '../Exploration/ExplorationControls';
import api from '../../utils/apiClient';

function SidePanel({ toggleDarkMode, darkMode }) {
  const { state, actions } = useAppState();
  const { currentConnection, metadata, explorations, currentExploration, connections } = state;
  const [queryResults, setQueryResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Fetch connections when component mounts
  useEffect(() => {
    if (connections.length === 0) {
      fetchConnections();
    }
  }, []);

  // Fetch metadata when connection changes
  useEffect(() => {
    if (currentConnection) {
      console.log('Current connection changed:', currentConnection);
      fetchMetadata(currentConnection.id);
    }
  }, [currentConnection?.id]);

  // Fetch connections from the API
  const fetchConnections = async () => {
    setConnectionLoading(true);
    try {
      const fetchedConnections = await api.get('/api/v1/connections');
      actions.setConnections(fetchedConnections);
      console.log('Fetched connections:', fetchedConnections);

      // Auto-select first connection if none is selected
      if (fetchedConnections.length > 0 && !currentConnection) {
        actions.setCurrentConnection(fetchedConnections[0]);
        // Fetch metadata for the auto-selected connection
        fetchMetadata(fetchedConnections[0].id);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
      // Show error in results panel instead of error box
      const errorResult = {
        error: 'Failed to fetch connections. Please try again later.',
        isApiError: true,
      };
      setQueryResults(errorResult);
      actions.updateQueryResults(errorResult);
    } finally {
      setConnectionLoading(false);
    }
  };

  // Fetch metadata for a connection
  const fetchMetadata = async (connectionId) => {
    setLoadingMetadata(true);
    try {
      console.log(`Fetching metadata for connection ID: ${connectionId}`);

      // Fetch tables
      const tables = await api.get(`/api/v1/metadata/connections/${connectionId}/tables`);
      console.log('Fetched tables:', tables);

      if (!tables) {
        throw new Error('Failed to fetch tables');
      }

      // Convert array to object with table name as key
      const tablesObject = {};
      tables.forEach((table) => {
        tablesObject[table.name] = table;
      });

      // Update metadata in app state
      actions.updateMetadata({
        tables: tablesObject,
      });
    } catch (error) {
      console.error('Error fetching metadata:', error);
      // Show error in results panel instead of error box
      const errorResult = {
        error: `Error loading metadata: ${error.message}`,
        isApiError: true,
      };
      setQueryResults(errorResult);
      actions.updateQueryResults(errorResult);
      actions.updateMetadata({ tables: {} });
    } finally {
      setLoadingMetadata(false);
    }
  };

  // Validate query configuration based on visualization type and other parameters
  const validateQuery = (exploration) => {
    if (!currentConnection || !exploration.source) {
      console.log('Validation error: No connection or source table selected');
      return 'Please select a connection and table first';
    }

    // Validation for pie chart - must have exactly 1 field selected
    if (exploration.visualization?.type === 'pie') {
      const selectedFields = exploration.selectedFields || [];
      console.log(`Pie chart validation: ${selectedFields.length} fields selected`);
      if (selectedFields.length !== 1) {
        return 'Pie chart requires exactly 1 field to be selected.';
      }
    }

    // Validation for bar chart - must have exactly 1 field selected
    if (exploration.visualization?.type === 'bar') {
      const selectedFields = exploration.selectedFields || [];
      console.log(`Bar chart validation: ${selectedFields.length} fields selected`);
      if (selectedFields.length !== 1) {
        return 'Bar chart requires exactly 1 field to be selected.';
      }
    }

    // Future validations can be added here based on other visualization types

    console.log('Query validation passed');
    return null; // No errors
  };

  const handleRunQuery = async () => {
    // Run validations
    const validationError = validateQuery(currentExploration);
    if (validationError) {
      // Create a validation error object that will be displayed in the results area
      const validationErrorResult = {
        error: validationError,
        isValidationError: true,
      };

      // Show validation error only in the results panel, not in the side panel
      setQueryResults(validationErrorResult);
      actions.updateQueryResults(validationErrorResult);
      return;
    }

    setIsLoading(true);

    try {
      // Use the sort field directly - it's already in the correct format
      let sort = currentExploration.sort || [];

      // Process the selected fields - use them directly if available
      const selectedFields = currentExploration.selectedFields || [];

      // Make sure to include all necessary fields in the query
      let queryWithConnectionId = {
        ...currentExploration,
        source: {
          ...currentExploration.source,
          connectionId: currentConnection.id,
        },
        sort: sort, // Apply the processed sort order
        selectedFields: selectedFields, // Include selected fields
        limit:
          currentExploration.limit === 'none'
            ? null
            : currentExploration.limit
              ? parseInt(currentExploration.limit, 10)
              : 100,
      };

      // Special handling for preview visualization type
      if (currentExploration.visualization?.type === 'preview') {
        // For preview mode, make sure we don't use aggregation or group by
        queryWithConnectionId = {
          ...queryWithConnectionId,
          agg: [], // Clear any aggregation
          groupBy: [], // Clear any grouping
        };
      }

      // Debug the query object
      console.log('Executing query:', queryWithConnectionId);

      // Execute query using API client
      console.log('Executing query for connection:', currentConnection.id);
      const data = await api.post('/api/v1/query/execute', {
        connectionId: currentConnection.id,
        query: queryWithConnectionId,
      });
      setQueryResults(data);

      // Send results to parent component through context
      actions.updateQueryResults(data);
    } catch (err) {
      console.error('Error executing query:', err);

      // Show API errors only in the results panel
      const errorResult = {
        error: err.message || 'An error occurred while executing the query',
        isApiError: true,
      };

      setQueryResults(errorResult);
      actions.updateQueryResults(errorResult);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Facet logo and name - fixed */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
        <span className="text-primary dark:text-indigo-400 font-bold text-2xl mr-2">🧩</span>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Facet</h1>
      </div>

      {/* Middle scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {!currentConnection ? (
          <div className="p-4 text-center">
            <p className="text-gray-500 dark:text-gray-400">Please select a connection first</p>
          </div>
        ) : loadingMetadata ? (
          <div className="p-4 flex flex-col items-center justify-center">
            <div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full mb-3"></div>
            <p className="text-gray-500 dark:text-gray-400">
              Loading tables from {currentConnection.name}...
            </p>
          </div>
        ) : (
          <>
            {/* Exploration Controls */}
            <ExplorationControls onRunQuery={handleRunQuery} isLoading={isLoading} />
          </>
        )}
      </div>

      {/* Bottom controls panel - fixed */}
      <div className="pt-3 px-3 pb-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
        {/* Connection selector */}
        <div className="flex-grow mr-2 relative">
          <select
            className="text-xs w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-dark-bg text-gray-700 dark:text-gray-300"
            value={currentConnection ? currentConnection.id : ''}
            onChange={(e) => {
              const selectedId = e.target.value;
              if (selectedId) {
                const selected = state.connections.find((conn) => conn.id === selectedId);
                if (selected) {
                  // Check if connection actually changed
                  const connectionChanged =
                    !currentConnection || currentConnection.id !== selected.id;

                  // Clear current table and results when connection changes
                  if (connectionChanged) {
                    // Clear exploration data
                    actions.updateCurrentExploration({
                      source: { connectionId: selected.id, table: null },
                      filters: [],
                      groupBy: [],
                      agg: [],
                      selectedFields: [],
                    });

                    // Clear results
                    actions.updateQueryResults(null);
                  }

                  // Set the connection
                  actions.setCurrentConnection(selected);
                  console.log('Connection selected:', selected);

                  // Force a fetch of metadata when connection changes
                  if (selected.id) {
                    fetchMetadata(selected.id);
                  }
                }
              } else {
                actions.setCurrentConnection(null);
                // Clear results when disconnecting
                actions.updateQueryResults(null);
              }
            }}
            disabled={connectionLoading}
          >
            <option value="">
              {connectionLoading
                ? 'Loading connections...'
                : connections.length === 0
                  ? 'No connections found'
                  : 'Select connection'}
            </option>
            {state.connections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name} ({conn.type})
              </option>
            ))}
          </select>
          {connectionLoading && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        {/* Theme toggle button */}
        <button
          onClick={toggleDarkMode}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          aria-label="Toggle dark mode"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? (
            <svg
              className="h-4 w-4 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              ></path>
            </svg>
          ) : (
            <svg
              className="h-4 w-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              ></path>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default SidePanel;
