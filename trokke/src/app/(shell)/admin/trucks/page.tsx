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
import { Trash2, PlusCircle, ChevronsUpDown, Info, AlertTriangle } from 'lucide-react'
import { ArrowPathIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import React from 'react'
import { cn } from '@/lib/utils'

// --- TYPE FIX ---
// Define the expected shape of the data returned from the Supabase query.
type ProfileWithRole = {
  roles: { name: string } | { name: string }[] | null;
};

type TruckCategory = '30 palette' | '16 palette' | 'equipment' | 'other' | 'needs attention' | null;

type TruckDetails = {
  id: number;
  license_plate: string;
  make: string | null;
  model: string | null;
  category: TruckCategory;
  worker_name: string | null;
  latest_odometer: number | null;
  latest_km_per_liter: number | null;
  total_trips: number;
  is_hours_based: boolean;
  missing_fields: string[] | null;
  next_service_km: number | null;
  service_warning_threshold: number | null;
  has_pre_trip_issues: boolean;
};

type RpcTruckDetails = Omit<TruckDetails, 'has_pre_trip_issues'> & {
  has_pre_trip_issues?: boolean;
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportServicesModalOpen, setIsImportServicesModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ title: string; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0)
  const [truckToDelete, setTruckToDelete] = useState<TruckDetails | null>(null);
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
        .select('roles(name)')
        .eq('id', user.id)
        .single();

      // Cast the result to our defined type to help TypeScript
      const typedProfile = profile as ProfileWithRole | null;
      const roleRelation = typedProfile?.roles;
      const userRole = Array.isArray(roleRelation) ? roleRelation[0]?.name : roleRelation?.name;

      if (profileError || !userRole || (userRole !== 'Admin' && userRole !== 'SuperAdmin')) {
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
        const trucksFromRpc = data as RpcTruckDetails[];
        const trucksWithDefaults = trucksFromRpc.map(truck => ({
            ...truck,
            has_pre_trip_issues: truck.has_pre_trip_issues || false,
        }));
        setTrucks(trucksWithDefaults as TruckDetails[]);
      }
      
      setLoading(false)
    }
    checkUserAndFetchData()
  }, [supabase, refreshKey, router])
  
  const handleAddTruck = useCallback(() => {
    triggerRefresh();
    setNotification({ title: 'Success', message: 'New vehicle has been added.' });
  }, [triggerRefresh]);

  const handleImportTrips = useCallback(() => {
    triggerRefresh();
    setNotification({ title: 'Success', message: 'Trip data has been imported.' });
  }, [triggerRefresh]);

    const handleImportServices = useCallback(() => {
    triggerRefresh();
    setNotification({ title: 'Success', message: 'Service data has been imported.' });
  }, [triggerRefresh]);


  const handleDeleteTruck = useCallback(async (truckId: number) => {
    const { error } = await supabase.from('trucks').delete().match({ id: truckId })
    if (error) {
        console.error('Error deleting truck:', error)
        setNotification({ title: 'Error', message: `Failed to delete truck: ${error.message}` });
    } else {
        triggerRefresh();
        setNotification({ title: 'Success', message: 'Vehicle has been deleted.' });
    }
    setTruckToDelete(null);
  }, [supabase, triggerRefresh]);

  const promptForDelete = useCallback((truck: TruckDetails) => {
    setTruckToDelete(truck);
  }, []);

  const handleUpdateTruckCategory = useCallback(async (truckId: number, category: TruckCategory) => {
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

  const isServiceDueSoon = (truck: TruckDetails) => {
    if (truck.next_service_km && truck.latest_odometer) {
        const diff = truck.next_service_km - truck.latest_odometer;
        const threshold = truck.service_warning_threshold || (truck.is_hours_based ? 50 : 1500);
        return diff <= threshold;
    }
    return false;
  };

  const categorizedTrucks = useMemo(() => {
    const needsAttentionTrucks = filteredTrucks.filter(t => 
        t.category === 'needs attention' || 
        isServiceDueSoon(t) ||
        t.has_pre_trip_issues
    );
    const attentionIds = new Set(needsAttentionTrucks.map(t => t.id));

    return {
        'needs attention': needsAttentionTrucks,
        '30 palette': filteredTrucks.filter(t => t.category === '30 palette' && !attentionIds.has(t.id)),
        '16 palette': filteredTrucks.filter(t => t.category === '16 palette' && !attentionIds.has(t.id)),
        'equipment': filteredTrucks.filter(t => t.category === 'equipment' && !attentionIds.has(t.id)),
        'other': filteredTrucks.filter(t => (t.category === 'other' || !t.category) && !attentionIds.has(t.id)),
    };
  }, [filteredTrucks]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><ArrowPathIcon className="animate-spin h-8 w-8 text-gray-500" /> <span className="ml-4 text-gray-700">Loading Fleet Data...</span></div>
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold tracking-tight">Fleet Management</h2>
            <div className="flex items-center gap-2">
                 <Dialog open={isImportServicesModalOpen} onOpenChange={setIsImportServicesModalOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
                            <ArrowUpTrayIcon className="mr-2 h-4 w-4" /> Import Services
                        </Button>
                    </DialogTrigger>
                    <ImportServicesModal onServicesImported={handleImportServices} closeModal={() => setIsImportServicesModalOpen(false)} setNotification={setNotification} />
                </Dialog>
                <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
                            <ArrowUpTrayIcon className="mr-2 h-4 w-4" /> Import Trips
                        </Button>
                    </DialogTrigger>
                    <ImportTripsModal onTripsImported={handleImportTrips} closeModal={() => setIsImportModalOpen(false)} setNotification={setNotification} />
                </Dialog>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Vehicle
                        </Button>
                    </DialogTrigger>
                    <AddTruckModal onTruckAdded={handleAddTruck} closeModal={() => setIsAddModalOpen(false)} />
                </Dialog>
            </div>
        </div>
        
        <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Filter Fleet</h3>
            <FilterBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} filters={filters} setFilters={setFilters} />
        </div>

        <div className="space-y-6">
            <TruckCategorySection title="Needs Attention" trucks={categorizedTrucks['needs attention']} onDelete={promptForDelete} onUpdateCategory={handleUpdateTruckCategory} />
            <TruckCategorySection title="30 Palette Trucks" trucks={categorizedTrucks['30 palette']} onDelete={promptForDelete} onUpdateCategory={handleUpdateTruckCategory} />
            <TruckCategorySection title="16 Palette Trucks" trucks={categorizedTrucks['16 palette']} onDelete={promptForDelete} onUpdateCategory={handleUpdateTruckCategory} />
            <TruckCategorySection title="Equipment" trucks={categorizedTrucks['equipment']} onDelete={promptForDelete} onUpdateCategory={handleUpdateTruckCategory} />
            <TruckCategorySection title="Other" trucks={categorizedTrucks['other']} onDelete={promptForDelete} onUpdateCategory={handleUpdateTruckCategory} />
        </div>

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

        <Dialog open={!!truckToDelete} onOpenChange={() => setTruckToDelete(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the vehicle with license plate{' '}
                        <span className="font-semibold">{truckToDelete?.license_plate}</span>.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setTruckToDelete(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => truckToDelete && handleDeleteTruck(truckToDelete.id)}>
                        Delete Vehicle
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}

// --- Import Trips Modal Component ---
function ImportTripsModal({ onTripsImported, closeModal, setNotification }: { onTripsImported: () => void, closeModal: () => void, setNotification: (notif: { title: string; message: string }) => void }) {
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!fileInputRef.current?.files?.length) {
            setNotification({ title: 'No File', message: 'Please select a file to import.' });
            return;
        }
        
        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', fileInputRef.current.files[0]);

        try {
            // FIX: Added cache: 'no-store' to prevent caching and ensure logging.
            const response = await fetch('/api/import-actions', {
                method: 'POST',
                body: formData,
                cache: 'no-store', 
            });
            const result = await response.json();
            
            setIsImporting(false);
            setNotification({ 
                title: result.success ? 'Import Successful' : 'Import Failed', 
                message: result.message 
            });

            if (result.success) {
                onTripsImported();
                closeModal();
            }
        } catch (error) {
            setIsImporting(false);
            console.error("Import failed:", error);
            setNotification({ title: 'Error', message: 'An unexpected error occurred during import.' });
        }
    };

    return (
        // FIX: Added classes for a solid white background and black text.
        <DialogContent className="bg-white text-black">
            <DialogHeader>
                <DialogTitle>Import Trip Data</DialogTitle>
                <DialogDescription className="text-gray-600">
                    Upload an Excel file to import trip histories for your vehicles. This will add new trips without creating new vehicles.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="trip-file">Excel File</Label>
                    <Input id="trip-file" name="file" type="file" accept=".xlsx, .xls" ref={fileInputRef} required />
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isImporting}>
                        {isImporting ? (
                            <>
                                <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
                                Start Import
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}

function ImportServicesModal({ onServicesImported, closeModal, setNotification }: { onServicesImported: () => void, closeModal: () => void, setNotification: (notif: { title: string; message: string }) => void }) {
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!fileInputRef.current?.files?.length) {
            setNotification({ title: 'No File', message: 'Please select a file to import.' });
            return;
        }
        
        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', fileInputRef.current.files[0]);

        try {
            // FIX: Added cache: 'no-store' to prevent caching and ensure logging.
            const response = await fetch('/api/import-services', {
                method: 'POST',
                body: formData,
                cache: 'no-store',
            });
            const result = await response.json();
            
            setIsImporting(false);
            setNotification({ 
                title: result.success ? 'Import Successful' : 'Import Failed', 
                message: result.message 
            });

            if (result.success) {
                onServicesImported();
                closeModal();
            }
        } catch (error) {
            setIsImporting(false);
            console.error("Import failed:", error);
            setNotification({ title: 'Error', message: 'An unexpected error occurred during import.' });
        }
    };

    return (
        // FIX: Added classes for a solid white background and black text.
        <DialogContent className="bg-white text-black">
            <DialogHeader>
                <DialogTitle>Import Service Data</DialogTitle>
                <DialogDescription className="text-gray-600">
                    Upload an Excel file to import service histories for your vehicles. This will add new service records without creating new vehicles.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="service-file">Excel File</Label>
                    <Input id="service-file" name="file" type="file" accept=".xlsx, .xls" ref={fileInputRef} required />
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isImporting}>
                        {isImporting ? (
                            <>
                                <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
                                Start Import
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
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
                    <SelectContent className="bg-white text-black">
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="30 palette">30 Palette</SelectItem>
                        <SelectItem value="16 palette">16 Palette</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="needs attention">Needs Attention</SelectItem>
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
function TruckCategorySection({ title, trucks, onDelete, onUpdateCategory }: { title: string, trucks: TruckDetails[], onDelete: (truck: TruckDetails) => void, onUpdateCategory: (id: number, category: TruckCategory) => void }) {
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
          current_odo: formData.get('current_odo') ? Number(formData.get('current_odo')) : null,
          is_hours_based: formData.get('is_hours_based') === 'true',
          next_service_km: formData.get('next_service_km') ? Number(formData.get('next_service_km')) : null,
          service_interval_km: formData.get('service_interval_km') ? Number(formData.get('service_interval_km')) : null,
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
        <DialogContent className="bg-green-700">
            <DialogHeader className="text-white">
                <DialogTitle>Add a New Vehicle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="license_plate" className="text-white">License Plate</Label>
                    <Input id="license_plate" name="license_plate" required className="bg-white text-black" />
                </div>
                <div>
                    <Label htmlFor="make" className="text-white">Make</Label>
                    <Input id="make" name="make" required className="bg-white text-black" />
                </div>
                <div>
                    <Label htmlFor="model" className="text-white">Model</Label>
                    <Input id="model" name="model" required className="bg-white text-black" />
                </div>
                <div>
                  <Label htmlFor="category" className="text-white">Category</Label>
                  <Select name="category" defaultValue="other">
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                      <SelectItem value="30 palette">30 Palette</SelectItem>
                      <SelectItem value="16 palette">16 Palette</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                    <Label htmlFor="current_odo" className="flex items-center text-white">
                        Odometer Reading (Optional)
                        <div className="relative group ml-2">
                            <Info size={16} className="cursor-pointer" />
                            <div className="absolute bottom-full mb-2 w-48 p-2 text-xs text-white bg-black rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                The current odometer reading of the vehicle in kilometers or hours.
                            </div>
                        </div>
                    </Label>
                    <Input id="current_odo" name="current_odo" type="number" className="bg-white text-black" />
                </div>
                <div>
                    <Label htmlFor="is_hours_based" className="flex items-center text-white">
                        Vehicle Type (Optional)
                        <div className="relative group ml-2">
                            <Info size={16} className="cursor-pointer" />
                            <div className="absolute bottom-full mb-2 w-48 p-2 text-xs text-white bg-black rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                Is this vehicle&apos;s usage measured in hours instead of kilometers?
                            </div>
                        </div>
                    </Label>
                    <Select name="is_hours_based" defaultValue="false">
                        <SelectTrigger className="bg-white text-black">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-black">
                            <SelectItem value="false">KM-Based</SelectItem>
                            <SelectItem value="true">Hours-Based</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="next_service_km" className="flex items-center text-white">
                        Next Service (Optional)
                        <div className="relative group ml-2">
                            <Info size={16} className="cursor-pointer" />
                            <div className="absolute bottom-full mb-2 w-48 p-2 text-xs text-white bg-black rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                The odometer reading (KM or Hours) at which the next service is due.
                            </div>
                        </div>
                    </Label>
                    <Input id="next_service_km" name="next_service_km" type="number" className="bg-white text-black" />
                </div>
                <div>
                    <Label htmlFor="service_interval_km" className="flex items-center text-white">
                        Service Interval (Optional)
                        <div className="relative group ml-2">
                            <Info size={16} className="cursor-pointer" />
                            <div className="absolute bottom-full mb-2 w-48 p-2 text-xs text-white bg-black rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                The interval (in KM or Hours) between services for this vehicle.
                            </div>
                        </div>
                    </Label>
                    <Input id="service_interval_km" name="service_interval_km" type="number" className="bg-white text-black" />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" onClick={closeModal} className="bg-white text-black hover:bg-gray-200">Cancel</Button>
                    <Button type="submit" className="bg-white text-black hover:bg-gray-200">Save Vehicle</Button>
                </div>
            </form>
        </DialogContent>
    )
}

// --- Truck Card Component ---
function TruckCard({ truck, onDelete, onUpdateCategory }: { truck: TruckDetails, onDelete: (truck: TruckDetails) => void, onUpdateCategory: (id: number, category: TruckCategory) => void }) {
    const { is_hours_based, latest_km_per_liter, latest_odometer } = truck;

    const consumptionUnit = is_hours_based ? 'hr/l' : 'km/l';
    const odoLabel = is_hours_based ? 'Total Hours' : 'Odometer';
    const odoUnit = is_hours_based ? ' hrs' : ' km';
    
    const categoryTriggerClass = cn(
      "w-32 text-xs h-8 text-black",
      is_hours_based 
        ? "bg-yellow-300 hover:bg-yellow-400 focus:ring-yellow-400" 
        : "bg-green-300 hover:bg-green-400 focus:ring-green-400"
    );

    const categoryContentClass = cn(
        "text-black",
        is_hours_based ? "bg-yellow-100" : "bg-green-100"
    );

    const isServiceWarningActive = useMemo(() => {
        if (truck.next_service_km && truck.latest_odometer) {
            const diff = truck.next_service_km - truck.latest_odometer;
            const threshold = truck.service_warning_threshold || (truck.is_hours_based ? 50 : 1500);
            return diff > 0 && diff <= threshold;
        }
        return false;
    }, [truck]);
    
    const renderServiceDue = () => {
        if (truck.next_service_km && truck.latest_odometer) {
            const kmUntilService = truck.next_service_km - truck.latest_odometer;
            
            if (kmUntilService <= 0) {
                return <span className="font-semibold text-red-600">{kmUntilService.toLocaleString()}{odoUnit}</span>;
            }
            if (isServiceWarningActive) {
                return <span className="font-semibold text-orange-500">{kmUntilService.toLocaleString()}{odoUnit}</span>;
            }
            return <span className="font-semibold text-gray-900">{kmUntilService.toLocaleString()}{odoUnit}</span>;
        }
        return <span className="font-semibold text-gray-900">N/A</span>;
    };

    return (
        <Card className="flex flex-col shadow-md hover:shadow-lg transition-shadow bg-white group">
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
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Service Due In</span>
                        {renderServiceDue()}
                    </div>
                     <div className="flex justify-between text-sm pt-2 border-t mt-2">
                        <span className="text-gray-600">Driver</span>
                        <span className="font-semibold text-gray-900">{truck.worker_name || 'Unassigned'}</span>
                    </div>
                    {(truck.has_pre_trip_issues || (truck.category === 'needs attention' && truck.missing_fields && truck.missing_fields.length > 0) || isServiceWarningActive) && (
                        <div className="mt-3 pt-3 border-t border-dashed border-red-300">
                            <div className="flex items-start text-red-600">
                                <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                    {isServiceWarningActive && (
                                        <p className="text-xs font-bold">Vehicle requires service soon</p>
                                    )}
                                    {truck.has_pre_trip_issues && (
                                        <p className="text-xs font-bold">Pre-trip check indicates issues</p>
                                    )}
                                    {truck.category === 'needs attention' && truck.missing_fields && truck.missing_fields.length > 0 && (
                                        <>
                                            <p className="text-xs font-bold mt-1">Missing Info:</p>
                                            <p className="text-xs leading-tight">{truck.missing_fields.join(', ')}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Link>
            <div className="flex items-center gap-1 p-4 pt-0">
                <Select value={truck.category || 'other'} onValueChange={(value) => onUpdateCategory(truck.id, value as TruckCategory)}>
                    <SelectTrigger className={categoryTriggerClass}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={categoryContentClass}>
                        <SelectItem value="30 palette">30 Palette</SelectItem>
                        <SelectItem value="16 palette">16 Palette</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="needs attention">Needs Attention</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 ml-auto" onClick={(e) => {
                    e.stopPropagation();
                    onDelete(truck)
                }}>
                    <Trash2 size={18} />
                </Button>
            </div>
        </Card>
    )
}
