import React, { useState, useEffect } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import ResultsArea from '../components/Exploration/ResultsArea';
import { useAppState } from '../context/AppStateContext';

export default function Home(props) {
  const { state, actions } = useAppState();
  const { currentConnection, queryResults, currentExploration } = state;
  const [isLoading, setIsLoading] = useState(false);

  // This function runs a query with the current exploration settings
  const runQuery = async (explorationOverride = null) => {
    if (!currentConnection) {
      return Promise.reject(new Error('No connection selected'));
    }

    try {
      const exploration = explorationOverride || currentExploration;

      // Debug log the incoming exploration object
      console.log(
        'Starting runQuery with exploration:',
        JSON.stringify({
          limit: exploration.limit,
          isServerPagination: exploration.isServerPagination,
          offset: exploration.offset,
          limitType: typeof exploration.limit,
          isNoneLimit: exploration.limit === 'none',
        })
      );

      setIsLoading(true);

      // Process exploration parameters
      const processedExploration = {
        ...exploration,
        // Pass through the server pagination flag
        isServerPagination: exploration.isServerPagination,

        // Set appropriate limit based on pagination mode
        // For server-side pagination (which includes the 'none' case):
        // - Always use tablePageSize as the actual limit sent to the backend
        // For client-side pagination:
        // - Convert string limits to numbers
        // - Convert 'none' to null
        limit: exploration.isServerPagination
          ? state.preferences.tablePageSize // Use tablePageSize for server-side pagination
          : exploration.limit === 'none'
            ? null
            : typeof exploration.limit === 'string'
              ? parseInt(exploration.limit, 10)
              : exploration.limit,

        // Set appropriate offset based on pagination mode
        offset: exploration.isServerPagination
          ? typeof exploration.offset === 'string'
            ? parseInt(exploration.offset, 10)
            : exploration.offset || 0
          : null, // Null offset for client-side pagination
      };

      // Prepare the query request
      const queryRequest = {
        connectionId: currentConnection.id,
        query: processedExploration,
      };

      // Log the request for debugging with detailed type information
      console.log(
        'Executing query with params:',
        JSON.stringify({
          // Original values
          original_limit: exploration.limit,
          original_limit_type: typeof exploration.limit,
          original_isServerPagination: exploration.isServerPagination,
          original_offset: exploration.offset,

          // Processed values
          processed_limit: processedExploration.limit,
          processed_limit_type: typeof processedExploration.limit,
          processed_isServerPagination: processedExploration.isServerPagination,
          processed_offset: processedExploration.offset,

          // Preferences
          tablePageSize: state.preferences.tablePageSize,
        })
      );

      // Send the query via the API endpoint
      const response = await fetch('/api/v1/query/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryRequest),
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }

      const results = await response.json();

      // Update the results in global state
      actions.updateQueryResults(results);

      // Return results to any waiting promises
      return results;
    } catch (error) {
      console.error('Error executing query:', error);
      // Set error state in results
      const errorResult = {
        error: error.message || 'Unknown error occurred',
        columns: [],
        data: [],
        rowCount: 0,
        executionTime: 0,
      };
      actions.updateQueryResults(errorResult);

      // Explicitly return a rejected promise so callers can handle it
      return Promise.reject(error);
    } finally {
      setIsLoading(false);
    }
  };

  // This effect tracks the loading state changes from the SidePanel component
  useEffect(() => {
    // This would ideally be handled through context state as well
    if (queryResults) {
      setIsLoading(false);
    }
  }, [queryResults]);

  return (
    <MainLayout toggleDarkMode={props?.toggleDarkMode} darkMode={props?.darkMode}>
      <div className="h-full flex flex-col">
        {!currentConnection ? (
          <div className="flex-1 flex items-center justify-center flex-col p-8 text-center">
            <div className="text-6xl text-primary mb-6">📊</div>
            <h2 className="text-2xl font-medium text-gray-800 dark:text-gray-100 mb-3">
              Select a Data Source
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-lg">
              Use the data source selector at the top of the page to connect to your database and
              start exploring your data.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ResultsArea results={queryResults} isLoading={isLoading} onRunQuery={runQuery} />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
