// src/app/(shell)/admin/trips/page.tsx
'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { type Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Camera, ArrowLeft, ArrowRight } from 'lucide-react';
import { Toaster, toast } from 'sonner';

// --- Type Definitions ---
type Truck = Pick<Database['public']['Tables']['trucks']['Row'], 'id' | 'license_plate'>;
type Trip = Database['public']['Tables']['truck_trips']['Row'];

const TRIPS_PER_PAGE = 15;

// --- Image Component with Loading State ---
const ImageWithLoader = ({ src, alt }: { src: string; alt: string }) => {
    const [isLoading, setIsLoading] = useState(true);
    return (
        <div className="relative w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
            {isLoading && <span className="text-gray-500 text-sm">Loading...</span>}
            <a href={src} target="_blank" rel="noopener noreferrer">
                <Image
                    src={src}
                    alt={alt}
                    width={200}
                    height={200}
                    className={`rounded-lg object-cover w-full h-full transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100 hover:opacity-80'}`}
                    onLoad={() => setIsLoading(false)}
                    onError={() => setIsLoading(false)}
                />
            </a>
        </div>
    );
};

// --- Main Page Component ---
const TripsPage = () => {
  const supabase = createClient();
  const searchParams = useSearchParams();
  
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [trips, setTrips] = useState<Trip[]>([]);
  
  const [loadingTrucks, setLoadingTrucks] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ label: string; url: string | null }[]>([]);

  useEffect(() => {
    const truckIdFromUrl = searchParams.get('truckId');
    if (truckIdFromUrl) {
      setSelectedTruckId(truckIdFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchTrucks = async () => {
      setLoadingTrucks(true);
      const { data, error } = await supabase
        .from('trucks')
        .select('id, license_plate')
        .order('license_plate', { ascending: true });

      if (error) toast.error(error.message);
      else setTrucks(data || []);
      setLoadingTrucks(false);
    };
    fetchTrucks();
  }, [supabase]);

  const fetchTrips = useCallback(async () => {
    if (!selectedTruckId) {
      setTrips([]);
      return;
    }
    setLoadingTrips(true);
    setCurrentPage(1);

    const { data, error } = await supabase
      .from('truck_trips')
      .select('*')
      .eq('truck_id', selectedTruckId)
      .order('trip_date', { ascending: false });

    if (error) toast.error(error.message);
    else setTrips((data as Trip[]) || []);
    setLoadingTrips(false);
  }, [selectedTruckId, supabase]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);
  
  const openImageViewer = (trip: Trip) => {
    setSelectedImages([
        { label: 'Vehicle Registration', url: trip.vehicle_reg_no_image_url },
        { label: 'Odometer Reading', url: trip.odometer_image_url },
        { label: 'Fuel Pump Reading', url: trip.fuel_pump_image_url },
    ].filter(img => img.url));
    setIsImageViewerOpen(true);
  };

  const paginatedTrips = useMemo(() => {
    const startIndex = (currentPage - 1) * TRIPS_PER_PAGE;
    return trips.slice(startIndex, startIndex + TRIPS_PER_PAGE);
  }, [trips, currentPage]);

  const totalPages = Math.ceil(trips.length / TRIPS_PER_PAGE);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
        <Toaster richColors position="top-center" />
      <h1 className="text-2xl font-bold text-gray-800">Trip & Refuel History</h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <label htmlFor="truck-select" className="block text-lg font-semibold text-gray-700 mb-2">Select a Truck</label>
        <select id="truck-select" value={selectedTruckId} onChange={(e) => setSelectedTruckId(e.target.value)} disabled={loadingTrucks} className="w-full max-w-md p-2 border rounded-md text-gray-900 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500">
          <option value="" disabled>{loadingTrucks ? 'Loading trucks...' : '--- Please select a truck ---'}</option>
          {trucks.map((truck) => (<option key={truck.id} value={truck.id}>{truck.license_plate}</option>))}
        </select>
      </div>

      {selectedTruckId && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">History for {trucks.find(t => t.id.toString() === selectedTruckId)?.license_plate}</h2>
          </div>
          {loadingTrips ? <p>Loading events...</p> : trips.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Odometer</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Distance/Hours</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Litres Filled</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Images</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedTrips.map((trip) => {
                      const hasImages = trip.vehicle_reg_no_image_url || trip.odometer_image_url || trip.fuel_pump_image_url;
                      return (
                      <tr key={trip.id}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">{formatDate(trip.trip_date)}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 max-w-xs">
                            <p className="font-semibold">{trip.worker_name || trip.route || 'N/A'}</p>
                            <p className="text-xs truncate" title={trip.notes || ''}>{trip.notes}</p>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{trip.opening_km?.toLocaleString() ?? '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{trip.total_km?.toLocaleString() ?? '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{trip.liters_filled?.toLocaleString() ?? '-'}</td>
                        <td className="px-4 py-4 text-center">
                          {hasImages ? (
                            <Button variant="outline" size="sm" onClick={() => openImageViewer(trip)}>
                              <Camera className="h-4 w-4 mr-2" /> View
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                  <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ArrowLeft className="h-4 w-4 mr-2" />Previous</Button>
                  <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                  <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next<ArrowRight className="h-4 w-4 ml-2" /></Button>
                </div>
              )}
            </>
          ) : <p className="text-gray-500 py-8 text-center">No trips or refuels found for this truck.</p>}
        </div>
      )}

        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
            <DialogContent className="max-w-4xl bg-white">
                <DialogHeader>
                    <DialogTitle>Refuel Images</DialogTitle>
                    <DialogDescription>Images uploaded for this refuel event.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto p-4">
                    {selectedImages.length > 0 ? (
                        selectedImages.map((img, index) => (
                            <div key={index}>
                                <h3 className="font-semibold text-lg mb-2">{img.label}</h3>
                                <ImageWithLoader src={img.url!} alt={img.label} />
                            </div>
                        ))
                    ) : <p className="text-gray-500 col-span-full text-center">No images were uploaded for this refuel.</p>}
                </div>
                <DialogFooter>
                    <Button onClick={() => setIsImageViewerOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
};

export default TripsPage;