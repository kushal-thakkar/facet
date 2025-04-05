// components/Exploration/ResultsArea.js
import React, { useState } from 'react';
import ResultsTable from './ResultsTable';
import ResultsChart from './ResultsChart';
import { useAppState } from '../../context/AppStateContext';

function ResultsArea({ results, isLoading }) {
  const { state, actions } = useAppState();
  const { currentExploration } = state;
  
  // Available visualization types
  const visualizationTypes = [
    { id: 'table', label: 'Table', icon: '🔢' },
    { id: 'line', label: 'Line Chart', icon: '📈' },
    { id: 'bar', label: 'Bar Chart', icon: '📊' },
    { id: 'pie', label: 'Pie Chart', icon: '🥧' }
  ];
  
  // Get current visualization type or default to table
  const visualizationType = currentExploration.visualization?.type || 'table';
  
  // Handler for changing visualization type
  const changeVisualizationType = (type) => {
    actions.updateCurrentExploration({
      visualization: {
        ...currentExploration.visualization,
        type
      }
    });
  };
  
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
    const headers = results.columns.map(col => col.name);
    
    // Create CSV rows
    const csvRows = [
      headers.join(','), // Headers row
      ...results.data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values that might contain commas, quotes, etc.
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
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
    <div className="h-full flex flex-col bg-white border border-gray-200 rounded-md overflow-hidden">
      {/* Results header with visualization toggle and export options */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div className="flex space-x-2">
          {visualizationTypes.map(type => (
            <button
              key={type.id}
              className={`px-3 py-1 text-sm font-medium rounded ${
                visualizationType === type.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => changeVisualizationType(type.id)}
            >
              <span className="mr-1">{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <button
            className="px-3 py-1 text-sm font-medium rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            onClick={() => document.getElementById('export-menu').classList.toggle('hidden')}
          >
            Export ▾
          </button>
          
          {/* Export dropdown menu */}
          <div 
            id="export-menu"
            className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10 hidden"
          >
            <div className="py-1">
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => handleExport('csv')}
                disabled={!results}
              >
                Export as CSV
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => handleExport('json')}
                disabled={!results}
              >
                Export as JSON
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => handleExport('sql')}
                disabled={!results}
              >
                Copy SQL
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-3 text-gray-600">Loading results...</p>
            </div>
          </div>
        ) : !results ? (
          // No results yet state
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <p className="text-gray-500">
                Configure your exploration and click "Run Query" to see results
              </p>
            </div>
          </div>
        ) : results.error ? (
          // Error state
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md p-8">
              <div className="text-red-500 text-3xl mb-3">⚠️</div>
              <h3 className="text-lg font-medium text-red-800 mb-2">Query Error</h3>
              <p className="text-gray-600 mb-4">{results.error}</p>
              {results.suggestions && (
                <div className="text-left bg-gray-50 p-3 rounded text-sm">
                  <p className="font-medium mb-1">Suggestions:</p>
                  <ul className="list-disc pl-5 space-y-1">
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
          <ResultsChart 
            results={results}
            type={visualizationType}
          />
        )}
      </div>
    </div>
  );
}

export default ResultsArea;