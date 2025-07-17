'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './AuthContext'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const publicPaths = ['/', '/login', '/signup']
    if (!session && !publicPaths.includes(pathname)) {
      router.replace('/login')
    }
  }, [session, pathname, router])

  return <>{children}</>
}
