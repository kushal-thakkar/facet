import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import api from '../../utils/apiClient';

function ConnectionForm({ connection, onSave, onCancel }) {
  const { state, actions } = useAppState();
  const [availableConnections, setAvailableConnections] = useState([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState(connection?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available connections when component mounts
  useEffect(() => {
    const fetchConnections = async () => {
      setIsLoading(true);
      try {
        const connections = await api.get('/api/v1/connections');
        setAvailableConnections(connections);

        // If there's no selected connection yet and we have connections, select the first one
        if (!selectedConnectionId && connections.length > 0) {
          setSelectedConnectionId(connections[0].id);
        }
      } catch (err) {
        console.error('Error fetching connections:', err);
        setError('Failed to fetch available connections');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnections();
  }, []);

  // Handle connection selection change
  const handleConnectionChange = (e) => {
    setSelectedConnectionId(e.target.value);
  };

  // Select and activate connection
  const selectConnection = async (e) => {
    e.preventDefault();

    if (!selectedConnectionId) {
      setError('Please select a connection');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Find the selected connection object
      const selectedConnection = availableConnections.find((c) => c.id === selectedConnectionId);

      if (!selectedConnection) {
        throw new Error('Selected connection not found');
      }

      // Update current connection in state
      actions.setCurrentConnection(selectedConnection);

      // Fetch metadata for the selected connection
      console.log('Fetching metadata for connection:', selectedConnection.id);

      try {
        const tables = await api.get(
          `/api/v1/metadata/connections/${selectedConnection.id}/tables`
        );
        console.log('Fetched tables:', tables);

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
        console.error('Error fetching tables:', error);
        setError(`Error fetching metadata: ${error.message}`);
      }

      // Call onSave callback
      if (onSave) {
        onSave(selectedConnection);
      }
    } catch (err) {
      console.error('Error selecting connection:', err);
      setError(err.message || 'Failed to select connection');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <form onSubmit={selectConnection} className="px-4 py-5 sm:p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Select Connection</h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose from available database connections.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          {isLoading && <p className="text-sm text-gray-500">Loading connections...</p>}

          {!isLoading && availableConnections.length === 0 && (
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="text-sm text-yellow-700">
                  No database connections available. Please check your configuration file.
                </div>
              </div>
            </div>
          )}

          {availableConnections.length > 0 && (
            <div className="grid grid-cols-1 gap-y-6">
              {/* Connection Selection */}
              <div>
                <label htmlFor="connectionId" className="block text-sm font-medium text-gray-700">
                  Database Connection
                </label>
                <div className="mt-1">
                  <select
                    id="connectionId"
                    name="connectionId"
                    value={selectedConnectionId}
                    onChange={handleConnectionChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">Select a connection...</option>
                    {availableConnections.map((conn) => (
                      <option key={conn.id} value={conn.id}>
                        {conn.name} ({conn.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected connection details */}
              {selectedConnectionId && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Connection Details</h4>
                  {(() => {
                    const conn = availableConnections.find((c) => c.id === selectedConnectionId);
                    if (!conn) return null;

                    return (
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium">Name:</span> {conn.name}
                        </p>
                        <p>
                          <span className="font-medium">Type:</span> {conn.type}
                        </p>
                        <p>
                          <span className="font-medium">Host:</span> {conn.config.host}:
                          {conn.config.port}
                        </p>
                        <p>
                          <span className="font-medium">Database:</span> {conn.config.database}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form actions */}
        <div className="mt-6 flex justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !selectedConnectionId}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {isLoading ? 'Loading...' : 'Select Connection'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ConnectionForm;
