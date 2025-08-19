// src/app/(shell)/admin/trucks/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Trash2, PlusCircle, ChevronsUpDown } from 'lucide-react'
import React from 'react'

// --- Types based on your schema ---
type TruckCategory = '30 palette' | '16 palette' | 'equipment' | 'other' | null;

// This type now matches the return value of your `get_truck_details_with_analytics` function
type TruckDetails = {
  id: string;
  license_plate: string;
  make: string | null;
  model: string | null;
  category: TruckCategory;
  worker_name: string | null;
  latest_odometer: number | null;
  latest_km_per_liter: number | null;
  total_trips: number;
};

type FilterState = {
    category: string;
    minKml: string;
    maxKml: string;
    minOdo: string;
    maxOdo: string;
}

// --- Main Page Component ---
export default function TrucksPage() {
  const [trucks, setTrucks] = useState<TruckDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0) // Used to trigger data refetch
  const [filters, setFilters] = useState<FilterState>({
      category: 'all',
      minKml: '',
      maxKml: '',
      minOdo: '',
      maxOdo: '',
  })

  const supabase = createClient()
  const router = useRouter();

  const triggerRefresh = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/'); // Redirect if no user is logged in
        return;
      }

      // Fetch the user's profile to check their role from the 'profiles' table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // Security Check: Ensure user has an admin role in the profiles table
      if (profileError || !profile || profile.role !== 'admin') {
        console.error('Access denied or profile error:', profileError);
        router.push('/'); // Redirect non-admins or on error
        return;
      }

      setLoading(true)
      // Call the get_truck_details_with_analytics RPC function to fetch all data and stats
      const { data, error } = await supabase.rpc('get_truck_details_with_analytics');
      
      if (error) {
        console.error('Error fetching truck details:', error)
        setTrucks([])
      } else {
        setTrucks(data as TruckDetails[])
      }
      
      setLoading(false)
    }
    checkUserAndFetchData()
  }, [supabase, refreshKey, router]) // Reruns when refreshKey changes
  
  const handleAddTruck = () => {
    // Simply trigger a refresh after adding a truck
    triggerRefresh();
  }

  const handleDeleteTruck = async (truckId: string) => {
    const { error } = await supabase.from('trucks').delete().match({ id: truckId })
    if (error) {
        console.error('Error deleting truck:', error)
    } else {
        triggerRefresh(); // Refresh data after deleting
    }
  }

  const handleUpdateTruckCategory = async (truckId: string, category: TruckCategory) => {
      const { data, error } = await supabase.from('trucks').update({ category }).match({ id: truckId }).select()
      if (error) {
          console.error('Error updating truck category', error)
      } else if (data) {
          // Update local state for immediate feedback, then refresh for consistency
          setTrucks(prevTrucks => prevTrucks.map(t => t.id === truckId ? { ...t, category } : t))
      }
  }

  const filteredTrucks = useMemo(() => {
    return trucks.filter(truck => {
        const searchMatch = truck.license_plate && truck.license_plate.toLowerCase().includes(searchTerm.toLowerCase());
        const categoryMatch = filters.category === 'all' || truck.category === filters.category;
        const kml = truck.latest_km_per_liter ?? 0;
        const odo = truck.latest_odometer ?? 0;
        const minKmlMatch = filters.minKml === '' || kml >= parseFloat(filters.minKml);
        const maxKmlMatch = filters.maxKml === '' || kml <= parseFloat(filters.maxKml);
        const minOdoMatch = filters.minOdo === '' || odo >= parseFloat(filters.minOdo);
        const maxOdoMatch = filters.maxOdo === '' || odo <= parseFloat(filters.maxOdo);

        return searchMatch && categoryMatch && minKmlMatch && maxKmlMatch && minOdoMatch && maxOdoMatch;
    });
  }, [trucks, searchTerm, filters]);


  const categorizedTrucks = {
      '30 palette': filteredTrucks.filter(t => t.category === '30 palette'),
      '16 palette': filteredTrucks.filter(t => t.category === '16 palette'),
      'equipment': filteredTrucks.filter(t => t.category === 'equipment'),
      'other': filteredTrucks.filter(t => t.category === 'other' || !t.category),
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen text-white">Loading...</div>
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="container mx-auto p-4 space-y-8">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Fleet Management</h1>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Vehicle
                    </Button>
                </DialogTrigger>
                <AddTruckModal onTruckAdded={handleAddTruck} closeModal={() => setIsModalOpen(false)} />
            </Dialog>
        </div>

        <AnalyticsCard onRecalculate={triggerRefresh} />
        
        <FilterBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} filters={filters} setFilters={setFilters} />

        {/* --- Truck Sections --- */}
        <div className="space-y-6">
            <TruckCategorySection title="30 Palette Trucks" trucks={categorizedTrucks['30 palette']} onDelete={handleDeleteTruck} onUpdateCategory={handleUpdateTruckCategory} />
            <TruckCategorySection title="16 Palette Trucks" trucks={categorizedTrucks['16 palette']} onDelete={handleDeleteTruck} onUpdateCategory={handleUpdateTruckCategory} />
            <TruckCategorySection title="Equipment" trucks={categorizedTrucks['equipment']} onDelete={handleDeleteTruck} onUpdateCategory={handleUpdateTruckCategory} />
            <TruckCategorySection title="Other" trucks={categorizedTrucks['other']} onDelete={handleDeleteTruck} onUpdateCategory={handleUpdateTruckCategory} />
        </div>
      </div>
    </div>
  )
}

