'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import supabase from '@/lib/supabaseClient'
import { useAuth } from './AuthContext'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin/dashboard', label: 'Map' },
  { href: '/admin/trucks', label: 'Trucks' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/business-stores', label: 'Stores' },
]

export default function Sidebar() {
  const { session } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  if (!session) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 h-screen fixed left-0 top-0 bg-gray-100 p-4 space-y-2 overflow-y-auto">
      <nav className="flex flex-col space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`p-2 rounded hover:bg-gray-200 ${pathname === item.href ? 'bg-blue-600 text-white' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <button
        onClick={handleLogout}
        className="mt-4 p-2 w-full text-left bg-red-500 text-white rounded"
      >
        Logout
      </button>
    </aside>
  )
}
