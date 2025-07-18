'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation'; // Import the router

// --- Define types for our location data ---
interface LocationMarker {
    id: number | string;
    position: { lat: number; lng: number; };
    type: 'truck' | 'my-store' | 'client-store';
    title: string;
    details?: string;
    // Add IDs for navigation
    truckId?: number;
    myStoreId?: number;
    clientStoreId?: number;
}

// --- Define the libraries to be loaded by the Google Maps API ---
const libraries: ('places')[] = ['places'];

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '500px'
};

const defaultCenter = {
  lat: -25.4803, // Default to Nelspruit (Mbombela), South Africa
  lng: 30.9622
};

const MapComponent = () => {
  const supabase = createClient();
  const router = useRouter(); // Initialize the router
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [markers, setMarkers] = useState<LocationMarker[]>([]);
  const [activeMarker, setActiveMarker] = useState<LocationMarker | null>(null);

  // --- Custom Marker Icons (SVG Paths) ---
  const truckIcon = useMemo(() => {
    if (!isLoaded) return undefined;
    return {
        path: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
        fillColor: '#d9534f', // Red
        fillOpacity: 1,
        strokeWeight: 1,
        strokeColor: '#ffffff',
        rotation: 0,
        scale: 1.2,
        anchor: new google.maps.Point(12, 12),
    };
  }, [isLoaded]);

  const storeIcon = useMemo(() => {
    if (!isLoaded) return undefined;
    return {
        path: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
        fillColor: '#f0ad4e', // Orange
        fillOpacity: 1,
        strokeWeight: 1,
        strokeColor: '#ffffff',
        scale: 1,
        anchor: new google.maps.Point(12, 12),
    };
  }, [isLoaded]);

  const clientStoreIcon = useMemo(() => {
    if (!isLoaded) return undefined;
    return {
        ...storeIcon!,
        fillColor: '#8A2BE2', // Purple
    };
  }, [isLoaded, storeIcon]);


  // --- Fetch all location data from Supabase using the RPC function ---
  useEffect(() => {
    const fetchAllLocations = async () => {
      const { data, error } = await supabase.rpc('get_all_map_markers');

      if (error) {
        console.error("Error fetching map markers:", error);
        return;
      }

      if (data) {
        const allMarkers: LocationMarker[] = [
            ...(data.trucks || []),
            ...(data.myStores || []),
            ...(data.clientStores || [])
        ].filter(marker => marker.position && marker.position.lat && marker.position.lng);
        
        setMarkers(allMarkers);
      }
    };

    fetchAllLocations();
  }, [supabase]);


  const onMapLoad = useCallback(() => {
    // We can use the map instance here if needed in the future
  }, []);

  const onUnmount = useCallback(() => {
    // Cleanup logic if needed
  }, []);

  const handleMarkerClick = (marker: LocationMarker) => {
    setActiveMarker(marker);
  };

  const handleViewDetails = () => {
    if (!activeMarker) return;

    let path = '';
    if (activeMarker.type === 'truck' && activeMarker.truckId) {
        // For trucks, we can navigate to the main trucks page
        path = '/admin/trucks';
    } else if (activeMarker.type === 'my-store' && activeMarker.myStoreId) {
        // For "My Stores", navigate to the main page
        path = '/admin/my-shops';
    } else if (activeMarker.type === 'client-store' && activeMarker.clientStoreId) {
        // For client stores, navigate to the specific client's detail page
        path = `/admin/clients/${activeMarker.clientStoreId}`;
    }

    if (path) {
        router.push(path);
    }
  };

  const getIconForMarker = useCallback((type: LocationMarker['type']) => {
    switch (type) {
      case 'truck': return truckIcon;
      case 'my-store': return storeIcon;
      case 'client-store': return clientStoreIcon;
      default: return undefined;
    }
  }, [truckIcon, storeIcon, clientStoreIcon]);

  if (loadError) {
    return <div>Error loading maps. Please check your API key.</div>;
  }

  if (!isLoaded) {
    return <div>Loading Map...</div>;
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={12}
        onLoad={onMapLoad}
        onUnmount={onUnmount}
        options={{
            disableDefaultUI: true,
            zoomControl: true,
        }}
      >
        {/* Render all fetched markers */}
        {markers.map((marker) => (
            <Marker
                key={marker.id}
                position={marker.position}
                title={marker.title}
                icon={getIconForMarker(marker.type)}
                onClick={() => handleMarkerClick(marker)}
            />
        ))}

        {/* Show InfoWindow for the active marker */}
        {activeMarker && (
            <InfoWindow
                position={activeMarker.position}
                onCloseClick={() => setActiveMarker(null)}
            >
                <div className="p-2">
                    <h3 className="font-bold text-lg text-gray-900">{activeMarker.title}</h3>
                    {activeMarker.details && <p className="text-gray-700 mb-2">{activeMarker.details}</p>}
                    <button
                        onClick={handleViewDetails}
                        className="w-full bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 text-sm font-semibold"
                    >
                        View Details
                    </button>
                </div>
            </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default MapComponent;
