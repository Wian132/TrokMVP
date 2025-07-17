'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Autocomplete, Marker } from '@react-google-maps/api';

// Define the libraries to be loaded by the Google Maps API
const libraries: ('places')[] = ['places'];

// Define the props for the Map component
interface MapProps {
    markers?: { lat: number; lng: number; }[];
}

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '500px'
};

const defaultCenter = {
  lat: -25.4803, // Default to Nelspruit (Mbombela), South Africa
  lng: 30.9622
};

const MapComponent = ({ markers = [] }: MapProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; } | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Get user's current location when the component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(pos);
          if (map) {
            map.panTo(pos);
            map.setZoom(15);
          }
        },
        () => {
          console.error("Error: The Geolocation service failed.");
        }
      );
    } else {
      console.error("Error: Your browser doesn't support geolocation.");
    }
  }, [map]);


  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current && map) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const newCenter = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        map.panTo(newCenter);
        map.setZoom(15);
      }
    }
  };

  if (loadError) {
    return <div>Error loading maps. Please check your API key.</div>;
  }

  if (!isLoaded) {
    return <div>Loading Map...</div>;
  }

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
        <Autocomplete
          onLoad={onAutocompleteLoad}
          onPlaceChanged={onPlaceChanged}
        >
          {/* Added bg-white and text-black for visibility */}
          <input
            type="text"
            placeholder="Search for a location"
            className="w-full p-3 border rounded-lg shadow-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-black"
          />
        </Autocomplete>
      </div>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentLocation || defaultCenter}
        zoom={currentLocation ? 15 : 12} // Adjusted default zoom for a city view
        onLoad={onMapLoad}
        onUnmount={onUnmount}
        options={{
            disableDefaultUI: true,
            zoomControl: true,
        }}
      >
        {/* Render markers passed via props */}
        {markers.map((marker, index) => (
            <Marker key={`prop-marker-${index}`} position={marker} />
        ))}

        {/* Render a distinct marker for the user's current location */}
        {currentLocation && (
            <Marker
                position={currentLocation}
                title="Your Location"
                icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#4285F4",
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: "white",
                }}
            />
        )}
      </GoogleMap>
    </div>
  );
};

export default MapComponent;
