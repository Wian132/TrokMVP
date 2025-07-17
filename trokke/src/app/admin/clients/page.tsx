'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Client {
  id: string
  company_name: string
  profiles: { full_name: string } | null
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, profiles(full_name)')
      if (!error && data) {
        setClients(data)
      }
    }
    load()
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Clients</h1>
      <ul className="space-y-2">
        {clients.map((client) => (
          <li key={client.id}>
            <Link href={`/admin/clients/${client.id}`} className="text-blue-600 underline">
              {client.profiles?.full_name} - {client.company_name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
