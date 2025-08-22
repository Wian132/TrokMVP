"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, FilterIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';

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

// --- Type Definitions ---

// Raw data from the updated RPC call
type WorkerAnalyticsRawData = {
  worker_id: number;
  worker_name: string;
  total_trips: number;
  total_km: number;
  total_liters: number;
  total_preday_checks: number;
};

// Processed data including calculated fields
type WorkerAnalyticsProcessedData = WorkerAnalyticsRawData & {
  cost_per_km: number;
};

type SortKey = keyof WorkerAnalyticsProcessedData;
type SortConfig = { key: SortKey; direction: 'ascending' | 'descending' } | null;

// Type for the new advanced range filters
type FilterState = {
    cost_per_km: [number, number];
    total_km: [number, number];
    total_trips: [number, number];
}

// --- Main Component ---

export default function WorkerAnalytics() {
  const supabase = createClient();
  const [analyticsData, setAnalyticsData] = useState<WorkerAnalyticsRawData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'worker_name', direction: 'ascending' });
  
  // State for advanced filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fuelPrice, setFuelPrice] = useState<string>(() => getCookie('fuelPrice') || '');
  const [filters, setFilters] = useState<FilterState>({
    cost_per_km: [0, 50],
    total_km: [0, 200000],
    total_trips: [0, 500],
  });

  // Persist fuel price in cookies
  useEffect(() => {
    setCookie('fuelPrice', fuelPrice, 365);
  }, [fuelPrice]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc('get_all_worker_analytics', {
        start_date: startDate || null,
        end_date: endDate || null
    });

    if (error) {
      console.error('Error fetching worker analytics:', error);
      setError('Failed to load worker analytics.');
      setAnalyticsData([]);
    } else {
      setAnalyticsData(data || []);
    }
    setIsLoading(false);
  }, [supabase, startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Memoized function to process data (calculate cost/km)
  const processedAnalytics = useMemo(() => {
    const price = parseFloat(fuelPrice);
    if (!price || isNaN(price)) {
        return analyticsData.map(item => ({...item, cost_per_km: 0}));
    }
    return analyticsData.map(item => {
        const totalFuelCost = item.total_liters * price;
        const cost_per_km = item.total_km > 0 ? totalFuelCost / item.total_km : 0;
        return { ...item, cost_per_km };
    });
  }, [analyticsData, fuelPrice]);

  // Memoized function to sort and filter the processed data
  const sortedAndFilteredAnalytics = useMemo(() => {
    let filteredItems = [...processedAnalytics];

    // Apply search term filter
    if (searchTerm) {
      filteredItems = filteredItems.filter(item =>
        item.worker_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply range filters
    filteredItems = filteredItems.filter(item => 
        item.cost_per_km >= filters.cost_per_km[0] && item.cost_per_km <= filters.cost_per_km[1] &&
        item.total_km >= filters.total_km[0] && item.total_km <= filters.total_km[1] &&
        item.total_trips >= filters.total_trips[0] && item.total_trips <= filters.total_trips[1]
    );

    // Apply sorting
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
  }, [processedAnalytics, searchTerm, sortConfig, filters]);

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

  const formatNumber = (num: number | null | undefined) => num ? num.toLocaleString('en-US') : '0';
  const formatCurrency = (num: number | null | undefined) => `R ${num ? num.toFixed(2) : '0.00'}`;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold text-black">Worker Analytics Table</h1>
        <div className="w-full md:w-1/2">
          <Input 
            placeholder="Search by worker name..."
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="flex items-end">
                    <Button onClick={fetchAnalytics} className="w-full bg-green-600 text-white hover:bg-green-700">Apply Filters</Button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <RangeFilter label="Cost / KM" value={filters.cost_per_km} onChange={(idx, val) => handleFilterChange('cost_per_km', idx, val)} />
                <RangeFilter label="Total KM Driven" value={filters.total_km} onChange={(idx, val) => handleFilterChange('total_km', idx, val)} />
                <RangeFilter label="Total Trips" value={filters.total_trips} onChange={(idx, val) => handleFilterChange('total_trips', idx, val)} />
            </div>
        </CollapsibleContent>
      </Collapsible>

      {isLoading && <p className="text-center py-10 text-black">Loading analytics data...</p>}
      {error && <p className="text-red-500 bg-red-100 p-4 rounded-md">{error}</p>}
      
      {!isLoading && !error && (
        <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortableButton columnKey="worker_name" sortConfig={sortConfig} requestSort={requestSort}>Worker</SortableButton></TableHead>
                <TableHead className="text-right"><SortableButton columnKey="cost_per_km" sortConfig={sortConfig} requestSort={requestSort}>Cost / KM</SortableButton></TableHead>
                <TableHead className="text-right"><SortableButton columnKey="total_km" sortConfig={sortConfig} requestSort={requestSort}>Total KM Driven</SortableButton></TableHead>
                <TableHead className="text-right"><SortableButton columnKey="total_preday_checks" sortConfig={sortConfig} requestSort={requestSort}>Pre-Day Checks</SortableButton></TableHead>
                <TableHead className="text-right"><SortableButton columnKey="total_trips" sortConfig={sortConfig} requestSort={requestSort}>Total Trips</SortableButton></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredAnalytics.map((worker) => (
                <TableRow key={worker.worker_id}>
                  <TableCell className="font-medium text-black">{worker.worker_name}</TableCell>
                  <TableCell className="text-right font-bold text-lg text-black">{formatCurrency(worker.cost_per_km)}</TableCell>
                  <TableCell className="text-right text-black">{formatNumber(worker.total_km)} km</TableCell>
                  <TableCell className="text-right text-black">{formatNumber(worker.total_preday_checks)}</TableCell>
                  <TableCell className="text-right text-black">{formatNumber(worker.total_trips)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// --- Helper Component for Sortable Table Headers ---
interface SortableButtonProps {
  columnKey: SortKey;
  sortConfig: SortConfig;
  requestSort: (key: SortKey) => void;
  children: React.ReactNode;
}

const SortableButton = ({ columnKey, requestSort, children }: SortableButtonProps) => (
  <Button variant="ghost" onClick={() => requestSort(columnKey)} className="px-2 text-black hover:bg-gray-100">
    {children}
    <ArrowUpDown className="ml-2 h-4 w-4" />
  </Button>
);

// --- Helper Component for Range Filters ---
interface RangeFilterProps {
    label: string;
    value: [number, number];
    onChange: (index: 0 | 1, value: string) => void;
}

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
