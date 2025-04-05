// components/Layout/InfoPanel.js
import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';

function InfoPanel() {
  const { state } = useAppState();
  const { currentExploration, metadata } = state;
  const [activeTab, setActiveTab] = useState('details');

  // Get the current table metadata if a table is selected
  const currentTable = currentExploration?.source?.table
    ? metadata.tables[currentExploration.source.table]
    : null;

  // Get columns for the current table
  const currentTableColumns = currentExploration?.source?.table
    ? Object.keys(metadata.columns || {})
        .filter((key) => key.startsWith(`${currentExploration.source.table}.`))
        .reduce((acc, key) => {
          acc[key.split('.')[1]] = metadata.columns[key];
          return acc;
        }, {})
    : {};

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'fields'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('fields')}
          >
            Fields
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'help'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('help')}
          >
            Help
          </button>
        </nav>
      </div>

      {/* Panel content based on active tab */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'details' && (
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Table Information</h3>
            {currentTable ? (
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-sm">{currentExploration.source.table}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Display Name</p>
                  <p className="text-sm">{currentTable.displayName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-sm">{currentTable.description || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Row Count</p>
                  <p className="text-sm">{currentTable.rowCount?.toLocaleString() || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="text-sm">
                    {currentTable.refreshedAt
                      ? new Date(currentTable.refreshedAt).toLocaleString()
                      : 'Unknown'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No table selected</p>
            )}
          </div>
        )}

        {activeTab === 'fields' && (
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Table Fields</h3>
            {Object.keys(currentTableColumns).length > 0 ? (
              <div className="space-y-3">
                {Object.keys(currentTableColumns).map((columnName) => {
                  const column = currentTableColumns[columnName];
                  return (
                    <div key={columnName} className="border-b border-gray-100 pb-2">
                      <p className="text-sm font-medium">{column?.displayName || columnName}</p>
                      <p className="text-xs text-gray-500">Type: {column?.dataType || 'Unknown'}</p>
                      {column?.description && (
                        <p className="text-xs text-gray-600">{column.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No fields available</p>
            )}
          </div>
        )}

        {activeTab === 'help' && (
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Help & Tips</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Getting Started</p>
                <p className="text-xs text-gray-600">1. Select a connection from the dropdown</p>
                <p className="text-xs text-gray-600">2. Choose a table from the side panel</p>
                <p className="text-xs text-gray-600">
                  3. Add filters, group by dimensions, and metrics
                </p>
                <p className="text-xs text-gray-600">
                  4. Explore your data with different visualizations
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">Keyboard Shortcuts</p>
                <p className="text-xs text-gray-600">
                  <span className="font-mono bg-gray-100 px-1">Ctrl+S</span> - Save exploration
                </p>
                <p className="text-xs text-gray-600">
                  <span className="font-mono bg-gray-100 px-1">Ctrl+E</span> - Export results
                </p>
                <p className="text-xs text-gray-600">
                  <span className="font-mono bg-gray-100 px-1">Ctrl+R</span> - Run query
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InfoPanel;
