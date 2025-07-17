'use client'

import { useEffect, useState } from 'react';
import {
  GoogleMap,
  MarkerF,
  InfoWindowF,
  useJsApiLoader,
} from '@react-google-maps/api';
import supabase from '@/lib/supabaseClient';

interface Truck {
  id: number;
  license_plate: string;
  latitude: number;
  longitude: number;
}

interface Store {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export default function Dashboard() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [businessStores, setBusinessStores] = useState<Store[]>([]);
  const [clientStores, setClientStores] = useState<Store[]>([]);
  const [selected, setSelected] = useState<{ type: string; name: string } | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: trucksData } = await supabase
        .from('trucks')
        .select('id, license_plate, latitude, longitude');

      const { data: businessData } = await supabase
        .from('business_stores')
        .select('id, name, latitude, longitude');

      const { data: clientData } = await supabase
        .from('client_stores')
        .select('id, name, latitude, longitude');

      setTrucks(trucksData || []);
      setBusinessStores(businessData || []);
      setClientStores(clientData || []);
    };

    fetchData();
  }, []);

  const handleMarkerClick = (type: string, name: string, position: { lat: number; lng: number }) => {
    setSelected({ type, name });
    setSelectedPosition(position);
  };

  const mapCenter = { lat: trucks[0]?.latitude || 0, lng: trucks[0]?.longitude || 0 };

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className="w-full h-[80vh]">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          zoom={8}
          center={mapCenter}
        >
          {trucks.map((truck) => (
            <MarkerF
              key={`truck-${truck.id}`}
              position={{ lat: truck.latitude, lng: truck.longitude }}
              icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }}
              onClick={() =>
                handleMarkerClick('Truck', truck.license_plate, {
                  lat: truck.latitude,
                  lng: truck.longitude,
                })
              }
            />
          ))}

          {businessStores.map((store) => (
            <MarkerF
              key={`business-${store.id}`}
              position={{ lat: store.latitude, lng: store.longitude }}
              icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' }}
              onClick={() =>
                handleMarkerClick('Business Store', store.name, {
                  lat: store.latitude,
                  lng: store.longitude,
                })
              }
            />
          ))}

          {clientStores.map((store) => (
            <MarkerF
              key={`client-${store.id}`}
              position={{ lat: store.latitude, lng: store.longitude }}
              icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png' }}
              onClick={() =>
                handleMarkerClick('Client Store', store.name, {
                  lat: store.latitude,
                  lng: store.longitude,
                })
              }
            />
          ))}

          {selected && selectedPosition && (
            <InfoWindowF position={selectedPosition} onCloseClick={() => setSelected(null)}>
              <div>{selected.type}: {selected.name}</div>
            </InfoWindowF>
          )}
        </GoogleMap>
    </div>
  );
}
