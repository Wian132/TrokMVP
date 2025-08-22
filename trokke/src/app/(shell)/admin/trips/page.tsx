// src/app/(shell)/admin/trips/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { type Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';

// --- Type Definitions ---
type Truck = Pick<Database['public']['Tables']['trucks']['Row'], 'id' | 'license_plate'>;
type Trip = Database['public']['Tables']['truck_trips']['Row'];
type TripInsert = Database['public']['Tables']['truck_trips']['Insert'];
type TripUpdate = Database['public']['Tables']['truck_trips']['Update'];

const TRIPS_PER_PAGE = 15;

// --- Reusable Modal for Adding/Editing Trips ---
interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tripData: TripInsert | TripUpdate) => void;
  trip: Trip | null;
  truckId: string;
}

function TripModal({ isOpen, onClose, onSave, trip, truckId }: TripModalProps) {
  const [formData, setFormData] = useState<Partial<Trip>>({});

  useEffect(() => {
    if (isOpen) {
      if (trip) {
        setFormData({
          ...trip,
          trip_date: trip.trip_date ? trip.trip_date.split('T')[0] : '',
        });
      } else {
        setFormData({
          trip_date: new Date().toISOString().split('T')[0],
          worker_name: '',
          opening_km: null,
          total_km: null,
          liters_filled: null,
          notes: '',
        });
      }
    }
  }, [trip, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      opening_km: formData.opening_km ? Number(formData.opening_km) : null,
      total_km: formData.total_km ? Number(formData.total_km) : null,
      liters_filled: formData.liters_filled ? Number(formData.liters_filled) : null,
      truck_id: parseInt(truckId, 10),
    };
    onSave(dataToSave as TripUpdate);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle>{trip ? 'Edit Trip' : 'Add New Trip'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="trip_date">Trip Date</Label>
            <Input id="trip_date" name="trip_date" type="date" value={formData.trip_date || ''} onChange={handleChange} required className="bg-white" />
          </div>
          <div>
            <Label htmlFor="worker_name">Driver Name</Label>
            <Input id="worker_name" name="worker_name" value={formData.worker_name || ''} onChange={handleChange} className="bg-white" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="opening_km">Opening KM</Label>
              <Input id="opening_km" name="opening_km" type="number" step="any" value={formData.opening_km || ''} onChange={handleChange} className="bg-white" />
            </div>
            <div>
              <Label htmlFor="total_km">Total KM</Label>
              <Input id="total_km" name="total_km" type="number" step="any" value={formData.total_km || ''} onChange={handleChange} className="bg-white" />
            </div>
            <div>
              <Label htmlFor="liters_filled">Litres Filled</Label>
              <Input id="liters_filled" name="liters_filled" type="number" step="any" value={formData.liters_filled || ''} onChange={handleChange} className="bg-white" />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} className="bg-white" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{trip ? 'Save Changes' : 'Create Trip'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page Component ---
const TripsPage = () => {
  const supabase = createClient();
  
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [trips, setTrips] = useState<Trip[]>([]);
  
  const [loadingTrucks, setLoadingTrucks] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  useEffect(() => {
    const fetchTrucks = async () => {
      setLoadingTrucks(true);
      const { data, error } = await supabase
        .from('trucks')
        .select('id, license_plate')
        .order('license_plate', { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setTrucks(data || []);
      }
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
    setError(null);
    setCurrentPage(1);

    const { data, error } = await supabase
      .from('truck_trips')
      .select('*')
      .eq('truck_id', selectedTruckId)
      .order('trip_date', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setTrips(data || []);
    }
    setLoadingTrips(false);
  }, [selectedTruckId, supabase]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleSaveTrip = async (tripData: TripInsert | TripUpdate) => {
    const isUpdating = 'id' in tripData && tripData.id;

    const query = isUpdating
      ? supabase.from('truck_trips').update(tripData).eq('id', tripData.id)
      : supabase.from('truck_trips').insert({ ...tripData, truck_id: parseInt(selectedTruckId) });

    const { data, error } = await query.select().single();
    
    if (error) {
        setError(error.message);
    } else if (data) {
        fetchTrips(); // Refetch all trips to ensure sorting and data is fresh
        handleCloseModal();
    }
  };

  const handleDeleteTrip = async () => {
    if (!tripToDelete) return;
    const { error } = await supabase.from('truck_trips').delete().eq('id', tripToDelete.id);
    
    if (error) {
      setError(error.message);
    } else {
      setTrips(trips.filter(t => t.id !== tripToDelete.id));
    }
    setTripToDelete(null);
  };

  const handleOpenAddModal = () => {
    setEditingTrip(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (trip: Trip) => {
    setEditingTrip(trip);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTrip(null);
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
      <h1 className="text-2xl font-bold text-gray-800">View & Manage Truck Trips</h1>
      
      {error && <div className="my-4 p-3 rounded-md text-sm bg-red-100 text-red-800">{error}</div>}

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
              <h2 className="text-xl font-semibold text-gray-700">Trip History for {trucks.find(t => t.id.toString() === selectedTruckId)?.license_plate}</h2>
              <Button onClick={handleOpenAddModal} className="bg-indigo-600 hover:bg-indigo-700">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Trip
              </Button>
          </div>
          {loadingTrips ? <p>Loading trips...</p> : trips.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Opening Km</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Km</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Litres</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedTrips.map((trip) => (
                      <tr key={trip.id}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">{formatDate(trip.trip_date)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{trip.worker_name || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{trip.opening_km?.toLocaleString() ?? '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{trip.total_km?.toLocaleString() ?? '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{trip.liters_filled?.toLocaleString() ?? '-'}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 truncate max-w-xs">{trip.notes || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(trip)}><Pencil className="h-4 w-4 text-green-600" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setTripToDelete(trip)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md disabled:opacity-50">Previous</button>
                  <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md disabled:opacity-50">Next</button>
                </div>
              )}
            </>
          ) : <p className="text-gray-500">No trips found for this truck.</p>}
        </div>
      )}
      
      <TripModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveTrip} trip={editingTrip} truckId={selectedTruckId} />
      
      <Dialog open={!!tripToDelete} onOpenChange={() => setTripToDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>Are you sure you want to delete this trip record? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTripToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTrip}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TripsPage;