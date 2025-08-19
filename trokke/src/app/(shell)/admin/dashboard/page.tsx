'use client';

import { useState } from 'react';
import MapComponent from '../../../../components/Map';
import TrucksPage from '../trucks/page';
import ClientsPage from '../clients/page';
import MyShopsPage from '../my-shops/page';
import WorkersPage from '../workers/page';
import TripsPage from '../trips/page';
import AnalyticsDashboard from '../../../../components/AnalyticsDashboard';
import { ChevronDownIcon, ChevronUpIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { handleBulkServiceImport } from '@/lib/import-services';

const tabs = [
  { name: 'Map' },
  { name: 'Trucks' },
  { name: 'Trips' },
  { name: 'Workers' },
  { name: 'Clients' },
  { name: 'My Shops' },
];

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('Map');
  const [isAnalyticsVisible, setIsAnalyticsVisible] = useState(true);
  const [importMessage, setImportMessage] = useState('');

  const handleImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setImportMessage('Importing, please wait...');
    const formData = new FormData(event.currentTarget);
    const result = await handleBulkServiceImport(formData);
    setImportMessage(result.message);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Map':
        return <div className="h-full w-full"><MapComponent /></div>;
      case 'Trucks':
        return <TrucksPage />;
      case 'Trips':
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
    <div className="flex flex-col h-full bg-gray-100 text-black">
      <div className="bg-white border-b border-gray-300">
        <button
          onClick={() => setIsAnalyticsVisible(!isAnalyticsVisible)}
          className="w-full flex justify-between items-center p-2 bg-gray-200 hover:bg-gray-300 focus:outline-none"
          aria-expanded={isAnalyticsVisible}
        >
          <h2 className="text-lg font-bold text-black ml-2">At a Glance</h2>
          {isAnalyticsVisible ? <ChevronUpIcon className="h-6 w-6 text-gray-800" /> : <ChevronDownIcon className="h-6 w-6 text-gray-800" />}
        </button>
        {isAnalyticsVisible && <AnalyticsDashboard />}
      </div>

      <div className="p-4 bg-gray-100">
        <Card className="bg-white text-black">
          <CardHeader>
            <CardTitle>Bulk Import Services</CardTitle>
            <CardDescription>Upload the complete `Diesel Sheet.xlsx` file to import service history for all trucks at once.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleImport} className="flex items-center gap-4">
              <Input id="file-upload" name="file" type="file" accept=".xlsx" required className="flex-grow" />
              <Button type="submit" className="flex items-center gap-2"><ArrowUpTrayIcon className="h-5 w-5"/> Import Services</Button>
            </form>
            {importMessage && <p className="text-sm text-black mt-2">{importMessage}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-gray-200 bg-white">
          <nav className="flex space-x-1 sm:space-x-2 px-2 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`${
                  activeTab === tab.name
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-700 hover:text-gray-800 hover:border-gray-400'
                } whitespace-nowrap py-3 px-2 border-b-2 font-bold text-sm`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
