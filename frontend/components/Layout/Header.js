// components/Layout/Header.js
import React, { useEffect, useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import api from '../../utils/apiClient';

function Header() {
  const { state, actions } = useAppState();
  const { connections, currentConnection } = state;
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState(null);

  // Fetch connections when component mounts
  useEffect(() => {
    if (connections.length === 0) {
      fetchConnections();
    }
  }, []);

  // Fetch metadata when connection changes
  useEffect(() => {
    if (currentConnection) {
      console.log('Current connection:', currentConnection);
      fetchMetadata(currentConnection.id);
    }
  }, [currentConnection]);

  const fetchConnections = async () => {
    try {
      const fetchedConnections = await api.get('/api/v1/connections');
      actions.setConnections(fetchedConnections);
      console.log('Fetched connections:', fetchedConnections);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const handleConnectionChange = (e) => {
    const connectionId = e.target.value;

    if (!connectionId) {
      actions.setCurrentConnection(null);
      actions.updateMetadata({ tables: {} });
      return;
    }

    const selectedConnection = connections.find((conn) => conn.id === connectionId);
    if (selectedConnection) {
      actions.setCurrentConnection(selectedConnection);
    }
  };

  const fetchMetadata = async (connectionId) => {
    setLoadingMetadata(true);
    setMetadataError(null);

    try {
      console.log(`Fetching metadata for connection ID: ${connectionId}`);

      // Fetch tables
      const tables = await api.get(`/api/v1/metadata/connections/${connectionId}/tables`);
      console.log('Fetched tables:', tables);

      if (!tables) {
        throw new Error('Failed to fetch tables');
      }

      // Convert array to object with table name as key
      const tablesObject = {};
      tables.forEach((table) => {
        tablesObject[table.name] = table;
      });

      // Update metadata in app state
      actions.updateMetadata({
        tables: tablesObject,
      });
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setMetadataError(`Error loading metadata: ${error.message}`);
      actions.updateMetadata({ tables: {} });
    } finally {
      setLoadingMetadata(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 py-3 px-4 flex flex-col">
      <div className="flex justify-between items-center">
        {/* Logo and product name */}
        <div className="flex items-center">
          <span className="text-blue-600 font-bold text-xl mr-1">⚡</span>
          <h1 className="text-xl font-semibold text-gray-800">Facet</h1>
        </div>

        {/* Database connection selector */}
        <div className="flex-1 max-w-md mx-8">
          <label
            htmlFor="connection-select"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Database Connection
          </label>
          <div className="relative">
            <select
              id="connection-select"
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={currentConnection?.id || ''}
              onChange={handleConnectionChange}
              disabled={loadingMetadata}
            >
              <option value="">Select a connection</option>
              {connections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name} ({connection.type})
                </option>
              ))}
            </select>
            {loadingMetadata && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-400 animate-pulse">Loading...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right-side controls */}
        <div className="flex items-center space-x-4">
          {/* Settings menu */}
          <button className="text-gray-500 hover:text-gray-700">
            <span className="text-xl">⚙</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {metadataError && (
        <div className="mt-2 px-4 py-2 border border-red-300 bg-red-50 text-red-700 text-sm rounded">
          {metadataError}
        </div>
      )}

      {/* Connection info */}
      {currentConnection && !metadataError && (
        <div className="mt-2 px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 text-sm rounded flex justify-between">
          <div>
            <span className="font-medium">Connected to:</span> {currentConnection.name} (
            {currentConnection.type})
          </div>
          <div>
            <span className="font-medium">Host:</span> {currentConnection.config.host}:
            {currentConnection.config.port} |<span className="font-medium ml-2">Database:</span>{' '}
            {currentConnection.config.database}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
