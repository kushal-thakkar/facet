// components/Layout/MainLayout.js
import React, { useState } from 'react';
import Header from './Header';
import SidePanel from './SidePanel';
import InfoPanel from './InfoPanel';
import Footer from './Footer';
import { useAppState } from '../../context/AppStateContext';

function MainLayout({ children }) {
  const { state } = useAppState();
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [infoExpandedState, setInfoExpandedState] = useState(false);

  const toggleInfoPanel = () => {
    setInfoExpandedState(!infoExpandedState);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Side Panel */}
        <div
          className={`${
            sidePanelOpen ? 'w-64' : 'w-0'
          } transition-width duration-300 ease-in-out overflow-hidden border-r border-gray-200 bg-white`}
        >
          <SidePanel />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main content */}
          <div className="flex-1 overflow-auto p-4">{children}</div>

          {/* Info Panel Toggle Button */}
          <button
            onClick={toggleInfoPanel}
            className="flex items-center justify-center py-1 text-xs text-gray-500 hover:text-gray-700 border-t border-gray-200 bg-white"
          >
            {infoExpandedState ? 'Hide Details ▲' : 'Show Details ▼'}
          </button>

          {/* Bottom Info Panel */}
          <div
            className={`${
              infoExpandedState ? 'h-44' : 'h-0'
            } transition-height duration-300 ease-in-out overflow-hidden border-t border-gray-200 bg-white`}
          >
            <InfoPanel />
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default MainLayout;
