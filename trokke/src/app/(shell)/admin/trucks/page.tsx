'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Trash2, PlusCircle, ChevronsUpDown, Info } from 'lucide-react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import React from 'react'
import { cn } from '@/lib/utils'

type TruckCategory = '30 palette' | '16 palette' | 'equipment' | 'other' | null;

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
  is_hours_based: boolean;
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [notification, setNotification] = useState<{ title: string; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0)
  const [filters, setFilters] = useState<FilterState>({
      category: 'all',
      minKml: '',
      maxKml: '',
      minOdo: '',
      maxOdo: '',
  })

  const supabase = createClient()
  const router = useRouter();

  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        console.error('Access denied or profile error:', profileError);
        router.push('/');
        return;
      }

      const { data, error } = await supabase.rpc('get_truck_details_with_analytics');
      
      if (error) {
        console.error('Error fetching truck details:', error)
        setNotification({ title: 'Error', message: 'Could not fetch truck data.' });
        setTrucks([])
      } else {
        setTrucks(data as TruckDetails[])
      }
      
      setLoading(false)
    }
    checkUserAndFetchData()
  }, [supabase, refreshKey, router])
  
  const handleAddTruck = useCallback(() => {
    triggerRefresh();
    setNotification({ title: 'Success', message: 'New vehicle has been added.' });
  }, [triggerRefresh]);

  const handleDeleteTruck = useCallback(async (truckId: string) => {
    const { error } = await supabase.from('trucks').delete().match({ id: truckId })
    if (error) {
        console.error('Error deleting truck:', error)
        setNotification({ title: 'Error', message: `Failed to delete truck: ${error.message}` });
    } else {
        triggerRefresh();
        setNotification({ title: 'Success', message: 'Vehicle has been deleted.' });
    }
  }, [supabase, triggerRefresh]);

  const handleUpdateTruckCategory = useCallback(async (truckId: string, category: TruckCategory) => {
      const { data, error } = await supabase.from('trucks').update({ category }).match({ id: truckId }).select()
      if (error) {
          console.error('Error updating truck category', error)
          setNotification({ title: 'Error', message: `Failed to update category: ${error.message}` });
      } else if (data) {
          setTrucks(prevTrucks => prevTrucks.map(t => t.id === truckId ? { ...t, category } : t))
      }
  }, [supabase]);

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


  const categorizedTrucks = useMemo(() => ({
      '30 palette': filteredTrucks.filter(t => t.category === '30 palette'),
      '16 palette': filteredTrucks.filter(t => t.category === '16 palette'),
      'equipment': filteredTrucks.filter(t => t.category === 'equipment'),
      'other': filteredTrucks.filter(t => t.category === 'other' || !t.category),
  }), [filteredTrucks]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><ArrowPathIcon className="animate-spin h-8 w-8 text-gray-500" /> <span className="ml-4 text-gray-700">Loading Fleet Data...</span></div>
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold tracking-tight">Fleet Management</h2>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Vehicle
                    </Button>
                </DialogTrigger>
                <AddTruckModal onTruckAdded={handleAddTruck} closeModal={() => setIsAddModalOpen(false)} />
            </Dialog>
        </div>

        <AnalyticsCard onRecalculate={triggerRefresh} setNotification={setNotification} />
        
        <FilterBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} filters={filters} setFilters={setFilters} />

        <div className="space-y-6">
            <TruckCategorySection title="30 Palette Trucks" trucks={categorizedTrucks['30 palette']} onDelete={handleDeleteTruck} onUpdateCategory={handleUpdateTruckCategory} />
            <TruckCategorySection title="16 Palette Trucks" trucks={categorizedTrucks['16 palette']} onDelete={handleDeleteTruck} onUpdateCategory={handleUpdateTruckCategory} />
            <TruckCategorySection title="Equipment" trucks={categorizedTrucks['equipment']} onDelete={handleDeleteTruck} onUpdateCategory={handleUpdateTruckCategory} />
            <TruckCategorySection title="Other" trucks={categorizedTrucks['other']} onDelete={handleDeleteTruck} onUpdateCategory={handleUpdateTruckCategory} />
        </div>

        {/* Notification Modal */}
        <Dialog open={!!notification} onOpenChange={() => setNotification(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Info /> {notification?.title}</DialogTitle>
                    <DialogDescription className="pt-4">{notification?.message}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={() => setNotification(null)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}

// --- Analytics Card Component ---
function AnalyticsCard({ onRecalculate, setNotification }: { onRecalculate: () => void, setNotification: (notif: { title: string; message: string }) => void }) {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isRecalculating, setIsRecalculating] = useState(false)
    const supabase = createClient()

    const handleRecalculate = async () => {
        if (!startDate || !endDate) {
            setNotification({ title: 'Input Required', message: 'Please select a start and end date.' });
            return;
        }

        setIsRecalculating(true);
        try {
            const { data, error } = await supabase.functions.invoke<{ message: string }>('update-truck-analytics', {
                body: { start_date: startDate, end_date: endDate },
            });

            if (error) throw error;

            setNotification({ title: 'Success', message: data?.message || 'Averages have been recalculated!' });
            onRecalculate();
        } catch (error: unknown) {
            console.error('Error recalculating analytics:', error);
            let message = 'An unknown error occurred';
            if (error instanceof Error) {
                message = error.message;
            } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
                message = (error as { message: string }).message;
            }
            setNotification({ title: 'Recalculation Failed', message });
        } finally {
            setIsRecalculating(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-gray-900">Fleet Analytics</CardTitle>
                <CardDescription className="text-gray-600">Recalculate average consumption for the fleet over a selected period.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
                <div>
                    <Label htmlFor="start-date" className="text-gray-700">Start Date</Label>
                    <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border-gray-300 text-gray-900" />
                </div>
                <div>
                    <Label htmlFor="end-date" className="text-gray-700">End Date</Label>
                    <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border-gray-300 text-gray-900" />
                </div>
                <Button onClick={handleRecalculate} disabled={isRecalculating} className="mt-4 sm:mt-0 self-start sm:self-end bg-green-600 hover:bg-green-700 text-white min-w-[180px]">
                    {isRecalculating ? (
                        <div className="flex items-center justify-center">
                            <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
                            <span>Recalculating...</span>
                        </div>
                    ) : (
                        'Recalculate Averages'
                    )}
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
        <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Input
                    placeholder="Search by license plate..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="md:col-span-1 lg:col-span-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                />
                <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900"><SelectValue placeholder="All Categories" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="30 palette">30 Palette</SelectItem>
                        <SelectItem value="16 palette">16 Palette</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                    <Input placeholder="Min KM/L" type="number" value={filters.minKml} onChange={e => handleFilterChange('minKml', e.target.value)} className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500" />
                    <Input placeholder="Max KM/L" type="number" value={filters.maxKml} onChange={e => handleFilterChange('maxKml', e.target.value)} className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500" />
                </div>
                <div className="flex items-center gap-2">
                    <Input placeholder="Min Odo" type="number" value={filters.minOdo} onChange={e => handleFilterChange('minOdo', e.target.value)} className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500" />
                    <Input placeholder="Max Odo" type="number" value={filters.maxOdo} onChange={e => handleFilterChange('maxOdo', e.target.value)} className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500" />
                </div>
            </div>
        </Card>
    )
}

// --- Truck Category Section ---
function TruckCategorySection({ title, trucks, onDelete, onUpdateCategory }: { title: string, trucks: TruckDetails[], onDelete: (id: string) => void, onUpdateCategory: (id: string, category: TruckCategory) => void }) {
    if (trucks.length === 0) {
        return null;
    }
    
    return (
        <Collapsible defaultOpen>
             <CollapsibleTrigger className="w-full">
                 <div className="flex items-center justify-between p-4 bg-gray-50 rounded-t-lg border">
                     <h2 className="text-xl font-semibold text-gray-800">{title} ({trucks.length})</h2>
                     <ChevronsUpDown className="h-5 w-5 text-gray-500" />
                 </div>
             </CollapsibleTrigger>
            <CollapsibleContent className="p-4 bg-white rounded-b-lg border border-t-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {trucks.map(truck => (
                        <TruckCard key={truck.id} truck={truck} onDelete={onDelete} onUpdateCategory={onUpdateCategory} />
                    ))}
                </div>
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
        }

        const { data, error } = await supabase.from('trucks').insert([newTruckData]).select()

        if (error) {
            console.error('Error adding truck:', error)
            // A more robust solution would be to show an error message inside the modal
        } else if (data) {
            onTruckAdded()
            closeModal()
        }
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add a New Vehicle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="license_plate">License Plate</Label>
                    <Input id="license_plate" name="license_plate" required />
                </div>
                <div>
                    <Label htmlFor="make">Make</Label>
                    <Input id="make" name="make" required />
                </div>
                <div>
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" name="model" required />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select name="category" defaultValue="other">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30 palette">30 Palette</SelectItem>
                      <SelectItem value="16 palette">16 Palette</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">Save Vehicle</Button>
                </div>
            </form>
        </DialogContent>
    )
}

