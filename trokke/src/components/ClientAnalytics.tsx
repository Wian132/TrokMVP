'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';

interface Metric {
  name: string;
  value: number;
  icon: React.ElementType;
}

const ClientAnalytics = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    const fetchClientData = async () => {
      if (!user) return;
      setLoading(true);

      // First, get the client's integer ID from the 'clients' table
      const { data: clientRecord } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (clientRecord) {
        // Now, count the stores associated with that client ID
        const { count: storeCount } = await supabase
          .from('client_stores')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientRecord.id);

        setMetrics([
          { name: 'Your Stores', value: storeCount ?? 0, icon: BuildingStorefrontIcon },
        ]);
      }
      
      setLoading(false);
    };

    fetchClientData();
  }, [user, supabase]);

  if (loading) {
    return <div className="p-4 text-center text-gray-600">Loading analytics...</div>;
  }

  return (
    <div className="p-4 bg-gray-100 h-full">
      <h2 className="text-xl font-bold text-gray-800 mb-3">Your Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div key={metric.name} className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
            <metric.icon className="h-8 w-8 text-indigo-500 mb-2" />
            <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
            <p className="text-sm font-medium text-gray-500">{metric.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientAnalytics;
