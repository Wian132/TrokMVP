'use client'

import { AuthProvider } from '@/components/AuthContext'
import AuthGate from '@/components/AuthGate'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'

export default function AppWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <Sidebar />
      <Navbar />
      <AuthGate>
        <main className="flex-1 ml-60 pt-14 p-4">{children}</main>
      </AuthGate>
    </AuthProvider>
  )
}
