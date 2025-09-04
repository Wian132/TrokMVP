// src/app/(shell)/admin/check-ins/page.tsx
'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { type Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Camera } from 'lucide-react';
import { Toaster, toast } from 'sonner';

// --- Type Definitions ---
type Truck = Pick<Database['public']['Tables']['trucks']['Row'], 'id' | 'license_plate'>;
type PreTripCheck = Database['public']['Tables']['pre_trip_checks']['Row'];
type CheckWithWorker = PreTripCheck & {
  workers: {
    profiles: {
      full_name: string | null;
    } | null;
  } | null;
};

const CHECKS_PER_PAGE = 15;

// --- Helper function to summarize issues ---
const getIssuesSummary = (check: PreTripCheck): { summary: string, issues: string[], hasIssues: boolean } => {
    const issues: string[] = [];
    if (!check.windshield_ok) issues.push("Windshield");
    if (!check.windows_ok) issues.push("Windows");
    if (!check.mirrors_ok) issues.push("Mirrors");
    if (!check.lights_ok) issues.push("Lights");
    if (!check.brakes_ok) issues.push("Brakes");
    if (!check.hooter_ok) issues.push("Hooter");
    if (!check.fridge_ok) issues.push("Fridge");
    if (!check.oil_level_ok) issues.push("Oil Level");
    if (!check.coolant_level_ok) issues.push("Coolant Level");
    if (!check.tires_ok) issues.push("Tires");
    if (check.other_issues) issues.push(`Other: ${check.other_issues}`);
    
    const hasIssues = issues.length > 0;
    const summary = hasIssues ? `${issues.length} issue(s)` : 'All Clear';

    return { summary, issues, hasIssues };
};

// --- Image Component with Loading State ---
const ImageWithLoader = ({ src, alt }: { src: string; alt: string }) => {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="relative w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
            {isLoading && <span className="text-gray-500 text-sm">Loading...</span>}
            <a href={src} target="_blank" rel="noopener noreferrer">
                <Image 
                    src={src} 
                    alt={alt} 
                    width={200}
                    height={200}
                    className={`rounded-lg object-cover w-full h-full transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100 hover:opacity-80'}`}
                    onLoad={() => setIsLoading(false)}
                    onError={() => setIsLoading(false)} // Also stop loading on error
                />
            </a>
        </div>
    );
};


// --- Main Page Component ---
const CheckInsPage = () => {
  const supabase = createClient();
  const searchParams = useSearchParams();
  
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [checks, setChecks] = useState<CheckWithWorker[]>([]);
  
  const [loadingTrucks, setLoadingTrucks] = useState(true);
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ pressure: string[], surface: string[] }>({ pressure: [], surface: [] });

  useEffect(() => {
    const truckIdFromUrl = searchParams.get('truckId');
    if (truckIdFromUrl) {
      setSelectedTruckId(truckIdFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchTrucks = async () => {
      setLoadingTrucks(true);
      const { data, error } = await supabase
        .from('trucks')
        .select('id, license_plate')
        .order('license_plate', { ascending: true });

      if (error) {
        toast.error(error.message);
      } else {
        setTrucks(data || []);
      }
      setLoadingTrucks(false);
    };
    fetchTrucks();
  }, [supabase]);

  const fetchChecks = useCallback(async () => {
    if (!selectedTruckId) {
      setChecks([]);
      return;
    }
    setLoadingChecks(true);
    setCurrentPage(1);

    const { data, error } = await supabase
      .from('pre_trip_checks')
      .select(`
        *,
        workers (
          profiles (
            full_name
          )
        )
      `)
      .eq('truck_id', selectedTruckId)
      .order('checked_at', { ascending: false });

    if (error) {
        toast.error(error.message);
    } else {
      setChecks((data as CheckWithWorker[]) || []);
    }
    setLoadingChecks(false);
  }, [selectedTruckId, supabase]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  const paginatedChecks = useMemo(() => {
    const startIndex = (currentPage - 1) * CHECKS_PER_PAGE;
    return checks.slice(startIndex, startIndex + CHECKS_PER_PAGE);
  }, [checks, currentPage]);

  const totalPages = Math.ceil(checks.length / CHECKS_PER_PAGE);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const openImageViewer = (check: PreTripCheck) => {
    setSelectedImages({
      pressure: check.tyre_pressure_images || [],
      surface: check.tyre_surface_images || [],
    });
    setIsImageViewerOpen(true);
  };


  return (
    <div className="p-4 md:p-8 space-y-8">
        <Toaster richColors position="top-center" />
      <h1 className="text-2xl font-bold text-gray-800">View Pre-Trip Check-Ins</h1>

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
              <h2 className="text-xl font-semibold text-gray-700">Check-In History for {trucks.find(t => t.id.toString() === selectedTruckId)?.license_plate}</h2>
          </div>
          {loadingChecks ? <p>Loading check-ins...</p> : checks.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checked By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Images</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedChecks.map((check) => {
                      const { summary, issues, hasIssues } = getIssuesSummary(check);
                      const workerName = check.workers?.profiles?.full_name || 'Unknown';
                      const hasImages = (check.tyre_pressure_images && check.tyre_pressure_images.length > 0) || (check.tyre_surface_images && check.tyre_surface_images.length > 0);
                      return (
                      <tr key={check.id}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">{formatDate(check.checked_at)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{workerName}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                            {hasIssues ? (
                                <span className="flex items-center gap-2 font-semibold text-red-600"><XCircle className="h-4 w-4" />{summary}</span>
                            ) : (
                                <span className="flex items-center gap-2 font-semibold text-green-600"><CheckCircle className="h-4 w-4" />{summary}</span>
                            )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 truncate max-w-xs" title={issues.join(', ')}>
                            {hasIssues ? issues.join(', ') : '-'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {hasImages ? (
                            <Button variant="outline" size="sm" onClick={() => openImageViewer(check)}>
                              <Camera className="h-4 w-4 mr-2" /> View Images
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                  <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ArrowLeft className="h-4 w-4 mr-2" />Previous</Button>
                  <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                  <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next<ArrowRight className="h-4 w-4 ml-2" /></Button>
                </div>
              )}
            </>
          ) : <p className="text-gray-500">No check-ins found for this truck.</p>}
        </div>
      )}

        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
            <DialogContent className="max-w-4xl bg-white">
                <DialogHeader>
                    <DialogTitle>Check-in Images</DialogTitle>
                    <DialogDescription>Images uploaded for tyre pressure and surface condition.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto p-4">
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Tyre Pressure Images</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {selectedImages.pressure.length > 0 ? (
                                selectedImages.pressure.map((url, index) => (
                                    <ImageWithLoader key={index} src={url} alt={`Tyre pressure ${index + 1}`} />
                                ))
                            ) : <p className="text-gray-500 col-span-2">No pressure images uploaded.</p>}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Tyre Surface Images</h3>
                        <div className="grid grid-cols-2 gap-4">
                             {selectedImages.surface.length > 0 ? (
                                selectedImages.surface.map((url, index) => (
                                     <ImageWithLoader key={index} src={url} alt={`Tyre surface ${index + 1}`} />
                                ))
                            ) : <p className="text-gray-500 col-span-2">No surface images uploaded.</p>}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => setIsImageViewerOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
};

export default CheckInsPage;