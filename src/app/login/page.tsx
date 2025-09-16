'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F5F7FA' }}>
      <div className="w-full max-w-md">
        {/* Header Card */}
        <div
          className="text-center mb-6 p-6 rounded-xl"
          style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #F0F0F0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}
        >
          <div className="flex justify-center mb-4">
            <div
              className="flex items-center justify-center"
              style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px'
              }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
          </div>
          <h1
            className="font-bold mb-2"
            style={{
              fontSize: '24px',
              color: '#2C3E50',
              fontWeight: 700
            }}
          >
            MedHubb
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#34495E'
          }}>
            Accedi al tuo account medico
          </p>
        </div>

        {/* Login Form Card */}
        <div
          className="p-8 rounded-xl"
          style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #F0F0F0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}
        >
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div
                className="p-4 rounded-lg border-l-4 flex items-start"
                style={{
                  background: '#FDF2F2',
                  borderColor: '#EF4444',
                  color: '#DC2626'
                }}
              >
                <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p style={{ fontSize: '14px' }}>{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block mb-2"
                  style={{
                    fontSize: '14px',
                    color: '#2C3E50',
                    fontWeight: 500
                  }}
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
                  style={{
                    borderColor: '#BDC3C7',
                    fontSize: '16px',
                    color: '#2C3E50'
                  }}
                  placeholder="inserisci la tua email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block mb-2"
                  style={{
                    fontSize: '14px',
                    color: '#2C3E50',
                    fontWeight: 500
                  }}
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-4 py-3 rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
                  style={{
                    borderColor: '#BDC3C7',
                    fontSize: '16px',
                    color: '#2C3E50'
                  }}
                  placeholder="inserisci la tua password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg text-white font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                background: '#4A90E2',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Accesso in corso...
                </span>
              ) : (
                'Accedi'
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="text-center mb-4">
              <p style={{ fontSize: '14px', color: '#34495E' }}>
                Non hai un account?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <Link
                href="/register/doctor"
                className="px-4 py-2 rounded-lg text-center text-white transition-all duration-150"
                style={{
                  background: 'linear-gradient(135deg, #4A90E2 0%, #5DADE2 100%)',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                Medico
              </Link>
              <Link
                href="/register/patient"
                className="px-4 py-2 rounded-lg text-center text-white transition-all duration-150"
                style={{
                  background: 'linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                Paziente
              </Link>
            </div>

            <div className="text-center">
              <Link
                href="/"
                className="inline-flex items-center transition-colors duration-150 hover:opacity-70"
                style={{
                  fontSize: '12px',
                  color: '#BDC3C7'
                }}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                Torna alla home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}