'use client';

import { useState } from 'react';
import MapComponent from '../../../../components/Map';
import TrucksPage from '../trucks/page';
import ClientsPage from '../clients/page';
import MyShopsPage from '../my-shops/page';
import WorkersPage from '../workers/page';
import TripsPage from '../trips/page'; // Import the new TripsPage
import AnalyticsDashboard from '../../../../components/AnalyticsDashboard';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

const tabs = [
  { name: 'Map' },
  { name: 'Trucks' },
  { name: 'Trips' }, // Add the new Trips tab
  { name: 'Workers' },
  { name: 'Clients' },
  { name: 'My Shops' },
];

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('Map');
  const [isAnalyticsVisible, setIsAnalyticsVisible] = useState(true);

  const renderContent = () => {
    switch (activeTab) {
      case 'Map':
        return <div className="h-full w-full"><MapComponent /></div>;
      case 'Trucks':
        return <TrucksPage />;
      case 'Trips': // Add case for the new TripsPage
        return <TripsPage />;
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
    <div className="flex flex-col h-full bg-gray-100">
      {/* Collapsible Analytics Section */}
      <div className="bg-gray-100 border-b border-gray-300">
        <button
          onClick={() => setIsAnalyticsVisible(!isAnalyticsVisible)}
          className="w-full flex justify-between items-center p-2 bg-gray-200 hover:bg-gray-300 focus:outline-none"
          aria-expanded={isAnalyticsVisible}
        >
          <h2 className="text-lg font-bold text-gray-800 ml-2">Analytics Overview</h2>
          {isAnalyticsVisible ? <ChevronUpIcon className="h-6 w-6 text-gray-600" /> : <ChevronDownIcon className="h-6 w-6 text-gray-600" />}
        </button>
        {isAnalyticsVisible && <AnalyticsDashboard />}
      </div>

      {/* Tabbed Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Horizontally Scrollable Tabs */}
        <div className="border-b border-gray-200 bg-white">
          <nav className="flex space-x-1 sm:space-x-2 px-2 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`${
                  activeTab === tab.name
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 px-2 border-b-2 font-bold text-sm`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
