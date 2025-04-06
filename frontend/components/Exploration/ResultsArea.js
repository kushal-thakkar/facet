// components/Exploration/ResultsArea.js
import React, { useState } from 'react';
import ResultsTable from './ResultsTable';
import ResultsChart from './ResultsChart';
import { useAppState } from '../../context/AppStateContext';

function ResultsArea({ results, isLoading }) {
  const { state, actions } = useAppState();
  const { currentExploration } = state;

  // Get current visualization type or default to table
  const visualizationType = currentExploration.visualization?.type || 'table';

  // Handler for export button
  const handleExport = (format) => {
    if (!results) return;

    switch (format) {
      case 'csv':
        exportCSV();
        break;
      case 'json':
        exportJSON();
        break;
      case 'sql':
        exportSQL();
        break;
      default:
        break;
    }
  };

  // Export data as CSV
  const exportCSV = () => {
    if (!results || !results.data) return;

    // Get headers
    const headers = results.columns.map((col) => col.name);

    // Create CSV rows
    const csvRows = [
      headers.join(','), // Headers row
      ...results.data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Handle values that might contain commas, quotes, etc.
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(',')
      ),
    ];

    // Create and download the CSV file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `facet_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export data as JSON
  const exportJSON = () => {
    if (!results || !results.data) return;

    const jsonContent = JSON.stringify(results.data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `facet_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export query as SQL
  const exportSQL = () => {
    if (!results || !results.sql) return;

    const blob = new Blob([results.sql], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `facet_query_${new Date().toISOString().slice(0, 10)}.sql`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-lg shadow-card overflow-hidden">
      {/* Header with export options - reduced height */}
      <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300"></div>

        <div className="relative">
          <button
            className="px-3 py-1 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center"
            onClick={() => document.getElementById('export-menu').classList.toggle('hidden')}
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
              ></path>
            </svg>
            Export
            <svg
              className="w-4 h-4 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </button>

          {/* Export dropdown menu */}
          <div
            id="export-menu"
            className="absolute right-0 mt-2 w-40 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 hidden"
          >
            <div className="py-1">
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleExport('csv')}
                disabled={!results}
              >
                Export as CSV
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleExport('json')}
                disabled={!results}
              >
                Export as JSON
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleExport('sql')}
                disabled={!results}
              >
                Export SQL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results content area */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          // Loading state
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading results...</p>
            </div>
          </div>
        ) : !results ? (
          // No results yet state
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-5xl mb-5">📋</div>
              <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ready to Explore Data
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Configure your exploration in the side panel and click &quot;Run Query&quot; to see
                results
              </p>
            </div>
          </div>
        ) : results.error ? (
          // Error state
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md p-8">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-medium text-red-600 dark:text-red-400 mb-3">
                Query Error
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-5">{results.error}</p>
              {results.suggestions && (
                <div className="text-left bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2">Suggestions:</p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    {results.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : visualizationType === 'table' ? (
          // Table view
          <ResultsTable results={results} />
        ) : (
          // Chart view
          <ResultsChart results={results} type={visualizationType} />
        )}
      </div>
    </div>
  );
}

export default ResultsArea;
