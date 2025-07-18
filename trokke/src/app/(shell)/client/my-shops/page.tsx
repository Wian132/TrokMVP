'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { type Database } from '@/types/supabase';

type ClientStore = Database['public']['Tables']['client_stores']['Row'];

export default function MyShopsPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [stores, setStores] = useState<ClientStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientStores = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (clientRecord) {
      const { data: storesData, error: storesError } = await supabase
        .from("client_stores")
        .select("*")
        .eq("client_id", clientRecord.id);

      if (storesError) {
        setError(storesError.message);
      } else {
        setStores(storesData || []);
      }
    }
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchClientStores();
  }, [fetchClientStores]);

  if (loading) return <div className="p-6 font-bold">Loading Your Shops...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Current Shops</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.length > 0 ? (
            stores.map((store) => (
              <div key={store.id} className="border bg-gray-50 p-4 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold text-gray-900">{store.name}</h3>
                <p className="text-gray-700 mt-2 font-semibold">{store.address || "No address provided"}</p>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 font-bold">You have not been assigned any shops yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
