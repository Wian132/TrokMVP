'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthContext'

export default function Home() {
  const { session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.replace('/dashboard')
    }
  }, [session, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
      <h1 className="text-2xl font-semibold">Welcome to Trokke</h1>
      <div className="flex gap-4">
        <Link href="/login" className="p-2 bg-blue-600 text-white rounded">
          Login
        </Link>
        <Link href="/signup" className="p-2 bg-gray-200 rounded">
          Sign Up
        </Link>
      </div>
    </div>
  )
}
