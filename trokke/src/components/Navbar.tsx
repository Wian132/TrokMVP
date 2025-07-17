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

export default function Navbar() {
  const { session } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  if (!session) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-gray-100 flex items-center px-4 shadow z-10 ml-60">
      <nav className="flex gap-4 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`py-2 px-3 rounded hover:bg-gray-200 ${pathname === item.href ? 'bg-blue-600 text-white' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <button
        onClick={handleLogout}
        className="p-2 bg-red-500 text-white rounded"
      >
        Logout
      </button>
    </header>
  )
}
