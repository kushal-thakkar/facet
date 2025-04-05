// pages/index.js
import React, { useState, useEffect } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import ExplorationControls from '../components/Exploration/ExplorationControls';
import ResultsArea from '../components/Exploration/ResultsArea';
import ConnectionForm from '../components/Connection/ConnectionForm';
import { useAppState } from '../context/AppStateContext';
import api from '../utils/apiClient';

export default function Home() {
  const { state } = useAppState();
  const { connections, currentConnection, currentExploration } = state;
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [queryResults, setQueryResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Show connection form if no connections exist
  useEffect(() => {
    if (connections.length === 0) {
      setShowConnectionForm(true);
    }
  }, [connections]);

  const handleRunQuery = async () => {
    if (!currentConnection || !currentExploration.source) {
      setError('Please select a connection and table first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Execute query using API client
      console.log("Executing query for connection:", currentConnection.id);
      const data = await api.post('/api/v1/query/execute', {
        connectionId: currentConnection.id,
        query: currentExploration
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
      {showConnectionForm ? (
        <div className="max-w-2xl mx-auto py-8">
          <h2 className="text-xl font-medium text-gray-900 mb-6">
            Create Your First Connection
          </h2>
          <ConnectionForm 
            onSave={() => setShowConnectionForm(false)} 
            onCancel={() => {
              if (connections.length > 0) {
                setShowConnectionForm(false);
              }
            }}
          />
        </div>
      ) : (
        <div className="h-full flex flex-col">
          {/* Exploration Controls */}
          <ExplorationControls 
            onRunQuery={handleRunQuery} 
            isLoading={isLoading} 
          />
          
          {/* Error message if any */}
          {error && (
            <div className="bg-red-50 text-red-700 p-3 mb-4 rounded-md">
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {/* Results Area */}
          <div className="flex-1 overflow-hidden">
            <ResultsArea 
              results={queryResults} 
              isLoading={isLoading} 
            />
          </div>
        </div>
      )}
    </MainLayout>
  );
}