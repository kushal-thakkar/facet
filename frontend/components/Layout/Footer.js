// components/Layout/Footer.js
import React from 'react';

function Footer({ queryStats }) {
  // Default empty stats if not provided
  const stats = queryStats || {
    executionTime: null,
    rowCount: null,
    cacheStatus: null,
  };

  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 py-3 px-6 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-dark-card shadow-soft flex items-center">
      <div className="flex items-center space-x-6">
        {/* Query execution time */}
        {stats.executionTime && (
          <span className="flex items-center">
            <svg
              className="w-4 h-4 mr-1 text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            Query completed in {stats.executionTime}s
          </span>
        )}

        {/* Row count */}
        {stats.rowCount && (
          <span className="flex items-center">
            <svg
              className="w-4 h-4 mr-1 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z"
              ></path>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 11h6m-6 4h6"
              ></path>
            </svg>
            {stats.rowCount.toLocaleString()} rows
          </span>
        )}

        {/* Cache status */}
        {stats.cacheStatus && (
          <span className="flex items-center">
            <svg
              className="w-4 h-4 mr-1 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
              ></path>
            </svg>
            Cache: {stats.cacheStatus}
          </span>
        )}
      </div>
    </footer>
  );
}

export default Footer;
