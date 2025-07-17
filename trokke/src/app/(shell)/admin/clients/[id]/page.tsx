'use client'

import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'

interface Client {
  id: string
  company_name: string
  profiles: { full_name: string } | null
}

interface Store {
  id: number
  name: string
  address: string
}

export default function ClientStoresPage({ params }: { params: { id: string } }) {
  const clientId = params.id
  const [client, setClient] = useState<Client | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, company_name, profiles(full_name)')
        .eq('id', clientId)
        .single()
      setClient(clientData)

      const { data: storeData } = await supabase
        .from('client_stores')
        .select('*')
        .eq('client_id', clientId)
      setStores(storeData || [])
    }
    load()
  }, [clientId])

  const addStore = async (e: FormEvent) => {
    e.preventDefault()
    const { data, error } = await supabase
      .from('client_stores')
      .insert({ name, address, client_id: clientId })
      .select()
      .single()
    if (!error && data) {
      setStores([...stores, data])
      setName('')
      setAddress('')
    }
  }

  const updateStore = async (id: number, field: keyof Store, value: string) => {
    const { error } = await supabase
      .from('client_stores')
      .update({ [field]: value })
      .eq('id', id)
    if (!error) {
      setStores((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
    }
  }

  const deleteStore = async (id: number) => {
    const { error } = await supabase.from('client_stores').delete().eq('id', id)
    if (!error) {
      setStores((prev) => prev.filter((s) => s.id !== id))
    }
  }

  return (
    <div className="p-4 space-y-6">
      {client && (
        <div>
          <h1 className="text-xl font-bold">{client.profiles?.full_name}</h1>
          <p className="text-gray-600">{client.company_name}</p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold mb-2">Stores</h2>
        <ul className="space-y-2 mb-4">
          {stores.map((store) => (
            <li key={store.id} className="border p-2 rounded">
              <input
                className="border p-1 mr-2"
                value={store.name}
                onChange={(e) => updateStore(store.id, 'name', e.target.value)}
              />
              <input
                className="border p-1 mr-2"
                value={store.address}
                onChange={(e) => updateStore(store.id, 'address', e.target.value)}
              />
              <button className="text-red-600" onClick={() => deleteStore(store.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addStore} className="space-y-2">
          <input
            className="border p-1 block w-full"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="border p-1 block w-full"
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded">
            Add Store
          </button>
        </form>
      </div>
    </div>
  )
}
