// components/Layout/SidePanel.js
import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';

function SidePanel() {
  const { state, actions } = useAppState();
  const { currentConnection, metadata, explorations } = state;

  const [expandedSections, setExpandedSections] = useState({
    dataSources: true,
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
      {/* Data Source Section */}
      <div className="mb-6">
        <h2 className="text-xs uppercase font-semibold text-gray-500 mb-2 tracking-wider">
          DATA SOURCE
        </h2>

        {expandedSections.dataSources && (
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
              <li className="text-sm text-gray-400 italic">No data sources available</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SidePanel;
