// components/Layout/Header.js
import React, { useEffect, useState, useRef } from 'react';
import { useAppState } from '../../context/AppStateContext';
import api from '../../utils/apiClient';

function Header({ toggleDarkMode, darkMode }) {
  const { state, actions } = useAppState();
  const { connections, currentConnection } = state;
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState(null);
  const [showConnectionDropdown, setShowConnectionDropdown] = useState(false);
  const [filterText, setFilterText] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowConnectionDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

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

  const handleConnectionChange = (connectionId) => {
    setShowConnectionDropdown(false);

    if (!connectionId) {
      actions.setCurrentConnection(null);
      actions.updateMetadata({ tables: {} });
      return;
    }

    const selectedConnection = connections.find((conn) => conn.id === connectionId);
    if (selectedConnection) {
      actions.setCurrentConnection(selectedConnection);
      setFilterText('');
    }
  };

  const filteredConnections = connections.filter(
    (conn) =>
      conn.name.toLowerCase().includes(filterText.toLowerCase()) ||
      conn.type.toLowerCase().includes(filterText.toLowerCase())
  );

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
    <header className="bg-white dark:bg-dark-card shadow-soft border-b border-gray-200 dark:border-gray-700 py-2 px-6 flex flex-col">
      <div className="flex justify-between items-center">
        {/* Logo and product name */}
        <div className="flex items-center">
          <span className="text-primary dark:text-indigo-400 font-bold text-2xl mr-2">⚡</span>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Facet</h1>
        </div>

        {/* Database connection selector with typeahead */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setShowConnectionDropdown(!showConnectionDropdown)}
              className="cursor-pointer"
            >
              <div className="flex items-center form-input py-1.5">
                <span
                  className={`${currentConnection ? 'text-primary font-medium' : 'text-gray-500'}`}
                >
                  {currentConnection ? (
                    <span className="flex items-center">
                      <svg
                        className="w-4 h-4 mr-1.5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                      {currentConnection.name} ({currentConnection.type})
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-medium">
                        • {currentConnection.config.database}
                      </span>
                    </span>
                  ) : (
                    'Select a data source'
                  )}
                </span>
                <svg
                  className="ml-auto w-4 h-4 text-gray-500"
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
              </div>
            </div>

            {showConnectionDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    placeholder="Search connections..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-dark-bg dark:text-gray-200"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                    {filteredConnections.length} connection
                    {filteredConnections.length !== 1 ? 's' : ''} found
                  </div>
                  {filteredConnections.map((connection) => (
                    <div
                      key={connection.id}
                      className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-800 dark:text-gray-100"
                      onClick={() => handleConnectionChange(connection.id)}
                    >
                      <div className="font-medium">{connection.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {connection.type} • {connection.config.database}
                      </div>
                    </div>
                  ))}
                  {filteredConnections.length === 0 && (
                    <div className="px-3 py-3 text-gray-500 text-center">No connections found</div>
                  )}
                </div>
              </div>
            )}

            {loadingMetadata && (
              <div className="absolute top-8 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-400 dark:text-gray-500 animate-pulse">Loading...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right-side controls */}
        <div className="flex items-center space-x-3">
          {/* Theme toggle button */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                ></path>
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                ></path>
              </svg>
            )}
          </button>

          {/* Settings menu */}
          <button className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Error message */}
      {metadataError && (
        <div className="mt-3 px-4 py-3 border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-lg">
          {metadataError}
        </div>
      )}

      {/* Error messages only - connection info moved to the label */}
    </header>
  );
}

export default Header;
