'use client';

import { useState } from 'react';
import MapComponent from '../../../../components/Map';
import TrucksPage from '../trucks/page';
import ClientsPage from '../clients/page';
import MyShopsPage from '../my-shops/page';
import WorkersPage from '../workers/page';
import AnalyticsDashboard from '../../../../components/AnalyticsDashboard';

const tabs = [
  { name: 'Map' },
  { name: 'Trucks' },
  { name: 'Workers' },
  { name: 'Clients' },
  { name: 'My Shops' },
];

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('Map');

  const renderContent = () => {
    switch (activeTab) {
      case 'Map':
        return <MapComponent />;
      case 'Trucks':
        return <TrucksPage />;
      case 'Workers':
        return <WorkersPage />;
      case 'Clients':
        return <ClientsPage />;
      case 'My Shops':
        return <MyShopsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Analytics section with reduced height */}
      <div className="h-auto bg-gray-200">
          <AnalyticsDashboard />
      </div>

      {/* Tabbed content taking up the remaining height */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-gray-200 bg-white">
          <nav className="-mb-px flex space-x-6 px-4 sm:px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`${
                  activeTab === tab.name
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-3 border-b-2 font-bold text-lg md:text-xl`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
