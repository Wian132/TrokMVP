'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ArrowPathIcon, LinkIcon, ChevronUpDownIcon, MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

// --- Utility Function for Fuzzy Matching ---

/**
 * Calculates the Levenshtein distance between two strings.
 * @param a The first string.
 * @param b The second string.
 * @returns The Levenshtein distance.
 */
const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,       // Deletion
        matrix[j - 1][i] + 1,       // Insertion
        matrix[j - 1][i - 1] + cost // Substitution
      );
    }
  }

  return matrix[b.length][a.length];
};


// --- Type Definitions ---

type WorkerProfile = {
  id: number;
  full_name: string;
};

type WorkerWithProfile = {
  id: number;
  profiles: {
    full_name: string | null;
  } | null;
};

// --- Searchable Dropdown Component ---

const SearchableDropdown = ({
  workers,
  selectedWorkerId,
  onSelect,
}: {
  workers: WorkerProfile[];
  selectedWorkerId: string;
  onSelect: (workerId: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredWorkers = useMemo(() =>
    workers.filter(worker =>
      worker.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [workers, searchTerm]);

  const selectedWorkerName = workers.find(w => w.id.toString() === selectedWorkerId)?.full_name || 'Select a Worker';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full min-w-[240px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex-grow w-full p-2 border rounded-md text-gray-900 bg-white shadow-sm flex justify-between items-center text-left"
      >
        <span className="truncate">{selectedWorkerName}</span>
        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 sticky top-0 bg-white border-b">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute top-1/2 left-2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search workers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 p-1.5 border rounded-md text-black"
              />
            </div>
          </div>
          <ul>
            {filteredWorkers.map(worker => (
              <li
                key={worker.id}
                onClick={() => {
                  onSelect(worker.id.toString());
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900"
              >
                {worker.full_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};


// --- Main Page Component ---

const LinkWorkersPage = () => {
  const supabase = createClient();

  const [allNames, setAllNames] = useState<string[]>([]);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [linkedAliases, setLinkedAliases] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Record<string, string>>({});
  const [nameSearchTerm, setNameSearchTerm] = useState('');

  const fetchRequiredData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1. Fetch ALL distinct worker names from the trips table
    const { data: namesData, error: namesError } = await supabase
      .from('truck_trips')
      .select('worker_name', { count: 'exact', head: false });

    if (namesError) {
      setError(`Failed to fetch trip names: ${namesError.message}`);
      setLoading(false);
      return;
    }
    const uniqueNames = Array.from(new Set(namesData.map(item => item.worker_name).filter(Boolean))) as string[];
    uniqueNames.sort((a, b) => a.localeCompare(b));
    setAllNames(uniqueNames);

    // 2. Fetch all worker profiles
    const { data: workersData, error: workersError } = await supabase
      .from('workers')
      .select('id, profiles(full_name)');

    if (workersError) {
      setError(`Failed to fetch workers: ${workersError.message}`);
      setLoading(false);
      return;
    }
    const formattedWorkers = (workersData as unknown as WorkerWithProfile[])
      .map(w => ({
        id: w.id,
        full_name: w.profiles?.full_name || '',
      }))
      .filter(w => w.full_name)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
    setWorkers(formattedWorkers);

    // 3. Fetch all existing aliases to know which names are already linked
    const { data: aliasesData, error: aliasesError } = await supabase
        .from('worker_name_aliases')
        .select('alias_name, worker_id');

    if (aliasesError) {
        setError(`Failed to fetch existing aliases: ${aliasesError.message}`);
        setLoading(false);
        return;
    }
    const aliasMap = new Map(aliasesData.map(a => [a.alias_name, a.worker_id]));
    setLinkedAliases(aliasMap);

    // 4. Pre-populate dropdowns
    const selections: Record<string, string> = {};
    uniqueNames.forEach(name => {
        if (aliasMap.has(name)) {
            // If already linked, use the existing link
            selections[name] = aliasMap.get(name)!.toString();
        } else {
            // If not linked, suggest the best match
            let bestMatch = { id: '', distance: Infinity };
            formattedWorkers.forEach(worker => {
                const distance = levenshteinDistance(name, worker.full_name);
                if (distance < bestMatch.distance) {
                    bestMatch = { id: worker.id.toString(), distance };
                }
            });
            // Only auto-suggest if the match is reasonably close (e.g., distance < 3)
            if (bestMatch.id && bestMatch.distance < 3) {
                selections[name] = bestMatch.id;
            }
        }
    });
    setSelectedWorkerIds(selections);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchRequiredData();
  }, [fetchRequiredData]);

  const handleSelectChange = (aliasName: string, workerId: string) => {
    setSelectedWorkerIds(prev => ({ ...prev, [aliasName]: workerId }));
  };

  const handleLinkWorker = async (aliasName: string) => {
    const workerId = selectedWorkerIds[aliasName];
    if (!workerId) {
      setStatusMessage(`Please select a worker profile for "${aliasName}" first.`);
      return;
    }
    setStatusMessage(`Linking "${aliasName}"...`);
    setError(null);

    // Use upsert to either create a new alias or update an existing one.
    // The 'alias_name' is the conflict target.
    const { error: upsertError } = await supabase
      .from('worker_name_aliases')
      .upsert({ alias_name: aliasName, worker_id: parseInt(workerId, 10) }, { onConflict: 'alias_name' });

    if (upsertError) {
      setError(`Failed to save alias: ${upsertError.message}`);
      setStatusMessage(null);
      return;
    }

    // The database trigger handles updating the trips, so no RPC call is needed here.
    setStatusMessage(`Successfully saved link for "${aliasName}". Trips will be updated automatically.`);
    // Refresh the data to show the new link status
    await fetchRequiredData();
  };

  const filteredNames = useMemo(() => {
    return allNames.filter(name => name.toLowerCase().includes(nameSearchTerm.toLowerCase()));
  }, [allNames, nameSearchTerm]);

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Link Worker Names</h1>
        <button
            onClick={() => fetchRequiredData()}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            <ArrowPathIcon className={`-ml-1 mr-2 h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh List
        </button>
      </div>

      {error && (
        <div className="my-4 p-3 rounded-md text-sm bg-red-100 text-red-800">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}
      {statusMessage && (
        <div className="my-4 p-3 rounded-md text-sm bg-blue-100 text-blue-800">
          <p>{statusMessage}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
            <div>
                <h2 className="text-xl font-semibold text-gray-700">Trip Record Names</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage which worker profile is linked to each name found in trip records.
                </p>
            </div>
            <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2" />
                <input
                    type="text"
                    placeholder="Search names..."
                    value={nameSearchTerm}
                    onChange={(e) => setNameSearchTerm(e.target.value)}
                    className="w-full sm:w-64 pl-10 p-2 border rounded-md text-black"
                />
            </div>
        </div>
        
        {loading ? (
          <p>Loading worker names...</p>
        ) : filteredNames.length > 0 ? (
          <div className="space-y-4">
            {filteredNames.map(name => (
              <div key={name} className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center mb-2 sm:mb-0">
                    {/* THIS IS THE CORRECTED LOGIC FOR THE CHECKMARK */}
                    {linkedAliases.has(name) ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" title="Linked in database" />
                    ) : (
                        <XCircleIcon className="h-6 w-6 text-red-500 mr-3 flex-shrink-0" title="Not linked in database" />
                    )}
                    <span className="font-bold text-gray-800">{name}</span>
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <SearchableDropdown
                    workers={workers}
                    selectedWorkerId={selectedWorkerIds[name] || ''}
                    onSelect={(workerId) => handleSelectChange(name, workerId)}
                  />
                  <button
                    onClick={() => handleLinkWorker(name)}
                    disabled={!selectedWorkerIds[name]}
                    className="flex items-center bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LinkIcon className="h-4 w-4 mr-1" />
                    {linkedAliases.has(name) ? 'Update' : 'Link'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            {allNames.length > 0 && nameSearchTerm ? 'No matching names found.' : 'No names found in trip records.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default LinkWorkersPage;
