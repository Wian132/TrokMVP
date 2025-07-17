"use client";

const ClientDashboardPage = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="bg-[var(--color-panel-background)] rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">
          Map View
        </h1>
        <div className="text-center py-12">
          <p className="text-gray-600">The map will be displayed here.</p>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboardPage;
