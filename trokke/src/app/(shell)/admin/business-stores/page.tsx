'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/server';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

// Define the type for a Store
interface Store {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// Define the libraries to be loaded by the Google Maps API
const libraries: ('places')[] = ['places'];

const BusinessStoresPage = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for creating a new store
  const [newStoreName, setNewStoreName] = useState('');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [newStoreLocation, setNewStoreLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  // Load the Google Maps script using the useJsApiLoader hook
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('business_stores').select('*');

      if (error) {
        setError(error.message);
        console.error('Error fetching stores:', error);
      } else {
        setStores(data || []);
      }
      setLoading(false);
    };

    fetchStores();
  }, []);

  const handleAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        setNewStoreLocation({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address || '',
        });
      }
    }
  };

  const handleCreateStore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newStoreName || !newStoreLocation) {
      setError('Please provide a store name and select an address.');
      return;
    }
    setError(null);

    const { data, error } = await supabase
      .from('business_stores')
      .insert([{
        name: newStoreName,
        address: newStoreLocation.address,
        lat: newStoreLocation.lat,
        lng: newStoreLocation.lng,
      }])
      .select();

    if (error) {
      setError(error.message);
      console.error('Error creating store:', error);
    } else if (data) {
      setStores((prev) => [...prev, ...data]);
      // Reset form
      setNewStoreName('');
      setNewStoreLocation(null);
      const input = document.getElementById('autocomplete-input') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  // Display an error message if the Google Maps script fails to load
  if (loadError) {
    return <div className="p-6">Error loading maps. Please check your API key and try again.</div>;
  }

  // Display a loading indicator while the API or data is loading
  if (!isLoaded || loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">
        Manage Business Stores
      </h1>

      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add a New Store</h2>
        <form onSubmit={handleCreateStore} className="space-y-4">
          <input
            type="text"
            placeholder="Store Name"
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            required
            className="w-full p-2 border rounded text-gray-900 placeholder-gray-600"
          />
          <Autocomplete
            onLoad={handleAutocompleteLoad}
            onPlaceChanged={handlePlaceChanged}
          >
            <input
              id="autocomplete-input"
              type="text"
              placeholder="Enter a location"
              className="w-full p-2 border rounded text-gray-900 placeholder-gray-600"
            />
          </Autocomplete>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Create Store
          </button>
        </form>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Our Stores</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Address</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stores.length > 0 ? (
                stores.map((store) => (
                  <tr key={store.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{store.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{store.address}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                    No stores found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BusinessStoresPage;
