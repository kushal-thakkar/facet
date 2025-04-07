import React, { useState, useEffect } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import ResultsArea from '../components/Exploration/ResultsArea';
import { useAppState } from '../context/AppStateContext';

export default function Home(props) {
  const { state } = useAppState();
  const { currentConnection, queryResults } = state;
  const [isLoading, setIsLoading] = useState(false);

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
            <ResultsArea results={queryResults} isLoading={isLoading} />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
