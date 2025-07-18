'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BuildingStorefrontIcon, TruckIcon } from '@heroicons/react/24/outline';

interface Metric {
  name: string;
  value: number;
  icon: React.ElementType;
}

const WorkerAnalytics = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchWorkerData = async () => {
      setLoading(true);

      const { count: storeCount } = await supabase
        .from('client_stores')
        .select('id', { count: 'exact', head: true });

      const { count: activeTrucks } = await supabase
        .from('trucks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');
        
      setMetrics([
        { name: 'Active Trucks', value: activeTrucks ?? 0, icon: TruckIcon },
        { name: 'Total Client Stores', value: storeCount ?? 0, icon: BuildingStorefrontIcon },
      ]);
      
      setLoading(false);
    };

    fetchWorkerData();
  }, [supabase]);

  if (loading) {
    return <div className="p-4 text-center text-gray-600">Loading analytics...</div>;
  }

  return (
    <div className="p-4 bg-gray-100 h-full">
      <h2 className="text-xl font-bold text-gray-800 mb-3">Live Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div key={metric.name} className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
            <metric.icon className="h-8 w-8 text-indigo-500 mb-2" />
            <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
            <p className="text-sm font-medium text-gray-500 text-center">{metric.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkerAnalytics;
