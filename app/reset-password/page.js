'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkRecoverySession() {
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          setHasSession(false)
          setError('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the app.')
          setCheckingSession(false)
          return
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (!sessionError && session) {
          setHasSession(true)
          setCheckingSession(false)
          return
        }

        const hash = window.location.hash.substring(1)
        const hashParams = new URLSearchParams(hash)
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { data, error: sessionSetError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (!sessionSetError && data.session) {
            setHasSession(true)
            setCheckingSession(false)
            return
          }
        }

        const queryParams = new URLSearchParams(window.location.search)
        const recoveryCode = queryParams.get('code') || queryParams.get('token')

        if (recoveryCode) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(recoveryCode)

          if (!exchangeError && data.session) {
            setHasSession(true)
            setCheckingSession(false)
            return
          }
        }

        const { data: userData, error: userError } = await supabase.auth.getUser()
        setHasSession(Boolean(!userError && userData?.user))
      } catch {
        setHasSession(false)
      } finally {
        setCheckingSession(false)
      }
    }

    checkRecoverySession()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
    }

    setSaving(false)
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] p-4">
        <div className="text-[#1d1d1f] text-xl">Checking reset link...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-[#d4a843]">HexBridge</h1>
          <p className="text-gray-600 text-sm">Connecting Homes &amp; Designers</p>
        </div>

        {success ? (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-[#1a2a3a]">Password updated</h2>
            <p className="text-gray-600 mt-2">Your password has been changed successfully.</p>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="mt-5 w-full bg-[#d4a843] text-white py-3 rounded-lg font-bold hover:bg-[#c49a3a] transition"
            >
              Go to Sign In
            </button>
          </div>
        ) : !hasSession ? (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-[#1a2a3a]">Invalid or expired link</h2>
            <p className="text-gray-600 mt-2">Request a new password reset link to continue.</p>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="mt-5 w-full bg-[#d4a843] text-white py-3 rounded-lg font-bold hover:bg-[#c49a3a] transition"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-center text-gray-700 mb-4">Create a New Password</h2>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New Password (min 6 chars)"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-white text-gray-900 placeholder:text-gray-500 p-3 pr-16 border border-gray-400 rounded-lg shadow-sm focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/40 outline-none"
                  minLength="6"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#0071e3] hover:underline"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full bg-white text-gray-900 placeholder:text-gray-500 p-3 pr-16 border border-gray-400 rounded-lg shadow-sm focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/40 outline-none"
                  minLength="6"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#0071e3] hover:underline"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#d4a843] text-white py-3 rounded-lg font-bold hover:bg-[#c49a3a] transition disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}