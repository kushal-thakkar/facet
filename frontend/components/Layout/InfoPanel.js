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
            className={`px-4 py-1 text-sm font-medium ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`px-4 py-1 text-sm font-medium ${
              activeTab === 'fields'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('fields')}
          >
            Fields
          </button>
        </nav>
      </div>

      {/* Panel content based on active tab */}
      <div className="overflow-y-auto p-2 h-36">
        {activeTab === 'details' && (
          <div>
            <h3 className="font-medium text-gray-700 text-sm mb-1">Table Information</h3>
            {currentTable ? (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="text-xs">{currentExploration.source.table}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Display Name</p>
                  <p className="text-xs">{currentTable.displayName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Description</p>
                  <p className="text-xs">{currentTable.description || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Row Count</p>
                  <p className="text-xs">{currentTable.rowCount?.toLocaleString() || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="text-xs">
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
            <h3 className="font-medium text-gray-700 text-sm mb-1">Table Fields</h3>
            {Object.keys(currentTableColumns).length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {Object.keys(currentTableColumns).map((columnName) => {
                  const column = currentTableColumns[columnName];
                  return (
                    <div key={columnName} className="border border-gray-100 rounded p-1">
                      <p className="text-xs font-medium truncate">
                        {column?.displayName || columnName}
                      </p>
                      <p className="text-xs text-gray-500">Type: {column?.dataType || 'Unknown'}</p>
                      {column?.description && (
                        <p className="text-xs text-gray-600 truncate" title={column.description}>
                          {column.description}
                        </p>
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
      </div>
    </div>
  );
}

export default InfoPanel;
