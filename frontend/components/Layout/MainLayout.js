// components/Layout/MainLayout.js
import React, { useState } from 'react';
import Header from './Header';
import SidePanel from './SidePanel';
import InfoPanel from './InfoPanel';
import Footer from './Footer';
import { useAppState } from '../../context/AppStateContext';

function MainLayout({ children }) {
  const { state } = useAppState();
  const [infoOpen, setInfoOpen] = useState(true);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

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

          {/* Footer */}
          <Footer />
        </div>

        {/* Info Panel */}
        <div
          className={`${
            infoOpen ? 'w-64' : 'w-0'
          } transition-width duration-300 ease-in-out overflow-hidden border-l border-gray-200 bg-white`}
        >
          <InfoPanel />
        </div>
      </div>
    </div>
  );
}

export default MainLayout;