// --- Truck Card Component ---
function TruckCard({ truck, onDelete, onUpdateCategory }: { truck: TruckDetails, onDelete: (id: string) => void, onUpdateCategory: (id: string, category: TruckCategory) => void }) {
    const { is_hours_based, latest_km_per_liter, latest_odometer } = truck;

    const consumptionUnit = is_hours_based ? 'hr/l' : 'km/l';
    const odoLabel = is_hours_based ? 'Total Hours' : 'Odometer';
    const odoUnit = is_hours_based ? ' hrs' : ' km';
    
    const categoryTriggerClass = cn(
      "w-32 text-xs h-8 text-black", // Base classes
      is_hours_based 
        ? "bg-yellow-300 hover:bg-yellow-400 focus:ring-yellow-400" 
        : "bg-green-300 hover:bg-green-400 focus:ring-green-400"
    );
    
    return (
        <Card className="flex flex-col shadow-md hover:shadow-lg transition-shadow bg-white group">
            {/* The Link wraps the main content, but not the action buttons */}
            <Link href={`/admin/trucks/${truck.id}`} className="flex-grow">
                <CardHeader>
                    <div className="space-y-1">
                        <CardTitle className="text-gray-900 text-lg group-hover:text-primary">{truck.license_plate}</CardTitle>
                        <CardDescription className="text-gray-600">{truck.make} {truck.model}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg. Consumption</span>
                        <span className="font-semibold text-gray-900">{latest_km_per_liter ? `${latest_km_per_liter.toFixed(2)} ${consumptionUnit}` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Trips</span>
                        <span className="font-semibold text-gray-900">{truck.total_trips}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{odoLabel}</span>
                        <span className="font-semibold text-gray-900">{latest_odometer ? `${latest_odometer.toLocaleString()}${odoUnit}` : 'N/A'}</span>
                    </div>
                     <div className="flex justify-between text-sm pt-2 border-t mt-2">
                        <span className="text-gray-600">Driver</span>
                        <span className="font-semibold text-gray-900">{truck.worker_name || 'Unassigned'}</span>
                    </div>
                </CardContent>
            </Link>
            {/* Action buttons are outside the Link to prevent nested interactive elements */}
            <div className="flex items-center gap-1 p-4 pt-0">
                <Select value={truck.category || 'other'} onValueChange={(value) => onUpdateCategory(truck.id, value as TruckCategory)}>
                    <SelectTrigger className={categoryTriggerClass}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="30 palette">30 Palette</SelectItem>
                        <SelectItem value="16 palette">16 Palette</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 ml-auto" onClick={(e) => {
                    e.stopPropagation(); // Prevent link navigation when clicking delete
                    onDelete(truck.id)
                }}>
                    <Trash2 size={18} />
                </Button>
            </div>
        </Card>
    )
}
