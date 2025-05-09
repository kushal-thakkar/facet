import React, { useState } from 'react';
import SidePanel from './SidePanel';
import { useAppState } from '../../context/AppStateContext';

function MainLayout({ children, toggleDarkMode, darkMode }) {
  const { state } = useAppState();
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

  // Toggle side panel
  const toggleSidePanel = () => {
    setSidePanelOpen(!sidePanelOpen);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-dark-bg">
      <div className="flex flex-1 overflow-hidden">
        {/* Side Panel */}
        <div
          className={`${
            sidePanelOpen ? 'w-96' : 'w-0'
          } transition-all duration-300 ease-in-out overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-card`}
        >
          <SidePanel toggleDarkMode={toggleDarkMode} darkMode={darkMode} />
        </div>

        {/* Toggle Side Panel Button */}
        <button
          onClick={toggleSidePanel}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white dark:bg-dark-card shadow-md p-1.5 rounded-r-lg border border-l-0 border-gray-200 dark:border-gray-700 z-10"
          style={{ left: sidePanelOpen ? '96' : '0', marginLeft: sidePanelOpen ? '374px' : '0' }}
        >
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={sidePanelOpen ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
            ></path>
          </svg>
        </button>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main content */}
          <div className="flex-1 overflow-auto p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default MainLayout;
