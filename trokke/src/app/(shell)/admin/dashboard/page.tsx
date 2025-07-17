'use client';

import { useState } from 'react';
import MapComponent from '../../../../components/Map';
import TrucksPage from '../trucks/page';
import ClientsPage from '../clients/page';
import BusinessStoresPage from '../business-stores/page';
import WorkersPage from '../workers/page';
import AnalyticsDashboard from '../../../../components/AnalyticsDashboard'; // Import the new component

const tabs = [
  { name: 'Map' },
  { name: 'Trucks' },
  { name: 'Workers' },
  { name: 'Clients' },
  { name: 'Stores' },
];

const AdminDashboardPage = () => {
  // Corrected the line below by removing the extra '=' sign
  const [activeTab, setActiveTab] = useState('Map');

  const renderContent = () => {
    switch (activeTab) {
      case 'Map':
        return <MapComponent markers={[]} />;
      case 'Trucks':
        return <TrucksPage />;
      case 'Workers':
        return <WorkersPage />;
      case 'Clients':
        return <ClientsPage />;
      case 'Stores':
        return <BusinessStoresPage />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Analytics section taking up ~30% of the height */}
      <div className="h-[30vh] bg-gray-200">
          <AnalyticsDashboard />
      </div>

      {/* Tabbed content taking up the remaining height */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-gray-200 bg-white">
          <nav className="-mb-px flex space-x-4 md:space-x-8 px-4 sm:px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`${
                  activeTab === tab.name
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-5 px-2 sm:px-4 border-b-2 font-semibold text-base md:text-lg`}
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
