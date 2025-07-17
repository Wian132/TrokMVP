'use client'

import { useState } from 'react'
import { FaTruckMoving } from 'react-icons/fa'
import supabase from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded shadow">
        <h1 className="text-3xl font-bold flex items-center gap-2 justify-center">
          <FaTruckMoving className="text-blue-600" /> Login
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 border rounded text-lg"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 border rounded text-lg"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-lg">
            Login
          </button>
        </form>
        <p className="text-sm text-center">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-600 underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
