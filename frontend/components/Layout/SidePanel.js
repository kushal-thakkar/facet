// components/Layout/SidePanel.js
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import ExplorationControls from '../Exploration/ExplorationControls';
import api from '../../utils/apiClient';

function SidePanel({ toggleDarkMode, darkMode }) {
  const { state, actions } = useAppState();
  const { currentConnection, metadata, explorations, currentExploration, connections } = state;
  const [queryResults, setQueryResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
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
      setError('Failed to fetch connections. Please try again later.');
    } finally {
      setConnectionLoading(false);
    }
  };

  // Fetch metadata for a connection
  const fetchMetadata = async (connectionId) => {
    setLoadingMetadata(true);
    setError(null);
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
      setError(`Error loading metadata: ${error.message}`);
      actions.updateMetadata({ tables: {} });
    } finally {
      setLoadingMetadata(false);
    }
  };

  const handleRunQuery = async () => {
    if (!currentConnection || !currentExploration.source) {
      setError('Please select a connection and table first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Make sure the query has the connectionId in the source
      const queryWithConnectionId = {
        ...currentExploration,
        source: {
          ...currentExploration.source,
          connectionId: currentConnection.id,
        },
      };

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
      setError(err.message || 'An error occurred while executing the query');
      actions.updateQueryResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Facet logo and name */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
        <span className="text-primary dark:text-indigo-400 font-bold text-2xl mr-2">🧩</span>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Facet</h1>
      </div>
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

          {/* Error message if any */}
          {error && (
            <div className="mx-4 mb-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 text-sm rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
        </>
      )}

      {/* Bottom controls panel */}
      <div className="mt-auto pt-3 px-3 pb-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
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
                  actions.setCurrentConnection(selected);
                  console.log('Connection selected:', selected);
                  // Force a fetch of metadata when connection changes
                  if (selected.id) {
                    fetchMetadata(selected.id);
                  }
                }
              } else {
                actions.setCurrentConnection(null);
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
