'use client';

import WorkerAnalytics from '@/components/WorkerAnalytics';
import WorkerMap from '@/components/WorkerMap';

const WorkerDashboardPage = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <WorkerAnalytics />
      </div>
      <div className="bg-white rounded-lg shadow-md p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">
          Live Map
        </h1>
        <div className="h-[60vh]">
          <WorkerMap />
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboardPage;
