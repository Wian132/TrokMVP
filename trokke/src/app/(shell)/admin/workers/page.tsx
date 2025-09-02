'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { type Database } from '@/types/supabase';
import { UserPlusIcon, PencilIcon, TrashIcon, TruckIcon } from '@heroicons/react/24/outline';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- Type Definitions ---
type WorkerWithDetails = Database['public']['Tables']['workers']['Row'] & {
  profile: (Database['public']['Tables']['profiles']['Row'] & {
    roles: { name: string } | null;
  }) | null;
  active_trucks: {
    license_plate: string;
  }[];
  primary_trucks: {
    license_plate: string;
  }[];
};
type Truck = Database['public']['Tables']['trucks']['Row'];
type Role = Database['public']['Tables']['roles']['Row'];

export default function WorkersPage() {
  const supabase = createClient();
  const [workers, setWorkers] = useState<WorkerWithDetails[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // State for form data
  const [newWorker, setNewWorker] = useState({
    fullName: "",
    email: "",
    password: "",
    contactPhone: "",
    role: "Worker", // Default role
  });
  const [editingWorker, setEditingWorker] = useState<WorkerWithDetails | null>(null);
  const [deletingWorker, setDeletingWorker] = useState<WorkerWithDetails | null>(null);
  const [assigningWorker, setAssigningWorker] = useState<WorkerWithDetails | null>(null);
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase
      .from("workers")
      .select(`
        *,
        profile:profiles!inner(*, roles(name)),
        active_trucks:trucks!active_driver_id(license_plate),
        primary_trucks:trucks!primary_driver_id(license_plate)
      `);

    if (error) {
      setError(error.message);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setWorkers((data as any) as WorkerWithDetails[] || []);
    }
    setLoading(false);
  }, [supabase]);

  const fetchAvailableTrucks = useCallback(async () => {
    const { data, error } = await supabase
      .from('trucks')
      .select('*');

    if (error) {
      setError(error.message);
    } else {
      setTrucks(data || []);
    }
  }, [supabase]);
  
  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .not('name', 'in', '("SuperAdmin", "Client")'); // Exclude non-worker roles

    if (error) {
      setError(error.message);
    } else {
      setRoles(data || []);
    }
  }, [supabase]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (isEditModalOpen && editingWorker) {
        setEditingWorker(prev => {
            if (!prev || !prev.profile) return null;
            const updatedWorker = JSON.parse(JSON.stringify(prev));
            if (name === 'full_name' || name === 'contact_phone') {
                updatedWorker.profile[name] = value;
            }
            return updatedWorker;
        });
    } else if (isCreateModalOpen) {
        setNewWorker((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRoleChange = (roleName: string) => {
    setNewWorker(prev => ({...prev, role: roleName}));
  }

  // --- CRUD Handlers ---
  const handleCreateWorker = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const response = await fetch('/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newWorker.email, 
        password: newWorker.password, 
        role: newWorker.role,
        fullName: newWorker.fullName, 
        contactPhone: newWorker.contactPhone,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'An unknown error occurred.');
      return;
    }
    await fetchWorkers();
    closeCreateModal();
  };

  const handleUpdateWorker = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingWorker || !editingWorker.profile) return;
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: editingWorker.profile.full_name, contact_phone: editingWorker.profile.contact_phone })
      .eq('id', editingWorker.profile.id);
    if (profileError) {
        setError(profileError.message);
    } else {
        await fetchWorkers();
        closeEditModal();
    }
  };

  const handleDeleteWorker = async () => {
    if (!deletingWorker || !deletingWorker.profile) return;
    const { error: functionError } = await supabase.functions.invoke('delete-user', {
        body: { userId: deletingWorker.profile.id },
    });
    if (functionError) {
        setError(`Failed to delete user: ${functionError.message}.`);
    }
    await fetchWorkers();
    closeDeleteModal();
  };

  const handleAssignTruck = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assigningWorker || !selectedTruckId) {
      setError("Please select a worker and a truck.");
      return;
    }
    const { error: truckUpdateError } = await supabase
        .from('trucks')
        .update({ primary_driver_id: assigningWorker.id })
        .eq('id', selectedTruckId);
    if (truckUpdateError) {
        setError(`Failed to assign truck: ${truckUpdateError.message}`);
    } else {
        await fetchWorkers();
        closeAssignModal();
    }
  };

  // --- Modal Control Functions ---
  const openCreateModal = () => {
    setNewWorker({ fullName: "", email: "", password: "", contactPhone: "", role: "Worker" });
    fetchRoles(); // Fetch roles when modal opens
    setIsCreateModalOpen(true);
  };
  const closeCreateModal = () => setIsCreateModalOpen(false);

  const openEditModal = (worker: WorkerWithDetails) => {
    setEditingWorker(worker);
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => setIsEditModalOpen(false);

  const openDeleteModal = (worker: WorkerWithDetails) => {
    setDeletingWorker(worker);
    setIsDeleteModalOpen(true);
  };
  const closeDeleteModal = () => setIsDeleteModalOpen(false);

  const openAssignModal = (worker: WorkerWithDetails) => {
    setAssigningWorker(worker);
    fetchAvailableTrucks();
    setSelectedTruckId('');
    setIsAssignModalOpen(true);
  };
  const closeAssignModal = () => setIsAssignModalOpen(false);

  if (loading) {
    return <div className="p-6 font-bold text-center">Loading workers...</div>;
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Workers</h1>
        <button onClick={openCreateModal} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-bold">
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Add Worker
        </button>
      </div>
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">Error: {error}</p>}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Contact Phone</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Assigned Truck(s)</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workers.length > 0 ? (
                workers.map((worker) => {
                    const activeTrucks = worker.active_trucks?.map(t => t.license_plate).join(', ') || '';
                    const primaryTrucks = worker.primary_trucks?.map(t => t.license_plate).join(', ') || '';
                  return (
                  <tr key={worker.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800">{worker.profile?.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-600">{worker.profile?.contact_phone || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {activeTrucks && <div><span className="font-bold">Active:</span> {activeTrucks}</div>}
                      {primaryTrucks && <div><span className="font-bold">Primary:</span> {primaryTrucks}</div>}
                      {!activeTrucks && !primaryTrucks && <span className="text-gray-400">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => openAssignModal(worker)}
                          className="p-2 rounded-full text-green-600 hover:text-green-900 hover:bg-green-100"
                          title="Assign Primary Truck"
                        >
                            <TruckIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => openEditModal(worker)} className="p-2 text-indigo-600 hover:text-indigo-900 rounded-full hover:bg-indigo-100" title="Edit Worker">
                            <PencilIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => openDeleteModal(worker)} className="p-2 text-red-600 hover:text-red-900 rounded-full hover:bg-red-100" title="Delete Worker">
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </td>
                  </tr>
                )})
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500 font-bold">No workers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* --- Modals --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Add New Worker</h2>
            <form onSubmit={handleCreateWorker} className="space-y-4">
              <input type="text" name="fullName" placeholder="Full Name" value={newWorker.fullName} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <input type="email" name="email" placeholder="Email" value={newWorker.email} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <input type="password" name="password" placeholder="Password" value={newWorker.password} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <input type="text" name="contactPhone" placeholder="Contact Phone" value={newWorker.contactPhone} onChange={handleInputChange} className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                <Select name="role" required value={newWorker.role} onValueChange={handleRoleChange}>
                    <SelectTrigger className="w-full bg-white text-black">
                        <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                        {roles.map(role => (
                            <SelectItem key={role.id} value={role.name}>
                                {role.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={closeCreateModal} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && editingWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Worker</h2>
            <form onSubmit={handleUpdateWorker} className="space-y-4">
              <input type="text" name="full_name" placeholder="Full Name" value={editingWorker.profile?.full_name || ''} onChange={handleInputChange} required className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <input type="text" name="contact_phone" placeholder="Contact Phone" value={editingWorker.profile?.contact_phone || ''} onChange={handleInputChange} className="w-full p-2 border rounded font-semibold text-gray-900 placeholder-gray-500"/>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={closeEditModal} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && deletingWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Confirm Deletion</h2>
            <p className="text-gray-700">Are you sure you want to delete the worker <span className="font-bold text-gray-900">{deletingWorker.profile?.full_name}</span>? This action is irreversible.</p>
            <div className="flex justify-end space-x-4 mt-6">
                <button type="button" onClick={closeDeleteModal} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
                <button onClick={handleDeleteWorker} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {isAssignModalOpen && assigningWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-gray-900">Assign Primary Truck to {assigningWorker.profile?.full_name}</h2>
                <form onSubmit={handleAssignTruck} className="space-y-4">
                    <select
                        name="truckId"
                        value={selectedTruckId}
                        onChange={(e) => setSelectedTruckId(e.target.value)}
                        required
                        className="w-full p-2 border rounded font-semibold text-gray-900"
                    >
                        <option value="" disabled>Select an available truck</option>
                        {trucks.map(truck => (
                            <option key={truck.id} value={truck.id}>
                                {truck.license_plate} ({truck.make} {truck.model})
                            </option>
                        ))}
                    </select>
                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={closeAssignModal} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Assign Truck</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}