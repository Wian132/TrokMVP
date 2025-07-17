"use client";
import { supabase } from "../../../../../lib/supabaseClient";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

// Interface for the store data from the 'client_stores' table
interface Store {
  id: number;
  name: string;
  address: string | null;
}

const libraries: ('places')[] = ['places'];

const ClientStoresPage = () => {
  const params = useParams();
  const profileId = params.id as string;

  const [stores, setStores] = useState<Store[]>([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for adding a new site
  const [newSiteName, setNewSiteName] = useState('');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [newSiteLocation, setNewSiteLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const fetchClientData = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    try {
      // Step 1: Fetch client's profile and integer ID
      const { data: clientRecord, error: clientError } = await supabase
        .from("clients")
        .select(`
          id,
          profiles ( full_name )
        `)
        .eq("profile_id", profileId)
        .single();
      
      if (clientError) throw clientError;
      
      const clientIntegerId = clientRecord.id;
      
      // The full_name is nested. Since the relationship is one-to-one (profile_id is unique),
      // Supabase returns `profiles` as an object. We cast it via 'unknown' to resolve a strict
      // TypeScript error where the linter incorrectly infers the type.
      const profileData = clientRecord.profiles as unknown as { full_name: string } | null;
      const clientFullName = profileData?.full_name;
      setClientName(clientFullName || "Client");

      // Step 2: Fetch the client's stores
      const { data: storesData, error: storesError } = await supabase
        .from("client_stores")
        .select("id, name, address")
        .eq("client_id", clientIntegerId);

      if (storesError) throw storesError;
      setStores(storesData || []);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const handleAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location && place.formatted_address) {
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

    // Get the client's integer ID again
    const { data: clientRecord } = await supabase.from("clients").select("id").eq("profile_id", profileId).single();
    if (!clientRecord) {
        setError("Could not find client to add site to.");
        return;
    }

    const { error } = await supabase
      .from('client_stores')
      .insert([{
        client_id: clientRecord.id,
        name: newSiteName,
        address: newSiteLocation.address,
        latitude: newSiteLocation.lat,
        longitude: newSiteLocation.lng,
      }]);

    if (error) {
      setError(error.message);
    } else {
      // Reset form and refresh data
      setNewSiteName('');
      setNewSiteLocation(null);
      const input = document.getElementById('autocomplete-input-site') as HTMLInputElement;
      if (input) input.value = '';
      fetchClientData(); // Refetch stores to show the new one
    }
  };

  if (loading || !isLoaded) {
    return <div className="p-6 font-bold text-gray-900">Loading Client Data...</div>;
  }
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (loadError) return <div className="p-6 text-red-500">Error loading maps.</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-4">
        {clientName}&apos;s Stores
      </h1>

      {/* Form to add a new site */}
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
};

export default ClientStoresPage;
