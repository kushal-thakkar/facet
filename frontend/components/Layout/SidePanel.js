// components/Layout/SidePanel.js
import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';

function SidePanel() {
  const { state, actions } = useAppState();
  const { currentConnection, metadata, explorations } = state;

  const [expandedSections, setExpandedSections] = useState({
    tables: true,
    views: true,
    savedQueries: true,
  });

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  const selectTable = (tableName) => {
    // This would start a new exploration with the selected table
    actions.setCurrentExploration({
      ...state.currentExploration,
      source: {
        connectionId: currentConnection?.id,
        table: tableName,
      },
      filters: [],
      groupBy: [],
      metrics: [],
    });
  };

  const loadExploration = (exploration) => {
    actions.setCurrentExploration(exploration);
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* Data Sources Section */}
      <div className="mb-6">
        <h2 className="text-xs uppercase font-semibold text-gray-500 mb-2 tracking-wider">
          DATA SOURCES
        </h2>

        {/* Tables Section */}
        <div className="mb-2">
          <button
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
            onClick={() => toggleSection('tables')}
          >
            <span>Tables</span>
            <span>{expandedSections.tables ? '▾' : '▸'}</span>
          </button>

          {expandedSections.tables && (
            <ul className="pl-4 mt-1 space-y-1">
              {currentConnection &&
                metadata.tables &&
                Object.keys(metadata.tables)
                  .filter((table) => metadata.tables[table]?.explorable)
                  .map((table) => (
                    <li key={table}>
                      <button
                        className="text-sm text-gray-600 hover:text-blue-600 hover:underline"
                        onClick={() => selectTable(table)}
                      >
                        {metadata.tables[table]?.displayName || table}
                      </button>
                    </li>
                  ))}
              {(!currentConnection ||
                !metadata.tables ||
                Object.keys(metadata.tables).length === 0) && (
                <li className="text-sm text-gray-400 italic">No tables available</li>
              )}
            </ul>
          )}
        </div>

        {/* Views Section */}
        <div className="mb-2">
          <button
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
            onClick={() => toggleSection('views')}
          >
            <span>Views</span>
            <span>{expandedSections.views ? '▾' : '▸'}</span>
          </button>

          {expandedSections.views && (
            <ul className="pl-4 mt-1 space-y-1">
              <li className="text-sm text-gray-400 italic">No views available</li>
            </ul>
          )}
        </div>
      </div>

      {/* Saved Queries Section */}
      <div>
        <h2 className="text-xs uppercase font-semibold text-gray-500 mb-2 tracking-wider">SAVED</h2>

        <div className="mb-2">
          <button
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
            onClick={() => toggleSection('savedQueries')}
          >
            <span>My Queries</span>
            <span>{expandedSections.savedQueries ? '▾' : '▸'}</span>
          </button>

          {expandedSections.savedQueries && (
            <ul className="pl-4 mt-1 space-y-1">
              {explorations && explorations.length > 0 ? (
                explorations.map((exploration) => (
                  <li key={exploration.id}>
                    <button
                      className="text-sm text-gray-600 hover:text-blue-600 hover:underline"
                      onClick={() => loadExploration(exploration)}
                    >
                      {exploration.name}
                    </button>
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-400 italic">No saved queries</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default SidePanel;
