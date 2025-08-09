// src/app/(shell)/admin/trucks/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useCallback, Fragment, MouseEvent } from 'react'
import { PencilIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import { type Database } from '@/types/supabase'

// Define a more detailed type based on the new SQL function
type TruckDetails = {
  id: number;
  license_plate: string;
  make: string | null;
  model: string | null;
  year: number | null;
  status: string;
  category: string | null;
  worker_name: string | null;
  latest_odometer: number | null;
  latest_km_per_liter: number | null;
}

// Type for the original truck data for the main table
type TruckWithWorker = Database['public']['Tables']['trucks']['Row'] & {
  workers: { profiles: { full_name: string | null } | null } | null
}

const TruckCategorySection = ({
  title,
  trucks,
  unassignedTrucks,
  onAssignCategory,
}: {
  title: string;
  trucks: TruckDetails[];
  unassignedTrucks: TruckDetails[];
  onAssignCategory: (truckId: number, category: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* FIX: Changed the outer button to a div to prevent nesting errors */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-xl font-semibold text-gray-700 cursor-pointer"
      >
        <span>{title} ({trucks.length})</span>
        <div className="flex items-center space-x-4">
          <Menu as="div" className="relative inline-block text-left">
            <div>
              <Menu.Button 
                onClick={(e: MouseEvent) => e.stopPropagation()}
                className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Truck
              </Menu.Button>
            </div>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1">
                  {unassignedTrucks.length > 0 ? (
                    unassignedTrucks.map((truck) => (
                      <Menu.Item key={truck.id}>
                        {({ active }: { active: boolean }) => (
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation(); // Prevent the div from toggling
                              onAssignCategory(truck.id, title);
                            }}
                            className={`${
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                            } block px-4 py-2 text-sm`}
                          >
                            {truck.license_plate}
                          </a>
                        )}
                      </Menu.Item>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">No unassigned trucks</div>
                  )}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
          {isOpen ? <ChevronUpIcon className="h-6 w-6" /> : <ChevronDownIcon className="h-6 w-6" />}
        </div>
      </div>
      {isOpen && (
        <div className="p-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {trucks.map(truck => (
            <div key={truck.id} className="border rounded-lg p-4 bg-gray-50 space-y-2">
              <p className="font-bold text-lg text-gray-800">{truck.license_plate}</p>
              <p className="text-sm text-gray-600">
                <strong>Driver:</strong> {truck.worker_name || 'Unassigned'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Odometer:</strong> {truck.latest_odometer?.toLocaleString() ?? 'N/A'} km
              </p>
              <p className="text-sm text-gray-600">
                <strong>Avg. Km/L:</strong> {truck.latest_km_per_liter?.toFixed(2) ?? 'N/A'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


export default function TrucksPage() {
  const supabase = createClient()
  const [allTrucks, setAllTrucks] = useState<TruckWithWorker[]>([])
  const [truckDetails, setTruckDetails] = useState<TruckDetails[]>([])
  const [filteredTrucks, setFilteredTrucks] = useState<TruckWithWorker[]>([])
  const [loading, setLoading] = useState(true)
  
  const [licensePlate, setLicensePlate] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [category, setCategory] = useState<'16 palette' | '30 palette' | 'other' | ''>('');

  const [editingTruck, setEditingTruck] = useState<TruckWithWorker | null>(null)
  const [deletingTruck, setDeletingTruck] = useState<TruckWithWorker | null>(null)
  
  const [statusMessage, setStatusMessage] = useState<{ message?: string; error?: string } | null>(null)
  const [isFleetVisible, setIsFleetVisible] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Fetch detailed truck data using the new RPC function
    const { data: detailsData, error: detailsError } = await supabase.rpc('get_truck_details');
    if (detailsError) {
      console.error('Error fetching truck details:', detailsError);
      setStatusMessage({ error: detailsError.message });
    } else {
      setTruckDetails(detailsData as TruckDetails[]);
    }

    // Fetch original truck data for the main table
    const { data, error } = await supabase.from('trucks').select(`*, workers (profiles (full_name))`).order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching trucks:', error);
      setStatusMessage({ error: error.message });
    } else if (data) {
      setAllTrucks(data as TruckWithWorker[]);
    }
    
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    let result = allTrucks;
    if (searchTerm) {
      result = result.filter(truck =>
        truck.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        truck.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        truck.model?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter) result = result.filter(truck => truck.status === statusFilter);
    if (categoryFilter) result = result.filter(truck => truck.category === categoryFilter);
    setFilteredTrucks(result);
  }, [searchTerm, statusFilter, categoryFilter, allTrucks]);

  const categorizedTrucks = {
    '16 palette': truckDetails.filter(t => t.category === '16 palette'),
    '30 palette': truckDetails.filter(t => t.category === '30 palette'),
    'other': truckDetails.filter(t => t.category === 'other'),
    'unassigned': truckDetails.filter(t => !t.category),
  };

  const handleAssignCategory = async (truckId: number, newCategory: string) => {
    const { error } = await supabase
      .from('trucks')
      .update({ category: newCategory })
      .eq('id', truckId);

    if (error) {
      setStatusMessage({ error: `Failed to assign category: ${error.message}` });
    } else {
      setStatusMessage({ message: 'Truck category updated successfully!' });
      fetchData(); // Refetch all data to update UI
    }
  };

  async function createTruck(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from('trucks')
      .insert({ 
        license_plate: licensePlate, 
        make, 
        model, 
        year: parseInt(year),
        category: category || null
      })
    
    if (error) {
      setStatusMessage({ error: `Error creating truck: ${error.message}` })
    } else {
      setStatusMessage({ message: 'Truck created successfully!' })
      setLicensePlate(''); setMake(''); setModel(''); setYear(''); setCategory('');
      fetchData();
    }
  }

  const handleUpdateTruck = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTruck) return;
    const { error } = await supabase.from('trucks').update({
      license_plate: editingTruck.license_plate, make: editingTruck.make, model: editingTruck.model, year: editingTruck.year, category: editingTruck.category
    }).eq('id', editingTruck.id);
    if (error) setStatusMessage({ error: error.message });
    else {
      setStatusMessage({ message: 'Truck updated successfully!' });
      fetchData();
      setEditingTruck(null);
    }
  };

  const handleDeleteTruck = async () => {
    if (!deletingTruck) return;
    const { error } = await supabase.from('trucks').delete().eq('id', deletingTruck.id);
    if (error) setStatusMessage({ error: error.message });
    else {
      setStatusMessage({ message: 'Truck deleted successfully!' });
      fetchData();
      setDeletingTruck(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Trucks Management</h1>

      {statusMessage && (
        <div className={`my-4 p-3 rounded-md text-sm ${statusMessage.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          <p className="font-semibold">{statusMessage.error ? 'Error' : 'Success'}</p>
          <p>{statusMessage.error || statusMessage.message}</p>
        </div>
      )}

      {/* Category Sections */}
      <TruckCategorySection title="16 palette" trucks={categorizedTrucks['16 palette']} unassignedTrucks={categorizedTrucks.unassigned} onAssignCategory={handleAssignCategory} />
      <TruckCategorySection title="30 palette" trucks={categorizedTrucks['30 palette']} unassignedTrucks={categorizedTrucks.unassigned} onAssignCategory={handleAssignCategory} />
      <TruckCategorySection title="other" trucks={categorizedTrucks.other} unassignedTrucks={categorizedTrucks.unassigned} onAssignCategory={handleAssignCategory} />

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Add a New Truck</h2>
        <form onSubmit={createTruck} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <input type="text" placeholder="License Plate" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} required className="p-2 border rounded-md text-gray-900 placeholder-gray-500"/>
          <input type="text" placeholder="Make" value={make} onChange={(e) => setMake(e.target.value)} className="p-2 border rounded-md text-gray-900 placeholder-gray-500"/>
          <input type="text" placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} className="p-2 border rounded-md text-gray-900 placeholder-gray-500"/>
          <input type="number" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} className="p-2 border rounded-md text-gray-900 placeholder-gray-500"/>
          <select value={category} onChange={(e) => setCategory(e.target.value as '16 palette' | '30 palette' | 'other' | '')} className="p-2 border rounded-md text-gray-900 bg-white">
            <option value="" disabled>Select Category</option>
            <option value="16 palette">16 Palette</option>
            <option value="30 palette">30 Palette</option>
            <option value="other">Other</option>
          </select>
          <button type="submit" className="mt-4 md:mt-0 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 col-span-full lg:col-span-1">
            Create Truck
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <button
          onClick={() => setIsFleetVisible(!isFleetVisible)}
          className="w-full flex justify-between items-center p-4 text-xl font-semibold text-gray-700"
        >
          <span>Full Fleet Details</span>
          {isFleetVisible ? <ChevronUpIcon className="h-6 w-6" /> : <ChevronDownIcon className="h-6 w-6" />}
        </button>
        {isFleetVisible && (
          <div className="p-6 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input type="text" placeholder="Search by plate, make, model..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="p-2 border rounded-md text-gray-900 placeholder-gray-500" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border rounded-md text-gray-900 bg-white">
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="under_service">Under Service</option>
                <option value="decommissioned">Decommissioned</option>
              </select>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="p-2 border rounded-md text-gray-900 bg-white">
                <option value="">All Categories</option>
                <option value="16 palette">16 Palette</option>
                <option value="30 palette">30 Palette</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="overflow-x-auto">
                {loading ? <p>Loading trucks...</p> : (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License Plate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Make & Model</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Worker</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTrucks.map((truck) => (
                        <tr key={truck.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{truck.license_plate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.category || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.make} {truck.model} ({truck.year})</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                truck.status === 'active' ? 'bg-green-100 text-green-800' : 
                                truck.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                                truck.status === 'under_service' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                            {truck.status.replace('_', ' ')}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.workers?.profiles?.full_name || 'Unassigned'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button onClick={() => setEditingTruck(truck)} className="p-2 text-indigo-600 hover:text-indigo-900 rounded-full hover:bg-indigo-100"><PencilIcon className="h-5 w-5" /></button>
                            <button onClick={() => setDeletingTruck(truck)} className="p-2 text-red-600 hover:text-red-900 rounded-full hover:bg-red-100"><TrashIcon className="h-5 w-5" /></button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                )}
            </div>
          </div>
        )}
      </div>

      {editingTruck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Truck</h2>
            <form onSubmit={handleUpdateTruck} className="space-y-4">
              <input type="text" value={editingTruck.license_plate} onChange={(e) => setEditingTruck({...editingTruck, license_plate: e.target.value})} required className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"/>
              <input type="text" value={editingTruck.make || ''} onChange={(e) => setEditingTruck({...editingTruck, make: e.target.value})} className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"/>
              <input type="text" value={editingTruck.model || ''} onChange={(e) => setEditingTruck({...editingTruck, model: e.target.value})} className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"/>
              <input type="number" value={editingTruck.year || ''} onChange={(e) => setEditingTruck({...editingTruck, year: parseInt(e.target.value)})} className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"/>
              <select value={editingTruck.category || ''} onChange={(e) => setEditingTruck({...editingTruck, category: e.target.value})} className="w-full p-2 border rounded text-gray-900 bg-white">
                <option value="" disabled>Select Category</option>
                <option value="16 palette">16 Palette</option>
                <option value="30 palette">30 Palette</option>
                <option value="other">Other</option>
              </select>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setEditingTruck(null)} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingTruck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Confirm Deletion</h2>
            <p className="text-gray-700">Are you sure you want to delete the truck with license plate <span className="font-bold">{deletingTruck.license_plate}</span>?</p>
            <div className="flex justify-end space-x-4 mt-6">
              <button type="button" onClick={() => setDeletingTruck(null)} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Cancel</button>
              <button onClick={handleDeleteTruck} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
