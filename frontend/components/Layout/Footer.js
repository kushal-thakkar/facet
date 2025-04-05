// components/Layout/Footer.js
import React from 'react';

function Footer({ queryStats }) {
  // Default empty stats if not provided
  const stats = queryStats || {
    executionTime: null,
    rowCount: null,
    cacheStatus: null
  };

  return (
    <footer className="border-t border-gray-200 py-2 px-4 text-sm text-gray-600 bg-white flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {/* Query execution time */}
        {stats.executionTime && (
          <span>Query completed in {stats.executionTime}s</span>
        )}
        
        {/* Row count */}
        {stats.rowCount && (
          <span>{stats.rowCount.toLocaleString()} rows</span>
        )}
        
        {/* Cache status */}
        {stats.cacheStatus && (
          <span>Cache: {stats.cacheStatus}</span>
        )}
      </div>
      
      <div>
        <button 
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          onClick={() => console.log('View query details')}
        >
          View Query Details
        </button>
      </div>
    </footer>
  );
}

export default Footer;