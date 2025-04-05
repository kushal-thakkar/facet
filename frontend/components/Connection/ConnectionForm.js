// components/Connection/ConnectionForm.js
import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';

// Database types with their configurations
const DATABASE_TYPES = [
  { 
    id: 'postgres', 
    name: 'PostgreSQL',
    fields: [
      { id: 'host', label: 'Host', type: 'text', required: true },
      { id: 'port', label: 'Port', type: 'number', defaultValue: 5432, required: true },
      { id: 'database', label: 'Database', type: 'text', required: true },
      { id: 'user', label: 'Username', type: 'text', required: true },
      { id: 'password', label: 'Password', type: 'password', required: true },
      { id: 'ssl', label: 'Use SSL', type: 'checkbox', defaultValue: true }
    ]
  },
  { 
    id: 'clickhouse', 
    name: 'ClickHouse',
    fields: [
      { id: 'host', label: 'Host', type: 'text', required: true },
      { id: 'port', label: 'Port', type: 'number', defaultValue: 8123, required: true },
      { id: 'database', label: 'Database', type: 'text', required: true },
      { id: 'user', label: 'Username', type: 'text', required: true },
      { id: 'password', label: 'Password', type: 'password', required: true },
      { id: 'https', label: 'Use HTTPS', type: 'checkbox', defaultValue: true }
    ]
  }
];

function ConnectionForm({ connection, onSave, onCancel }) {
  const { state, actions } = useAppState();
  
  // Initialize form state from connection or defaults
  const [formState, setFormState] = useState(() => {
    if (connection) {
      return {
        id: connection.id,
        name: connection.name,
        type: connection.type,
        config: { ...connection.config }
      };
    } else {
      return {
        id: '',
        name: '',
        type: DATABASE_TYPES[0].id,
        config: {}
      };
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  
  // Get fields for the selected database type
  const getDbFields = () => {
    const dbType = DATABASE_TYPES.find(type => type.id === formState.type);
    return dbType ? dbType.fields : [];
  };
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'name' || name === 'type') {
      setFormState({
        ...formState,
        [name]: value
      });
    } else {
      // It's a config field
      setFormState({
        ...formState,
        config: {
          ...formState.config,
          [name]: type === 'checkbox' ? checked : value
        }
      });
    }
  };
  
  // Test the connection
  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: formState.type,
          config: formState.config
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to test connection');
      }
      
      setTestResult({
        success: true,
        message: 'Connection successful!'
      });
    } catch (err) {
      console.error('Error testing connection:', err);
      setTestResult({
        success: false,
        message: err.message || 'Connection failed. Please check your settings.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save the connection
  const saveConnection = async (e) => {
    e.preventDefault();
    
    if (!formState.name.trim()) {
      setError('Please provide a connection name');
      return;
    }
    
    // Validate required fields
    const requiredFields = getDbFields().filter(field => field.required);
    for (const field of requiredFields) {
      if (!formState.config[field.id]) {
        setError(`Please provide a value for ${field.label}`);
        return;
      }
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // This would be an API call in a real application
      // For now, we'll just simulate it
      
      // Generate ID if it's a new connection
      const connectionId = formState.id || `conn_${Date.now()}`;
      
      const newConnection = {
        id: connectionId,
        name: formState.name,
        type: formState.type,
        config: { ...formState.config }
      };
      
      // Update connections in state
      const updatedConnections = [
        ...state.connections.filter(c => c.id !== connectionId),
        newConnection
      ];
      
      actions.setConnections(updatedConnections);
      
      // Set as current connection if it's new or was already current
      if (!formState.id || state.currentConnection?.id === formState.id) {
        actions.setCurrentConnection(newConnection);
      }
      
      // Call onSave callback
      if (onSave) {
        onSave(newConnection);
      }
    } catch (err) {
      console.error('Error saving connection:', err);
      setError(err.message || 'Failed to save connection');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <form onSubmit={saveConnection} className="px-4 py-5 sm:p-6">
        {/* Connection name and type */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {connection ? 'Edit Connection' : 'New Connection'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure your database connection details.
            </p>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          )}
          
          {/* Test result message */}
          {testResult && (
            <div className={`rounded-md ${testResult.success ? 'bg-green-50' : 'bg-red-50'} p-4`}>
              <div className="flex">
                <div className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.message}
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Connection Name */}
            <div className="sm:col-span-3">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Connection Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formState.name}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Production Database"
                  required
                />
              </div>
            </div>
            
            {/* Database Type */}
            <div className="sm:col-span-3">
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Database Type
              </label>
              <div className="mt-1">
                <select
                  id="type"
                  name="type"
                  value={formState.type}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  {DATABASE_TYPES.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Database-specific fields */}
            {getDbFields().map(field => (
              <div 
                key={field.id} 
                className={field.type === 'checkbox' ? 'sm:col-span-6' : 'sm:col-span-3'}
              >
                {field.type === 'checkbox' ? (
                  <div className="flex items-center">
                    <input
                      id={field.id}
                      name={field.id}
                      type="checkbox"
                      checked={formState.config[field.id] ?? field.defaultValue ?? false}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={field.id} className="ml-2 block text-sm text-gray-700">
                      {field.label}
                    </label>
                  </div>
                ) : (
                  <>
                    <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="mt-1">
                      <input
                        type={field.type}
                        name={field.id}
                        id={field.id}
                        value={formState.config[field.id] ?? field.defaultValue ?? ''}
                        onChange={handleChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required={field.required}
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Form actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={testConnection}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {isLoading ? 'Testing...' : 'Test Connection'}
          </button>
          
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
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {isLoading ? 'Saving...' : 'Save Connection'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ConnectionForm;