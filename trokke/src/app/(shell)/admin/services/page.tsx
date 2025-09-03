// src/app/(shell)/admin/services/page.tsx
'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { type Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Wrench, PlusCircle, Pencil, Trash2, Filter, ArrowLeft, ArrowRight } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import Link from 'next/link';

// --- Type Definitions ---
type Service = Database['public']['Tables']['services']['Row'];
type Truck = Pick<Database['public']['Tables']['trucks']['Row'], 'id' | 'license_plate'>;
type ServiceWithTruck = Service & {
  trucks: Pick<Truck, 'license_plate'> | null;
};
type ServiceInsert = Database['public']['Tables']['services']['Insert'];
type ServiceUpdate = Database['public']['Tables']['services']['Update'];
type FilterState = {
    startDate: string;
    endDate: string;
    minPrice: string;
    maxPrice: string;
    licensePlate: string;
    supplier: string;
};

const SERVICES_PER_PAGE = 10; // Updated to 10 entries per page

// --- Reusable Modal for Adding/Editing Services ---
interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (serviceData: ServiceInsert | ServiceUpdate) => Promise<void>;
  service: ServiceWithTruck | null;
  trucks: Truck[];
}

function ServiceModal({ isOpen, onClose, onSave, service, trucks }: ServiceModalProps) {
  const [formData, setFormData] = useState<Partial<Service>>({});
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (service) {
        setFormData({
          ...service,
          service_date: service.service_date ? service.service_date.split('T')[0] : '',
        });
        setSelectedTruckId(service.truck_id.toString());
      } else {
        setFormData({
          service_date: new Date().toISOString().split('T')[0],
          odo_reading: null,
          supplier: '',
          comments: '',
          expense_amount: null,
          oil_filter: false,
          diesel_filter: false,
          air_filter: false,
          tires: false,
          brakes: false,
        });
        setSelectedTruckId('');
      }
    }
  }, [service, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
  };
  
  const handleCheckboxChange = (name: keyof Service) => {
    setFormData(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service && !selectedTruckId) {
        toast.error("You must select a truck.");
        return;
    }
    setIsSaving(true);
    const dataToSave = {
      ...formData,
      odo_reading: formData.odo_reading ? Number(formData.odo_reading) : null,
      expense_amount: formData.expense_amount ? Number(formData.expense_amount) : null,
      truck_id: parseInt(selectedTruckId, 10),
    };
    await onSave(dataToSave as ServiceUpdate);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-gray-900 sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{service ? 'Edit Service Record' : 'Add New Service Record'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
                <Label htmlFor="truck_id">Truck</Label>
                <Select required value={selectedTruckId} onValueChange={setSelectedTruckId} disabled={!!service}>
                    <SelectTrigger className="w-full bg-white text-black"><SelectValue placeholder="Select a truck..." /></SelectTrigger>
                    <SelectContent className="bg-white text-black">
                        {trucks.map(truck => <SelectItem key={truck.id} value={truck.id.toString()}>{truck.license_plate}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label htmlFor="service_date">Service Date</Label><Input id="service_date" name="service_date" type="date" value={String(formData.service_date || '')} onChange={handleChange} required className="bg-white text-black" /></div>
            <div><Label htmlFor="odo_reading">Odometer</Label><Input id="odo_reading" name="odo_reading" type="number" placeholder="e.g., 125000" value={String(formData.odo_reading || '')} onChange={handleChange} required className="bg-white text-black" /></div>
            <div><Label htmlFor="supplier">Supplier</Label><Input id="supplier" name="supplier" value={formData.supplier || ''} onChange={handleChange} required className="bg-white text-black" /></div>
            <div><Label htmlFor="expense_amount">Total Cost (R)</Label><Input id="expense_amount" name="expense_amount" type="number" step="0.01" value={String(formData.expense_amount || '')} onChange={handleChange} required className="bg-white text-black" /></div>
          </div>
          <div><Label htmlFor="comments">Description</Label><Textarea id="comments" name="comments" value={formData.comments || ''} onChange={handleChange} className="bg-white text-black" /></div>
          <div>
            <Label>Items Serviced</Label>
            <div className="mt-2 grid grid-cols-3 gap-4 p-4 border rounded-md bg-gray-50">
              {['oil_filter', 'diesel_filter', 'air_filter', 'tires', 'brakes'].map(item => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox id={item} checked={!!formData[item as keyof Service]} onCheckedChange={() => handleCheckboxChange(item as keyof Service)} />
                  <Label htmlFor={item} className="capitalize text-black">{item.replace('_', ' ')}</Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}>
                {isSaving ? 'Saving...' : (service ? 'Save Changes' : 'Create Record')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page Component ---
export default function ServicesPage() {
  const supabase = createClient();
  const [services, setServices] = useState<ServiceWithTruck[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceWithTruck | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceWithTruck | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    startDate: '', endDate: '', minPrice: '', maxPrice: '', licensePlate: '', supplier: ''
  });

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    const servicesPromise = supabase.from('services').select('*, trucks(license_plate)').order('service_date', { ascending: false });
    const trucksPromise = supabase.from('trucks').select('id, license_plate').order('license_plate');
    const [servicesResult, trucksResult] = await Promise.all([servicesPromise, trucksPromise]);
    if (servicesResult.error) toast.error(servicesResult.error.message);
    else setServices((servicesResult.data as ServiceWithTruck[]) || []);
    if (trucksResult.error) toast.error(trucksResult.error.message);
    else setTrucks(trucksResult.data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const filteredServices = useMemo(() => {
    return services.filter(service => {
        const serviceDate = new Date(service.service_date!);
        const startDate = filters.startDate ? new Date(filters.startDate) : null;
        const endDate = filters.endDate ? new Date(filters.endDate) : null;
        if (startDate && serviceDate < startDate) return false;
        if (endDate && serviceDate > endDate) return false;
        const price = service.expense_amount || 0;
        if (filters.minPrice && price < parseFloat(filters.minPrice)) return false;
        if (filters.maxPrice && price > parseFloat(filters.maxPrice)) return false;
        const licensePlate = service.trucks?.license_plate || '';
        if (filters.licensePlate && !licensePlate.toLowerCase().includes(filters.licensePlate.toLowerCase())) return false;
        const supplier = service.supplier || '';
        if (filters.supplier && !supplier.toLowerCase().includes(filters.supplier.toLowerCase())) return false;
        return true;
    });
  }, [services, filters]);

  const handleSaveService = async (serviceData: ServiceInsert | ServiceUpdate) => {
    const isUpdating = 'id' in serviceData && serviceData.id;
    const query = isUpdating
      ? supabase.from('services').update(serviceData).eq('id', serviceData.id)
      : supabase.from('services').insert(serviceData as ServiceInsert);
    const { error } = await query;
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Service record successfully ${isUpdating ? 'updated' : 'added'}.`);
      await fetchAllData();
      handleCloseModal();
    }
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    const { error } = await supabase.from('services').delete().eq('id', serviceToDelete.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Service record deleted.');
      await fetchAllData();
    }
    setServiceToDelete(null);
  };

  const handleOpenAddModal = () => { setEditingService(null); setIsModalOpen(true); };
  const handleOpenEditModal = (service: ServiceWithTruck) => { setEditingService(service); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingService(null); };
  const handleFilterChange = (field: keyof FilterState, value: string) => { setFilters(prev => ({ ...prev, [field]: value })); };

  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * SERVICES_PER_PAGE;
    return filteredServices.slice(startIndex, startIndex + SERVICES_PER_PAGE);
  }, [filteredServices, currentPage]);
  const totalPages = Math.ceil(filteredServices.length / SERVICES_PER_PAGE);

  useEffect(() => { setCurrentPage(1) }, [filters]);

  return (
    <div className="p-4 md:p-8 space-y-8">
      <Toaster richColors position="top-center" />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Wrench className="h-6 w-6" /> Manage Service Records</h1>
        <Button onClick={handleOpenAddModal} className="bg-indigo-600 hover:bg-indigo-700">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Service
        </Button>
      </div>
      
      <Collapsible>
        <CollapsibleTrigger asChild>
            <Button className="w-full md:w-auto bg-green-700 hover:bg-green-800 text-white">
                <Filter className="mr-2 h-4 w-4" />Show Filters
            </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div><Label className="text-black">License Plate</Label><Input placeholder="Search license plate..." value={filters.licensePlate} onChange={e => handleFilterChange('licensePlate', e.target.value)} className="bg-white text-black" /></div>
                <div><Label className="text-black">Supplier</Label><Input placeholder="Search supplier..." value={filters.supplier} onChange={e => handleFilterChange('supplier', e.target.value)} className="bg-white text-black" /></div>
                <div><Label className="text-black">Start Date</Label><Input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="bg-white text-black" /></div>
                <div><Label className="text-black">End Date</Label><Input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="bg-white text-black" /></div>
                <div className="flex flex-col"><Label className="text-black">Price Range</Label><div className="flex gap-2"><Input type="number" placeholder="Min" value={filters.minPrice} onChange={e => handleFilterChange('minPrice', e.target.value)} className="bg-white text-black" /><Input type="number" placeholder="Max" value={filters.maxPrice} onChange={e => handleFilterChange('maxPrice', e.target.value)} className="bg-white text-black" /></div></div>
            </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="bg-white p-6 rounded-lg shadow-md">
        {loading ? <p>Loading records...</p> : filteredServices.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Truck</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Supplier</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Description</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase">Cost</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedServices.map((service) => (
                    <tr key={service.id}>
                      <td className="px-6 py-5 whitespace-nowrap text-base font-medium text-gray-800">{new Date(service.service_date!).toLocaleDateString()}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-base font-medium text-indigo-600 hover:underline">
                        <Link href={`/admin/trucks/${service.truck_id}`}>{service.trucks?.license_plate || 'N/A'}</Link>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-base font-medium text-gray-600">{service.supplier}</td>
                      <td className="px-6 py-5 text-base font-medium text-gray-600 max-w-sm truncate" title={service.comments || ''}>{service.comments || '-'}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-base font-medium text-gray-600 text-right">R {service.expense_amount?.toFixed(2) ?? '0.00'}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(service)}><Pencil className="h-5 w-5 text-green-600" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setServiceToDelete(service)}><Trash2 className="h-5 w-5 text-red-500" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-8 flex w-full items-center justify-center gap-4">
                <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="bg-green-700 hover:bg-green-800 text-white"><ArrowLeft className="h-4 w-4 mr-2" /> Previous Page</Button>
                <span className="text-sm font-medium text-gray-700">Page {currentPage} of {totalPages}</span>
                <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="bg-green-700 hover:bg-green-800 text-white">Next Page <ArrowRight className="h-4 w-4 ml-2" /></Button>
              </div>
            )}
          </>
        ) : <p className="text-center text-gray-500 py-8">No service records found for the selected filters.</p>}
      </div>
      <ServiceModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveService} service={editingService} trucks={trucks} />
      <Dialog open={!!serviceToDelete} onOpenChange={() => setServiceToDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle><DialogDescription>Are you sure you want to delete this service record? This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setServiceToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteService}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}