// --- Analytics Card Component ---
function AnalyticsCard({ onRecalculate }: { onRecalculate: () => void }) {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isRecalculating, setIsRecalculating] = useState(false)
    const supabase = createClient()

    const handleRecalculate = async () => {
        if (!startDate || !endDate) {
            alert('Please select a start and end date.');
            return;
        }

        setIsRecalculating(true);
        try {
            // Invoke the edge function to perform the recalculation
            const { data, error } = await supabase.functions.invoke<{ message: string }>('update-truck-analytics', {
                body: { start_date: startDate, end_date: endDate },
            });

            if (error) throw error;

            alert(data?.message || 'Averages have been recalculated!');
            onRecalculate(); // Trigger a data refresh in the parent component
        } catch (error: unknown) {
            console.error('Error recalculating analytics:', error);
            let message = 'An unknown error occurred';
            if (error instanceof Error) {
                message = error.message;
            } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
                message = (error as { message: string }).message;
            }
            alert(`Failed to recalculate: ${message}`);
        } finally {
            setIsRecalculating(false);
        }
    };

    return (
        <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
                <CardTitle>Fleet Analytics</CardTitle>
                <CardDescription className="text-gray-400">Recalculate average consumption for the fleet over a selected period.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
                <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-700 border-gray-600 text-white" />
                </div>
                <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-700 border-gray-600 text-white" />
                </div>
                <Button onClick={handleRecalculate} disabled={isRecalculating} className="mt-4 sm:mt-0 self-start sm:self-end">
                    {isRecalculating ? 'Recalculating...' : 'Recalculate Averages'}
                </Button>
            </CardContent>
        </Card>
    );
}

