// components/Layout/SidePanel.js
import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import ExplorationControls from '../Exploration/ExplorationControls';
import api from '../../utils/apiClient';

function SidePanel({ toggleDarkMode, darkMode }) {
  const { state, actions } = useAppState();
  const { currentConnection, metadata, explorations, currentExploration } = state;
  const [queryResults, setQueryResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
        <span className="text-primary dark:text-indigo-400 font-bold text-2xl mr-2">⚡</span>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Facet</h1>
      </div>
      {!currentConnection ? (
        <div className="p-4 text-center">
          <p className="text-gray-500 dark:text-gray-400">Please select a data source first</p>
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
        <div className="flex-grow mr-2">
          <select
            className="text-xs w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-dark-bg text-gray-700 dark:text-gray-300"
            value={currentConnection ? currentConnection.id : ''}
            onChange={(e) => {
              const selectedId = e.target.value;
              if (selectedId) {
                const selected = state.connections.find((conn) => conn.id === selectedId);
                if (selected) actions.setCurrentConnection(selected);
              } else {
                actions.setCurrentConnection(null);
              }
            }}
          >
            <option value="">Select connection</option>
            {state.connections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name} ({conn.type})
              </option>
            ))}
          </select>
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
