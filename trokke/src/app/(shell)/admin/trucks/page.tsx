'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { type Database } from '@/types/supabase';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

type TruckWithWorker = Database['public']['Tables']['trucks']['Row'] & {
  workers: {
    profiles: {
      full_name: string | null;
    } | null;
  } | null;
};

export default function TrucksPage() {
  const supabase = createClient();
  const [trucks, setTrucks] = useState<TruckWithWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // State for form data
  const [newTruck, setNewTruck] = useState({
    license_plate: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
  });
  const [editingTruck, setEditingTruck] = useState<TruckWithWorker | null>(null);
  const [deletingTruck, setDeletingTruck] = useState<TruckWithWorker | null>(null);

  const fetchTrucks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trucks")
      .select(`
        *,
        workers (
          profiles (
            full_name
          )
        )
      `);
      
    if (error) {
      setError(error.message);
    } else {
      setTrucks(data as TruckWithWorker[] || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTrucks();
  }, [fetchTrucks]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Assert that the input's name is a key of our state objects for type safety
    const key = name as keyof typeof newTruck;
    const parsedValue = key === 'year' ? parseInt(value, 10) || new Date().getFullYear() : value;
    
    if (isEditModalOpen && editingTruck) {
      // Handle updates for the truck being edited
      setEditingTruck(prev => {
        if (!prev) return null; // Should not happen if modal is open, but good practice
        return {
          ...prev,
          [key]: parsedValue,
        };
      });
    } else {
      // Handle updates for the new truck form
      setNewTruck((prev) => ({
        ...prev,
        [key]: parsedValue,
      }));
    }
  };

  const handleCreateTruck = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const { error: insertError } = await supabase
      .from("trucks")
      .insert({
        license_plate: newTruck.license_plate,
        make: newTruck.make,
        model: newTruck.model,
        year: newTruck.year,
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      await fetchTrucks();
      setNewTruck({ license_plate: "", make: "", model: "", year: new Date().getFullYear() });
    }
  };

  const handleUpdateTruck = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTruck) return;

    const { error: updateError } = await supabase
        .from('trucks')
        .update({
            license_plate: editingTruck.license_plate,
            make: editingTruck.make,
            model: editingTruck.model,
            year: editingTruck.year,
        })
        .eq('id', editingTruck.id);

    if (updateError) {
        setError(updateError.message);
    } else {
        await fetchTrucks();
        closeEditModal();
    }
  };

  const handleDeleteTruck = async () => {
    if (!deletingTruck) return;

    // If the truck is assigned, you might want to unassign it first.
    // This example will delete it regardless.
    const { error: deleteError } = await supabase
        .from('trucks')
        .delete()
        .eq('id', deletingTruck.id);

    if (deleteError) {
        setError(deleteError.message);
    } else {
        await fetchTrucks();
        closeDeleteModal();
    }
  };

  // --- Modal Control Functions ---
  const openEditModal = (truck: TruckWithWorker) => {
    setEditingTruck(truck);
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTruck(null);
  };

  const openDeleteModal = (truck: TruckWithWorker) => {
    setDeletingTruck(truck);
    setIsDeleteModalOpen(true);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingTruck(null);
  };


  if (loading) return <div className="p-6 font-bold text-center">Loading trucks...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Manage Trucks</h1>
      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add a New Truck</h2>
        <form onSubmit={handleCreateTruck} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" name="license_plate" placeholder="License Plate" value={newTruck.license_plate} onChange={handleInputChange} required className="p-2 border rounded text-gray-900 placeholder-gray-600"/>
          <input type="text" name="make" placeholder="Make" value={newTruck.make} onChange={handleInputChange} required className="p-2 border rounded text-gray-900 placeholder-gray-600"/>
          <input type="text" name="model" placeholder="Model" value={newTruck.model} onChange={handleInputChange} required className="p-2 border rounded text-gray-900 placeholder-gray-600"/>
          <input type="number" name="year" placeholder="Year" value={newTruck.year} onChange={handleInputChange} required className="p-2 border rounded text-gray-900 placeholder-gray-600"/>
          <button type="submit" className="md:col-span-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Create Truck
          </button>
        </form>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Current Fleet</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">License Plate</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Make</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Assigned Worker</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trucks.length > 0 ? (
                trucks.map((truck) => (
                  <tr key={truck.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{truck.license_plate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{truck.make}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{truck.model}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{truck.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 capitalize">{truck.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{truck.workers?.profiles?.full_name || 'Unassigned'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button onClick={() => openEditModal(truck)} className="p-2 text-indigo-600 hover:text-indigo-900 rounded-full hover:bg-indigo-100">
                            <PencilIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => openDeleteModal(truck)} className="p-2 text-red-600 hover:text-red-900 rounded-full hover:bg-red-100">
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">No trucks found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modals --- */}
      {isEditModalOpen && editingTruck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Truck</h2>
            <form onSubmit={handleUpdateTruck} className="space-y-4">
              <input type="text" name="license_plate" placeholder="License Plate" value={editingTruck.license_plate} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <input type="text" name="make" placeholder="Make" value={editingTruck.make || ''} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <input type="text" name="model" placeholder="Model" value={editingTruck.model || ''} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <input type="number" name="year" placeholder="Year" value={editingTruck.year || new Date().getFullYear()} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={closeEditModal} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && deletingTruck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Confirm Deletion</h2>
            <p className="text-gray-700">Are you sure you want to delete the truck with license plate <span className="font-bold text-gray-900">{deletingTruck.license_plate}</span>? This action is irreversible.</p>
            <div className="flex justify-end space-x-4 mt-6">
                <button type="button" onClick={closeDeleteModal} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
                <button onClick={handleDeleteTruck} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
