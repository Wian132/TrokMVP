// src/app/(shell)/admin/fleet-analytics/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, FilterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- Helper functions for cookies ---
const setCookie = (name: string, value: string, days: number) => {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

const getCookie = (name: string): string | null => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}


// Define the type for our analytics data based on the RPC function's return
type FleetAnalytic = {
  truck_id: number;
  license_plate: string;
  make: string | null;
  model: string | null;
  assigned_worker_name: string | null;
  total_km: number;
  total_liters: number;
  total_fuel_cost: number;
  total_service_cost: number;
  avg_kml: number;
  cost_per_km: number;
  current_odo: number | null;
  next_service_km: number | null;
  is_hours_based: boolean; // ADDED
};

type SortKey = keyof FleetAnalytic;
type SortConfig = { key: SortKey; direction: 'ascending' | 'descending' } | null;

// Type for our new advanced filters
type FilterState = {
    cost_per_km: [number, number];
    avg_kml: [number, number];
    total_km: [number, number];
}

const FleetAnalyticsPage = () => {
  const supabase = createClient();
  const [analytics, setAnalytics] = useState<FleetAnalytic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'cost_per_km', direction: 'descending' });
  
  // State for new filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fuelPrice, setFuelPrice] = useState<string>(() => getCookie('fuelPrice') || '');
  const [truckTypeFilter, setTruckTypeFilter] = useState<'all' | 'km' | 'hours'>('all'); // ADDED
  const [filters, setFilters] = useState<FilterState>({
      cost_per_km: [0, 50],
      avg_kml: [0, 20],
      total_km: [0, 100000],
  });

  useEffect(() => {
    setCookie('fuelPrice', fuelPrice, 365);
  }, [fuelPrice]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase.rpc('get_fleet_analytics', {
        start_date: startDate || null,
        end_date: endDate || null
    });

    if (error) {
      setError(`Failed to fetch fleet analytics: ${error.message}`);
      console.error(error);
    } else {
      setAnalytics(data || []);
    }
    setLoading(false);
  }, [supabase, startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const processedAnalytics = useMemo(() => {
    const price = parseFloat(fuelPrice);
    if (!price || isNaN(price)) return analytics;

    return analytics.map(item => {
        const consumption = item.is_hours_based ? (item.total_km > 0 ? item.total_liters / item.total_km : 0) : (item.avg_kml);
        const hypotheticalFuelCost = item.is_hours_based ? item.total_km * consumption * price : (item.total_km / consumption) * price;
        const newTotalCost = hypotheticalFuelCost + item.total_service_cost;
        const newCostPerKm = item.total_km > 0 ? newTotalCost / item.total_km : 0;
        return { 
            ...item, 
            cost_per_km: newCostPerKm,
            total_fuel_cost: hypotheticalFuelCost 
        };
    });
  }, [analytics, fuelPrice]);

  const sortedAndFilteredAnalytics = useMemo(() => {
    let filteredItems = [...processedAnalytics];

    if (searchTerm) {
      filteredItems = filteredItems.filter(item =>
        item.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.assigned_worker_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // ADDED: Filter by truck type
    if (truckTypeFilter !== 'all') {
        filteredItems = filteredItems.filter(item => {
            if (truckTypeFilter === 'hours') return item.is_hours_based;
            if (truckTypeFilter === 'km') return !item.is_hours_based;
            return true;
        });
    }

    filteredItems = filteredItems.filter(item => 
        item.cost_per_km >= filters.cost_per_km[0] && item.cost_per_km <= filters.cost_per_km[1] &&
        item.avg_kml >= filters.avg_kml[0] && item.avg_kml <= filters.avg_kml[1] &&
        item.total_km >= filters.total_km[0] && item.total_km <= filters.total_km[1]
    );

    if (sortConfig !== null) {
      filteredItems.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? 0;
        const bValue = b[sortConfig.key] ?? 0;
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filteredItems;
  }, [processedAnalytics, sortConfig, searchTerm, filters, truckTypeFilter]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleFilterChange = (key: keyof FilterState, index: 0 | 1, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newFilter = [...filters[key]] as [number, number];
    newFilter[index] = numValue;
    setFilters(prev => ({...prev, [key]: newFilter}));
  }

  const formatCurrency = (amount: number | null) => `R ${amount ? amount.toFixed(2) : '0.00'}`;
  const formatNumber = (num: number | null) => num ? num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold text-black">Fleet Analytics Table</h1>
        <div className="w-full md:w-1/2">
            <Input 
                placeholder="Search by license, make, driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border-gray-300 text-black w-full"
            />
        </div>
      </div>

      <Collapsible>
        <CollapsibleTrigger asChild>
            <Button className="w-full md:w-auto bg-green-600 text-white hover:bg-green-700">
                <FilterIcon className="mr-2 h-4 w-4" />
                Show Advanced Filters
            </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                    <Label htmlFor="start-date" className="text-black">Start Date</Label>
                    <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white text-black"/>
                </div>
                 <div>
                    <Label htmlFor="end-date" className="text-black">End Date</Label>
                    <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white text-black"/>
                </div>
                <div>
                    <Label htmlFor="fuel-price" className="text-black">Fuel Price (R/L)</Label>
                    <Input id="fuel-price" type="number" placeholder="e.g., 23.50" value={fuelPrice} onChange={e => setFuelPrice(e.target.value)} className="bg-white text-black"/>
                </div>
                {/* ADDED: Truck Type Filter */}
                <div>
                    <Label htmlFor="truck-type" className="text-black">Truck Type</Label>
                    <Select value={truckTypeFilter} onValueChange={(value: 'all' | 'km' | 'hours') => setTruckTypeFilter(value)}>
                        <SelectTrigger className="bg-white text-black">
                            <SelectValue />
                        </SelectTrigger>
                        {/* MODIFICATION: Added classes for contrast */}
                        <SelectContent className="bg-white text-black">
                            <SelectItem value="all" className="text-black">All Types</SelectItem>
                            <SelectItem value="km" className="text-black">KM-Based</SelectItem>
                            <SelectItem value="hours" className="text-black">Hour-Based</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-end">
                     <Button onClick={fetchAnalytics} className="w-full bg-green-600 text-white hover:bg-green-700">Apply Date Filter</Button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <RangeFilter label="Cost / Unit" value={filters.cost_per_km} onChange={(idx, val) => handleFilterChange('cost_per_km', idx, val)} />
                <RangeFilter label="Avg Consumption" value={filters.avg_kml} onChange={(idx, val) => handleFilterChange('avg_kml', idx, val)} />
                <RangeFilter label="Total Distance / Hours" value={filters.total_km} onChange={(idx, val) => handleFilterChange('total_km', idx, val)} />
            </div>
        </CollapsibleContent>
      </Collapsible>

      {loading && <p className="text-center py-10 text-black">Loading analytics data...</p>}
      {error && <p className="text-red-500 bg-red-100 p-4 rounded-md">{error}</p>}
      
      {!loading && !error && (
        <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortableButton columnKey="license_plate" sortConfig={sortConfig} requestSort={requestSort}>License Plate</SortableButton></TableHead>
                <TableHead><SortableButton columnKey="assigned_worker_name" sortConfig={sortConfig} requestSort={requestSort}>Driver</SortableButton></TableHead>
                <TableHead className="text-right"><SortableButton columnKey="cost_per_km" sortConfig={sortConfig} requestSort={requestSort}>Cost / Unit</SortableButton></TableHead>
                <TableHead className="text-right"><SortableButton columnKey="avg_kml" sortConfig={sortConfig} requestSort={requestSort}>Avg Consumption</SortableButton></TableHead>
                <TableHead className="text-right"><SortableButton columnKey="total_fuel_cost" sortConfig={sortConfig} requestSort={requestSort}>Total Fuel Cost</SortableButton></TableHead>
                <TableHead className="text-right"><SortableButton columnKey="total_service_cost" sortConfig={sortConfig} requestSort={requestSort}>Total Service Cost</SortableButton></TableHead>
                <TableHead className="text-right"><SortableButton columnKey="total_km" sortConfig={sortConfig} requestSort={requestSort}>Total Dist/Hrs</SortableButton></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredAnalytics.map((item) => {
                // ADDED: Conditional units
                const unit = item.is_hours_based ? 'hr' : 'KM';
                const consumptionUnit = item.is_hours_based ? 'L/hr' : 'KM/L';
                
                return (
                <TableRow key={item.truck_id} className={item.is_hours_based ? 'bg-yellow-50' : ''}>
                  <TableCell className="font-medium text-black">
                    <Link href={`/admin/trucks/${item.truck_id}`} className="hover:underline text-indigo-600">
                        {item.license_plate}
                    </Link>
                    <br/>
                    <span className="text-xs text-gray-500">{item.make} {item.model}</span>
                  </TableCell>
                  <TableCell className="text-black">{item.assigned_worker_name || 'Unassigned'}</TableCell>
                  <TableCell className="text-right font-bold text-lg text-black">{formatCurrency(item.cost_per_km)} / {unit}</TableCell>
                  <TableCell className="text-right text-black">{formatNumber(item.avg_kml)} {consumptionUnit}</TableCell>
                  <TableCell className="text-right text-black">{formatCurrency(item.total_fuel_cost)}</TableCell>
                  <TableCell className="text-right text-black">{formatCurrency(item.total_service_cost)}</TableCell>
                  <TableCell className="text-right text-black">{formatNumber(item.total_km)} {unit}s</TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

// Helper component for sortable table headers
interface SortableButtonProps { columnKey: SortKey; sortConfig: SortConfig; requestSort: (key: SortKey) => void; children: React.ReactNode; }
const SortableButton = ({ columnKey, requestSort, children }: SortableButtonProps) => (
    <Button variant="ghost" onClick={() => requestSort(columnKey)} className="px-2 text-black hover:bg-gray-100">
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
);

// Helper component for range filters
interface RangeFilterProps { label: string; value: [number, number]; onChange: (index: 0 | 1, value: string) => void; }
const RangeFilter = ({ label, value, onChange }: RangeFilterProps) => (
    <div>
        <Label className="text-black">{label}</Label>
        <div className="flex items-center gap-2 mt-1">
            <Input type="number" placeholder="Min" value={value[0]} onChange={e => onChange(0, e.target.value)} className="bg-white text-black" />
            <span className="text-gray-500">-</span>
            <Input type="number" placeholder="Max" value={value[1]} onChange={e => onChange(1, e.target.value)} className="bg-white text-black" />
        </div>
    </div>
);

export default FleetAnalyticsPage;
