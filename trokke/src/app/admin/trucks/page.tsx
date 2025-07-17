'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'

interface Truck {
  id: number
  license_plate: string
  make: string
  model: string
  year: number
  assigned_worker_id?: string | null
}

interface Worker {
  id: string
  profiles: { full_name: string } | null
}

export default function AdminTrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])

  const [plate, setPlate] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPlate, setEditPlate] = useState('')
  const [editMake, setEditMake] = useState('')
  const [editModel, setEditModel] = useState('')
  const [editYear, setEditYear] = useState('')
  const [editWorker, setEditWorker] = useState('')

  const fetchTrucks = async () => {
    const { data } = await supabase.from('trucks').select('*').order('id')
    if (data) setTrucks(data as Truck[])
  }

  const fetchWorkers = async () => {
    const { data } = await supabase
      .from('workers')
      .select('id, profiles(full_name)')
      .order('id')
    if (data) setWorkers(data as Worker[])
  }

  useEffect(() => {
    fetchTrucks()
    fetchWorkers()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await supabase.from('trucks').insert({
      license_plate: plate,
      make,
      model,
      year: Number(year)
    })
    setPlate('')
    setMake('')
    setModel('')
    setYear('')
    fetchTrucks()
  }

  const startEdit = (truck: Truck) => {
    setEditingId(truck.id)
    setEditPlate(truck.license_plate)
    setEditMake(truck.make)
    setEditModel(truck.model)
    setEditYear(String(truck.year))
    setEditWorker(truck.assigned_worker_id || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId === null) return
    await supabase
      .from('trucks')
      .update({
        license_plate: editPlate,
        make: editMake,
        model: editModel,
        year: Number(editYear),
        assigned_worker_id: editWorker || null
      })
      .eq('id', editingId)
    setEditingId(null)
    fetchTrucks()
  }

  const handleDelete = async (id: number) => {
    await supabase.from('trucks').delete().eq('id', id)
    fetchTrucks()
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Trucks</h1>

      <form onSubmit={handleCreate} className="space-y-2">
        <input
          className="border p-2 block w-full"
          placeholder="License Plate"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          required
        />
        <input
          className="border p-2 block w-full"
          placeholder="Make"
          value={make}
          onChange={(e) => setMake(e.target.value)}
          required
        />
        <input
          className="border p-2 block w-full"
          placeholder="Model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          required
        />
        <input
          className="border p-2 block w-full"
          placeholder="Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          required
        />
        <button className="bg-blue-600 text-white px-4 py-2" type="submit">
          Add Truck
        </button>
      </form>

      <ul className="space-y-4">
        {trucks.map((truck) => (
          <li key={truck.id} className="border p-4">
            {editingId === truck.id ? (
              <form onSubmit={saveEdit} className="space-y-2">
                <input
                  className="border p-2 w-full"
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value)}
                  required
                />
                <input
                  className="border p-2 w-full"
                  value={editMake}
                  onChange={(e) => setEditMake(e.target.value)}
                  required
                />
                <input
                  className="border p-2 w-full"
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  required
                />
                <input
                  className="border p-2 w-full"
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  required
                />
                <select
                  className="border p-2 w-full"
                  value={editWorker}
                  onChange={(e) => setEditWorker(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.profiles?.full_name || 'Unnamed'}
                    </option>
                  ))}
                </select>
                <div className="space-x-2">
                  <button className="bg-green-600 text-white px-3 py-1" type="submit">
                    Save
                  </button>
                  <button
                    className="bg-gray-400 text-white px-3 py-1"
                    type="button"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                <p className="font-semibold">
                  {truck.license_plate} - {truck.make} {truck.model} ({truck.year})
                </p>
                <div className="space-x-2">
                  <button
                    className="bg-yellow-500 text-white px-3 py-1"
                    onClick={() => startEdit(truck)}
                  >
                    Edit
                  </button>
                  <button
                    className="bg-red-600 text-white px-3 py-1"
                    onClick={() => handleDelete(truck.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
