// components/Layout/SidePanel.js
import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import ExplorationControls from '../Exploration/ExplorationControls';
import api from '../../utils/apiClient';

function SidePanel() {
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
      // Execute query using API client
      console.log('Executing query for connection:', currentConnection.id);
      const data = await api.post('/api/v1/query/execute', {
        connectionId: currentConnection.id,
        query: currentExploration,
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
    <div className="h-full overflow-y-auto">
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
    </div>
  );
}

export default SidePanel;