// --- Filter Bar Component ---
interface FilterBarProps {
    searchTerm: string;
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

function FilterBar({ searchTerm, setSearchTerm, filters, setFilters }: FilterBarProps) {
    const handleFilterChange = (key: keyof FilterState, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <Card className="bg-gray-800 border-gray-700 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Input
                    placeholder="Search by license plate..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="md:col-span-1 lg:col-span-1 bg-gray-700 border-gray-600 text-white"
                />
                <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white border-gray-700">
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="30 palette">30 Palette</SelectItem>
                        <SelectItem value="16 palette">16 Palette</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                    <Input placeholder="Min KM/L" type="number" value={filters.minKml} onChange={e => handleFilterChange('minKml', e.target.value)} className="bg-gray-700 border-gray-600" />
                    <Input placeholder="Max KM/L" type="number" value={filters.maxKml} onChange={e => handleFilterChange('maxKml', e.target.value)} className="bg-gray-700 border-gray-600" />
                </div>
                <div className="flex items-center gap-2">
                    <Input placeholder="Min Odo" type="number" value={filters.minOdo} onChange={e => handleFilterChange('minOdo', e.target.value)} className="bg-gray-700 border-gray-600" />
                    <Input placeholder="Max Odo" type="number" value={filters.maxOdo} onChange={e => handleFilterChange('maxOdo', e.target.value)} className="bg-gray-700 border-gray-600" />
                </div>
            </div>
        </Card>
    )
}

// --- Truck Category Section ---
function TruckCategorySection({ title, trucks, onDelete, onUpdateCategory }: { title: string, trucks: TruckDetails[], onDelete: (id: string) => void, onUpdateCategory: (id: string, category: TruckCategory) => void }) {
    return (
        <Collapsible defaultOpen>
            <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-t-lg border-b border-gray-700">
                    <h2 className="text-xl font-semibold">{title} ({trucks.length})</h2>
                    <ChevronsUpDown className="h-5 w-5" />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 bg-gray-800 rounded-b-lg">
                {trucks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {trucks.map(truck => (
                            <TruckCard key={truck.id} truck={truck} onDelete={onDelete} onUpdateCategory={onUpdateCategory} />
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No vehicles in this category match the current filters.</p>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}

// --- Add Truck Modal Component ---
function AddTruckModal({ onTruckAdded, closeModal }: { onTruckAdded: () => void, closeModal: () => void }) {
    const supabase = createClient()

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const newTruckData = {
          license_plate: formData.get('license_plate') as string,
          make: formData.get('make') as string,
          model: formData.get('model') as string,
          category: (formData.get('category') as TruckCategory) || 'other',
          current_odo: Number(formData.get('current_odo')) || null,
        }

        const { data, error } = await supabase.from('trucks').insert([newTruckData]).select()

        if (error) {
            console.error('Error adding truck:', error)
        } else if (data) {
            onTruckAdded()
            closeModal()
        }
    }

    return (
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
                <DialogTitle>Add a New Vehicle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="license_plate">License Plate</Label>
                    <Input id="license_plate" name="license_plate" required className="bg-gray-700 border-gray-600" />
                </div>
                <div>
                    <Label htmlFor="make">Make</Label>
                    <Input id="make" name="make" required className="bg-gray-700 border-gray-600" />
                </div>
                <div>
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" name="model" required className="bg-gray-700 border-gray-600" />
                </div>
                <div>
                    <Label htmlFor="current_odo">Current Odometer (km)</Label>
                    <Input id="current_odo" name="current_odo" type="number" placeholder="e.g., 150000" required className="bg-gray-700 border-gray-600" />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select name="category" defaultValue="other">
                    <SelectTrigger className="bg-gray-700 border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="30 palette">30 Palette</SelectItem>
                      <SelectItem value="16 palette">16 Palette</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                    <Button type="submit">Save Vehicle</Button>
                </div>
            </form>
        </DialogContent>
    )
}

// --- Truck Card Component ---
function TruckCard({ truck, onDelete, onUpdateCategory }: { truck: TruckDetails, onDelete: (id: string) => void, onUpdateCategory: (id: string, category: TruckCategory) => void }) {
    return (
        <Card className="bg-gray-700 border-gray-600 flex flex-col">
            <CardHeader className="flex-row items-start justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-lg">{truck.license_plate}</CardTitle>
                    <CardDescription className="text-gray-400">{truck.make} {truck.model}</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                     <Select value={truck.category || 'other'} onValueChange={(value) => onUpdateCategory(truck.id, value as TruckCategory)}>
                        <SelectTrigger className="bg-gray-600 border-gray-500 w-28 text-xs h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 text-white border-gray-700">
                            <SelectItem value="30 palette">30 Palette</SelectItem>
                            <SelectItem value="16 palette">16 Palette</SelectItem>
                            <SelectItem value="equipment">Equipment</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500" onClick={() => onDelete(truck.id)}>
                        <Trash2 size={18} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Avg. Consumption</span>
                    <span className="font-semibold">{truck.latest_km_per_liter ? `${truck.latest_km_per_liter.toFixed(2)} km/l` : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Trips</span>
                    <span className="font-semibold">{truck.total_trips}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Odometer</span>
                    <span className="font-semibold">{truck.latest_odometer ? truck.latest_odometer.toLocaleString() : 'N/A'} km</span>
                </div>
            </CardContent>
        </Card>
    )
}
