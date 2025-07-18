'use client';

import { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';

interface LocationMarker {
    id: string;
    position: { lat: number; lng: number; };
    title: string;
    type: 'truck' | 'client-store';
    details?: string;
}

const libraries: ('places')[] = ['places'];
const containerStyle = { width: '100%', height: '100%', minHeight: '400px' };
const defaultCenter = { lat: -25.4803, lng: 30.9622 };

const WorkerMap = () => {
  const supabase = createClient();
  const { user } = useAuth();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [markers, setMarkers] = useState<LocationMarker[]>([]);
  const [activeMarker, setActiveMarker] = useState<LocationMarker | null>(null);

  const storeIcon = useMemo(() => {
    if (!isLoaded) return undefined;
    return {
        path: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
        fillColor: '#8A2BE2', // Purple
        fillOpacity: 1,
        strokeWeight: 1,
        strokeColor: '#ffffff',
        scale: 1,
        anchor: new google.maps.Point(12, 12),
    };
  }, [isLoaded]);

  const truckIcon = useMemo(() => {
    if (!isLoaded) return undefined;
    return {
        path: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
        fillColor: '#d9534f', // Red
        fillOpacity: 1,
        strokeWeight: 1,
        strokeColor: '#ffffff',
        scale: 1.2,
        anchor: new google.maps.Point(12, 12),
    };
  }, [isLoaded]);

  useEffect(() => {
    const fetchWorkerMapData = async () => {
      if (!user) return;
      const { data, error } = await supabase.rpc('get_worker_map_data', {
        worker_profile_id: user.id
      });

      if (error) {
        console.error("Error fetching worker map data:", error);
        return;
      }

      if (data) {
        const allMarkers = [
          ...(data.truck ? [data.truck] : []),
          ...(data.stores || [])
        ].filter(marker => marker && marker.position && marker.position.lat && marker.position.lng);
        setMarkers(allMarkers);
      }
    };
    fetchWorkerMapData();
  }, [user, supabase]);

  const handleMarkerClick = (marker: LocationMarker) => setActiveMarker(marker);
  const getIconForMarker = (type: LocationMarker['type']) => type === 'truck' ? truckIcon : storeIcon;

  if (loadError) return <div>Error loading maps.</div>;
  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={12}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        {markers.map((marker) => (
            <Marker
                key={marker.id}
                position={marker.position}
                title={marker.title}
                icon={getIconForMarker(marker.type)}
                onClick={() => handleMarkerClick(marker)}
            />
        ))}
        {activeMarker && (
            <InfoWindow
                position={activeMarker.position}
                onCloseClick={() => setActiveMarker(null)}
            >
                <div className="p-1">
                    <h3 className="font-bold text-md text-gray-900">{activeMarker.title}</h3>
                    {activeMarker.details && <p className="text-gray-700">{activeMarker.details}</p>}
                </div>
            </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default WorkerMap;
