// components/Layout/Header.js
import React from 'react';
import { useAppState } from '../../context/AppStateContext';

function Header() {
  const { state, actions } = useAppState();
  const { connections, currentConnection } = state;

  const handleConnectionChange = (e) => {
    const connectionId = e.target.value;
    const selectedConnection = connections.find(conn => conn.id === connectionId);
    actions.setCurrentConnection(selectedConnection);
  };

  return (
    <header className="bg-white border-b border-gray-200 py-3 px-4 flex justify-between items-center">
      {/* Logo and product name */}
      <div className="flex items-center">
        <span className="text-blue-600 font-bold text-xl mr-1">⚡</span>
        <h1 className="text-xl font-semibold text-gray-800">Facet</h1>
      </div>
      
      {/* Database connection selector */}
      <div className="flex-1 max-w-xs mx-8">
        <select 
          className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          value={currentConnection?.id || ''}
          onChange={handleConnectionChange}
        >
          <option value="">Select a connection</option>
          {connections.map(connection => (
            <option key={connection.id} value={connection.id}>
              {connection.type} - {connection.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Right-side controls */}
      <div className="flex items-center space-x-4">
        {/* Notification bell */}
        <button className="text-gray-500 hover:text-gray-700">
          <span className="text-xl">🔔</span>
        </button>
        
        {/* User menu */}
        <button className="text-gray-500 hover:text-gray-700">
          <span className="text-xl">👤</span>
        </button>
        
        {/* Settings menu */}
        <button className="text-gray-500 hover:text-gray-700">
          <span className="text-xl">⚙</span>
        </button>
      </div>
    </header>
  );
}

export default Header;