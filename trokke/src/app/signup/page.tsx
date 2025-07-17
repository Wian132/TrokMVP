'use client'

import { useState } from 'react'
import { FaTruckMoving } from 'react-icons/fa'
import supabase from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password })
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Sign up failed')
      return
    }

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
          <FaTruckMoving className="text-blue-600" /> Sign Up
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="p-3 border rounded text-lg"
            required
          />
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
            Sign Up
          </button>
        </form>
        <p className="text-sm text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
