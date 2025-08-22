'use client'

import Link from 'next/link'
import { FaTruckMoving } from 'react-icons/fa'

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold flex items-center gap-2 justify-center text-gray-900">
          <FaTruckMoving className="text-indigo-600" /> Create Account
        </h1>
        <form action="/api/signup" method="POST" className="flex flex-col gap-4">
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              className="w-full px-3 py-2 border rounded-lg text-black"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="w-full px-3 py-2 border rounded-lg text-black"
              required
            />
          </div>
          <div className="mb-6">
             <label className="block text-gray-700 font-semibold mb-2" htmlFor="role">I am a:</label>
             <select
                id="role"
                name="role"
                required
                className="w-full px-3 py-2 border rounded-lg text-black bg-white"
             >
                <option value="client">Client</option>
                <option value="worker">Worker</option>
                <option value="refueler">Refueler</option> {/* Add new role option */}
             </select>
          </div>
          <button type="submit" className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-lg font-semibold">
            Sign Up
          </button>
        </form>
        <p className="text-sm text-center text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 hover:underline font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
