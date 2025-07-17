'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

interface Store {
  id: number;
  name: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
}

export default function BusinessStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const fetchStores = async () => {
    const { data } = await supabase.from('business_stores').select('*').order('id');
    if (data) setStores(data as Store[]);
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handlePlaceChanged = () => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    setAddress(place.formatted_address || '');
    if (place.geometry) {
      setLat(place.geometry.location?.lat() || null);
      setLng(place.geometry.location?.lng() || null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('business_stores').insert({ name, address, latitude: lat, longitude: lng });
    setName('');
    setAddress('');
    setLat(null);
    setLng(null);
    fetchStores();
  };

  const handleDelete = async (id: number) => {
    await supabase.from('business_stores').delete().eq('id', id);
    fetchStores();
  };

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const editAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: ['places'],
  });

  if (!isLoaded) return <div>Loading...</div>;

  const handleEditPlace = () => {
    if (!editAutoRef.current) return;
    const place = editAutoRef.current.getPlace();
    setEditAddress(place.formatted_address || '');
    if (place.geometry) {
      setEditLat(place.geometry.location?.lat() || null);
      setEditLng(place.geometry.location?.lng() || null);
    }
  };

  const startEdit = (store: Store) => {
    setEditingId(store.id);
    setEditName(store.name);
    setEditAddress(store.address);
    setEditLat(store.latitude || null);
    setEditLng(store.longitude || null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditAddress('');
    setEditLat(null);
    setEditLng(null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId === null) return;
    await supabase
      .from('business_stores')
      .update({ name: editName, address: editAddress, latitude: editLat, longitude: editLng })
      .eq('id', editingId);
    cancelEdit();
    fetchStores();
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Business Stores</h1>

      <form onSubmit={handleCreate} className="space-y-2">
          <div>
            <label className="block">Name</label>
            <input
              className="border p-2 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block">Address</label>
            <Autocomplete onLoad={(a) => (autocompleteRef.current = a)} onPlaceChanged={handlePlaceChanged}>
              <input
                className="border p-2 w-full"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </Autocomplete>
          </div>
          <input type="hidden" value={lat ?? ''} name="latitude" />
          <input type="hidden" value={lng ?? ''} name="longitude" />
          <button className="bg-blue-600 text-white px-4 py-2" type="submit">Add Store</button>
        </form>

      <ul className="space-y-4">
        {stores.map((store) => (
          <li key={store.id} className="border p-4">
            {editingId === store.id ? (
                <form onSubmit={saveEdit} className="space-y-2">
                  <div>
                    <label className="block">Name</label>
                    <input
                      className="border p-2 w-full"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block">Address</label>
                    <Autocomplete onLoad={(a) => (editAutoRef.current = a)} onPlaceChanged={handleEditPlace}>
                      <input
                        className="border p-2 w-full"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        required
                      />
                    </Autocomplete>
                  </div>
                  <input type="hidden" value={editLat ?? ''} />
                  <input type="hidden" value={editLng ?? ''} />
                  <div className="space-x-2">
                    <button className="bg-green-600 text-white px-3 py-1" type="submit">Save</button>
                    <button className="bg-gray-400 text-white px-3 py-1" type="button" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </form>
            ) : (
              <div className="space-y-2">
                <p className="font-semibold">{store.name}</p>
                <p>{store.address}</p>
                <div className="space-x-2">
                  <button className="bg-yellow-500 text-white px-3 py-1" onClick={() => startEdit(store)}>
                    Edit
                  </button>
                  <button className="bg-red-600 text-white px-3 py-1" onClick={() => handleDelete(store.id)}>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

