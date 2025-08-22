// src/app/(shell)/admin/clients/[id]/ClientStoresPageClient.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { type Database } from '@/types/supabase';

type ClientStore = Database['public']['Tables']['client_stores']['Row'];
type ClientRecordWithProfile = { id: number, profiles: { full_name: string | null } | null };

const libraries: ('places')[] = ['places'];

export default function ClientStoresPageClient() {
  const supabase = createClient();
  const params = useParams();
  const clientId = params.id as string;

  const [stores, setStores] = useState<ClientStore[]>([]);
  const [clientName, setClientName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newSiteName, setNewSiteName] = useState('');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [newSiteLocation, setNewSiteLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);

    const clientIdNum = parseInt(clientId, 10);
    if (isNaN(clientIdNum)) {
      setError("Invalid Client ID.");
      setLoading(false);
      return;
    }

    try {
      // Fetch client name
      const { data: clientRecord, error: clientError } = await supabase
        .from("clients")
        .select(`id, profiles ( full_name )`)
        .eq("id", clientIdNum)
        .single();
      
      if (clientError) throw clientError;

      const record = clientRecord as unknown as ClientRecordWithProfile;
      setClientName(record.profiles?.full_name || "Client");

      // Fetch client stores
      const { data: storesData, error: storesError } = await supabase
        .from("client_stores")
        .select("*")
        .eq("client_id", clientIdNum);

      if (storesError) throw storesError;
      
      setStores(storesData || []);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [clientId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry?.location && place.formatted_address) {
        setNewSiteLocation({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address,
        });
      }
    }
  };

  const handleCreateSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newSiteName || !newSiteLocation) {
      setError('Please provide a site name and select a location.');
      return;
    }
    setError(null);

    const locationString = `POINT(${newSiteLocation.lng} ${newSiteLocation.lat})`;

    const { error: insertError } = await supabase
      .from('client_stores')
      .insert({
        client_id: parseInt(clientId, 10),
        name: newSiteName,
        address: newSiteLocation.address,
        location: locationString,
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      setNewSiteName('');
      setNewSiteLocation(null);
      const input = document.getElementById('autocomplete-input-site') as HTMLInputElement;
      if (input) input.value = '';
      await fetchData(); // Re-fetch all data after creating a new one
    }
  };

  if (loading) return <div className="p-6 font-bold text-gray-900">Loading Client Data...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (loadError) return <div className="p-6 text-red-500">Error loading maps.</div>;
  if (!isLoaded) return <div className="p-6 font-bold text-gray-900">Loading Map...</div>;
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-4">{clientName}&apos;s Stores</h1>
      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Site</h2>
        <form onSubmit={handleCreateSite} className="space-y-4">
          <input type="text" placeholder="Site Name" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} required className="w-full p-2 border rounded text-gray-900 placeholder-gray-600 font-semibold"/>
          <Autocomplete onLoad={handleAutocompleteLoad} onPlaceChanged={handlePlaceChanged}>
            <input id="autocomplete-input-site" type="text" placeholder="Enter a location" className="w-full p-2 border rounded text-gray-900 placeholder-gray-600 font-semibold"/>
          </Autocomplete>
          <button type="submit" className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-bold">Add Site</button>
        </form>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Current Sites</h2>
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
              <p className="text-gray-500 font-bold">No stores found for this client.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}