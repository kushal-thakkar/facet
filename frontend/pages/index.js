// pages/index.js
import React, { useState } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import ExplorationControls from '../components/Exploration/ExplorationControls';
import ResultsArea from '../components/Exploration/ResultsArea';
import { useAppState } from '../context/AppStateContext';
import api from '../utils/apiClient';

export default function Home() {
  const { state } = useAppState();
  const { currentConnection, currentExploration } = state;
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
    } catch (err) {
      console.error('Error executing query:', err);
      setError(err.message || 'An error occurred while executing the query');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {!currentConnection ? (
          <div className="flex-1 flex items-center justify-center flex-col p-8 text-center">
            <div className="text-4xl text-blue-500 mb-4">📊</div>
            <h2 className="text-2xl font-medium text-gray-800 mb-2">
              Select a Database Connection
            </h2>
            <p className="text-gray-600 max-w-lg">
              Use the database connection dropdown at the top of the page to connect to your
              database and start exploring your data.
            </p>
          </div>
        ) : (
          <>
            {/* Exploration Controls */}
            <ExplorationControls onRunQuery={handleRunQuery} isLoading={isLoading} />

            {/* Error message if any */}
            {error && (
              <div className="bg-red-50 text-red-700 p-3 mb-4 rounded-md">
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Results Area */}
            <div className="flex-1 overflow-hidden">
              <ResultsArea results={queryResults} isLoading={isLoading} />
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
