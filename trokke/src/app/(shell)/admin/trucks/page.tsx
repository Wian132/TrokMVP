// src/app/(shell)/admin/trucks/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useCallback, Fragment, MouseEvent, useRef, ChangeEvent } from 'react'
import { PencilIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon, ArrowPathIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import { handleImport } from '@/lib/import-actions'

// =========================
// Types
// =========================

type TruckDetails = {
  id: number
  license_plate: string
  make: string | null
  model: string | null
  year: number | null
  status: string
  category: string | null
  worker_name: string | null
  latest_odometer: number | null
  latest_km_per_liter: number | null
  total_trips: number
}

// Supabase row typing for the nested select we do below.
// workers is a 1:1 via assigned_worker_id, but to be safe we allow array | object | null.

type ProfileRow = { full_name: string | null } | null

type WorkerRow = { profiles: ProfileRow } | null

type TripRow = {
  id: number
  closing_km: number | null
  opening_km: number | null
  total_km: number | null
}

type TruckSelectRow = {
  id: number
  license_plate: string
  make: string | null
  model: string | null
  year: number | null
  status: string
  category: string | null
  last_calculated_avg_km_l: number | null
  workers: WorkerRow | WorkerRow[] | null
  truck_trips: TripRow[]
}

// Edge function response

type FunctionResponse = {
  message?: string
  error?: string
}

const TruckCategorySection = ({
  title,
  trucks,
  unassignedTrucks,
  onAssignCategory,
}: {
  title: string
  trucks: TruckDetails[]
  unassignedTrucks: TruckDetails[]
  onAssignCategory: (truckId: number, category: string) => void
}) => {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-xl font-semibold text-gray-700 cursor-pointer"
      >
        <span>
          {title} ({trucks.length})
        </span>
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
                              e.preventDefault()
                              e.stopPropagation()
                              onAssignCategory(truck.id, title)
                            }}
                            className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} block px-4 py-2 text-sm`}
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
          {trucks.map((truck) => (
            <div key={truck.id} className="border rounded-lg p-4 bg-gray-50 space-y-2">
              <p className="font-bold text-lg text-gray-800">{truck.license_plate}</p>
              <p className="text-sm text-gray-600">
                <strong>Driver:</strong> {truck.worker_name || 'Unassigned'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Total Trips:</strong> {truck.total_trips ?? 'N/A'}
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
  )
}

export default function TrucksPage() {
  const supabase = createClient()
  const [truckDetails, setTruckDetails] = useState<TruckDetails[]>([])
  const [filteredTrucks, setFilteredTrucks] = useState<TruckDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [isCalculating, setIsCalculating] = useState(false)
  const [initialCalcTriggered, setInitialCalcTriggered] = useState(false)

  const [licensePlate, setLicensePlate] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [category, setCategory] = useState<'16 palette' | '30 palette' | 'other' | ''>('')

  const [editingTruck, setEditingTruck] = useState<TruckDetails | null>(null)
  const [deletingTruck, setDeletingTruck] = useState<TruckDetails | null>(null)

  const [statusMessage, setStatusMessage] = useState<{ message?: string; error?: string } | null>(null)
  const [isFleetVisible, setIsFleetVisible] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState<boolean>(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setStatusMessage(null)

    const { data, error } = await supabase
      .from('trucks')
      .select(
        `
        id,
        license_plate,
        make,
        model,
        year,
        status,
        category,
        last_calculated_avg_km_l,
        workers ( profiles ( full_name ) ),
        truck_trips ( id, closing_km, opening_km, total_km )
      `,
      )

    if (error) {
      console.error('Error fetching truck details:', error)
      setStatusMessage({ error: 'Failed to load truck data. Please check the browser console for details.' })
      setLoading(false)
      return
    }

    const rows = (data ?? []) as unknown as TruckSelectRow[]

    const formattedData: TruckDetails[] = rows.map((truck) => {
      const trips = Array.isArray(truck.truck_trips) ? truck.truck_trips : []
      const validTrips = trips.filter((t) => t.closing_km != null || (t.opening_km != null && t.total_km != null))

      const latestOdometer =
        validTrips.length > 0
          ? Math.max(
              ...validTrips.map((t) =>
                t.closing_km != null ? t.closing_km : (t.opening_km ?? 0) + (t.total_km ?? 0),
              ),
            )
          : null

      // Safely unwrap workers -> profiles -> full_name
      const workerObj: WorkerRow | null = Array.isArray(truck.workers)
        ? truck.workers[0] ?? null
        : truck.workers ?? null
      const worker_name = workerObj?.profiles?.full_name ?? 'Unassigned'

      return {
        id: truck.id,
        license_plate: truck.license_plate,
        make: truck.make,
        model: truck.model,
        year: truck.year,
        status: truck.status,
        category: truck.category,
        worker_name,
        latest_odometer: latestOdometer,
        latest_km_per_liter: truck.last_calculated_avg_km_l,
        total_trips: trips.length,
      }
    })

    setTruckDetails(formattedData)
    setLoading(false)
  }, [supabase])

  const handleRecalculateAverages = useCallback(async () => {
    setIsCalculating(true)
    setStatusMessage({ message: 'Calculating lifetime averages... This may take a moment.' })
    const { data, error } = await supabase.functions.invoke('update-truck-analytics')
    if (error) {
      setStatusMessage({ error: `Calculation failed: ${error.message}` })
    } else {
      setStatusMessage({ message: (data as FunctionResponse).message || 'Successfully triggered recalculation. Refreshing data...' })
      await fetchData()
    }
    setIsCalculating(false)
  }, [supabase, fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!loading && truckDetails.length > 0 && !initialCalcTriggered) {
      const needsCalculation = truckDetails.some((t) => t.latest_km_per_liter === null)
      if (needsCalculation) {
        handleRecalculateAverages()
      }
      setInitialCalcTriggered(true)
    }
  }, [loading, truckDetails, initialCalcTriggered, handleRecalculateAverages])

  useEffect(() => {
    let result = truckDetails
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      result = result.filter(
        (truck) =>
          truck.license_plate.toLowerCase().includes(q) ||
          truck.make?.toLowerCase().includes(q) ||
          truck.model?.toLowerCase().includes(q),
      )
    }
    if (statusFilter) result = result.filter((truck) => truck.status === statusFilter)
    if (categoryFilter) result = result.filter((truck) => truck.category === categoryFilter)
    setFilteredTrucks(result)
  }, [searchTerm, statusFilter, categoryFilter, truckDetails])

  const categorizedTrucks = {
    '16 palette': truckDetails.filter((t) => t.category === '16 palette'),
    '30 palette': truckDetails.filter((t) => t.category === '30 palette'),
    other: truckDetails.filter((t) => t.category === 'other'),
    unassigned: truckDetails.filter((t) => !t.category),
  }

  const handleAssignCategory = async (truckId: number, newCategory: string) => {
    const { error } = await supabase.from('trucks').update({ category: newCategory }).eq('id', truckId)
    if (error) setStatusMessage({ error: `Failed to assign category: ${error.message}` })
    else {
      setStatusMessage({ message: 'Truck category updated successfully!' })
      fetchData()
    }
  }

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return
    const file = event.target.files[0]

    setIsImporting(true)
    setStatusMessage({ message: `Importing trips from ${file.name}...` })

    const formData = new FormData()
    formData.append('file', file)

    const result = await handleImport(formData)

    if (result.success) {
      setStatusMessage({ message: result.message })
      await handleRecalculateAverages()
    } else {
      setStatusMessage({ error: result.message })
    }

    setIsImporting(false)
    event.target.value = ''
  }

  async function createTruck(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase
      .from('trucks')
      .insert({ license_plate: licensePlate, make, model, year: year ? parseInt(year) : null, category: category || null })
    if (error) setStatusMessage({ error: `Error creating truck: ${error.message}` })
    else {
      setStatusMessage({ message: 'Truck created successfully!' })
      setLicensePlate('')
      setMake('')
      setModel('')
      setYear('')
      setCategory('')
      fetchData()
    }
  }

  const handleUpdateTruck = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingTruck) return
    const { error } = await supabase
      .from('trucks')
      .update({ license_plate: editingTruck.license_plate, make: editingTruck.make, model: editingTruck.model, year: editingTruck.year, category: editingTruck.category })
      .eq('id', editingTruck.id)
    if (error) setStatusMessage({ error: error.message })
    else {
      setStatusMessage({ message: 'Truck updated successfully!' })
      fetchData()
      setEditingTruck(null)
    }
  }

  const handleDeleteTruck = async () => {
    if (!deletingTruck) return
    const { error } = await supabase.from('trucks').delete().eq('id', deletingTruck.id)
    if (error) setStatusMessage({ error: error.message })
    else {
      setStatusMessage({ message: 'Truck deleted successfully!' })
      fetchData()
      setDeletingTruck(null)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
        accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
      />

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Trucks Management</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300"
          >
            <ArrowUpTrayIcon className={`-ml-1 mr-2 h-5 w-5 ${isImporting ? 'animate-spin' : ''}`} />
            {isImporting ? 'Importing...' : 'Import All Trips'}
          </button>
          <button
            onClick={handleRecalculateAverages}
            disabled={isCalculating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            <ArrowPathIcon className={`-ml-1 mr-2 h-5 w-5 ${isCalculating ? 'animate-spin' : ''}`} />
            {isCalculating ? 'Calculating...' : 'Recalculate Averages'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`my-4 p-3 rounded-md text-sm ${statusMessage.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          <p className="font-semibold">{statusMessage.error ? 'Error' : 'Success'}</p>
          <p>{statusMessage.error || statusMessage.message}</p>
        </div>
      )}

      <TruckCategorySection title="16 palette" trucks={categorizedTrucks['16 palette']} unassignedTrucks={categorizedTrucks.unassigned} onAssignCategory={handleAssignCategory} />
      <TruckCategorySection title="30 palette" trucks={categorizedTrucks['30 palette']} unassignedTrucks={categorizedTrucks.unassigned} onAssignCategory={handleAssignCategory} />
      <TruckCategorySection title="other" trucks={categorizedTrucks.other} unassignedTrucks={categorizedTrucks.unassigned} onAssignCategory={handleAssignCategory} />

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Add a New Truck</h2>
        <form onSubmit={createTruck} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <input type="text" placeholder="License Plate" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} required className="p-2 border rounded-md text-gray-900 placeholder-gray-500" />
          <input type="text" placeholder="Make" value={make} onChange={(e) => setMake(e.target.value)} className="p-2 border rounded-md text-gray-900 placeholder-gray-500" />
          <input type="text" placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} className="p-2 border rounded-md text-gray-900 placeholder-gray-500" />
          <input type="number" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} className="p-2 border rounded-md text-gray-900 placeholder-gray-500" />
          <select value={category} onChange={(e) => setCategory(e.target.value as '16 palette' | '30 palette' | 'other' | '')} className="p-2 border rounded-md text-gray-900 bg-white">
            <option value="" disabled>
              Select Category
            </option>
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
        <button onClick={() => setIsFleetVisible(!isFleetVisible)} className="w-full flex justify-between items-center p-4 text-xl font-semibold text-gray-700">
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
              {loading ? (
                <p>Loading trucks...</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License Plate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Make & Model</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Trips</th>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {truck.make} {truck.model} ({truck.year})
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.total_trips}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              truck.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : truck.status === 'inactive'
                                ? 'bg-yellow-100 text-yellow-800'
                                : truck.status === 'under_service'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {truck.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.worker_name || 'Unassigned'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button onClick={() => setEditingTruck(truck)} className="p-2 text-indigo-600 hover:text-indigo-900 rounded-full hover:bg-indigo-100">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button onClick={() => setDeletingTruck(truck)} className="p-2 text-red-600 hover:text-red-900 rounded-full hover:bg-red-100">
                            <TrashIcon className="h-5 w-5" />
                          </button>
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
              <input
                type="text"
                value={editingTruck.license_plate}
                onChange={(e) => setEditingTruck({ ...editingTruck, license_plate: e.target.value })}
                required
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"
              />
              <input
                type="text"
                value={editingTruck.make || ''}
                onChange={(e) => setEditingTruck({ ...editingTruck, make: e.target.value })}
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"
              />
              <input
                type="text"
                value={editingTruck.model || ''}
                onChange={(e) => setEditingTruck({ ...editingTruck, model: e.target.value })}
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"
              />
              <input
                type="number"
                value={editingTruck.year ?? ''}
                onChange={(e) => setEditingTruck({ ...editingTruck, year: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"
              />
              <select
                value={editingTruck.category || ''}
                onChange={(e) => setEditingTruck({ ...editingTruck, category: e.target.value })}
                className="w-full p-2 border rounded text-gray-900 bg-white"
              >
                <option value="" disabled>
                  Select Category
                </option>
                <option value="16 palette">16 Palette</option>
                <option value="30 palette">30 Palette</option>
                <option value="other">Other</option>
              </select>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setEditingTruck(null)} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingTruck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Confirm Deletion</h2>
            <p className="text-gray-700">
              Are you sure you want to delete the truck with license plate <span className="font-bold">{deletingTruck.license_plate}</span>?
            </p>
            <div className="flex justify-end space-x-4 mt-6">
              <button type="button" onClick={() => setDeletingTruck(null)} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">
                Cancel
              </button>
              <button onClick={handleDeleteTruck} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
