'use client';

import ClientAnalytics from '@/components/ClientAnalytics';
import ClientMap from '@/components/ClientMap'; // Corrected import

const ClientDashboardPage = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <ClientAnalytics />
      </div>
      <div className="bg-white rounded-lg shadow-md p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">
          Your Store Locations
        </h1>
        <div className="h-[60vh]">
          <ClientMap /> {/* Corrected component */}
        </div>
      </div>
    </div>
  );
};

export default ClientDashboardPage;
