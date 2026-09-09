'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [loginMethod, setLoginMethod] = useState('email')
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('homeowner')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [forgotPassword, setForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the app.')
      setLoading(false)
      return
    }

    try {
      if (loginMethod === 'email') {
        if (isSignup) {
          const { data, error: signupError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName, role } },
          })
          if (signupError) throw signupError

          if (data.user) {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({ id: data.user.id, full_name: fullName, phone, role })
            if (profileError) throw profileError
          }

          if (data.session) {
            router.push('/dashboard')
          } else {
            setSuccess('Account created. Check your email to confirm your account.')
          }
          return
        }

        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) throw loginError

        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', loginData.user.id)
          .maybeSingle()

        if (!existingProfile) {
          const { error: profileInsertError } = await supabase
            .from('profiles')
            .upsert({
              id: loginData.user.id,
              full_name: loginData.user.user_metadata?.full_name || email.split('@')[0],
              phone: loginData.user.phone || '',
              role: loginData.user.user_metadata?.role || 'homeowner',
            }, { onConflict: 'id' })

          if (profileInsertError) {
            const message = profileInsertError.code === '42501'
              ? 'Profile setup is blocked by Supabase RLS. Run the SQL in supabase/profiles-disable-rls.sql in your Supabase SQL editor, then refresh.'
              : profileInsertError.message || 'Profile setup failed.'
            throw new Error(message)
          }
        }

        router.push('/dashboard')
        return
      }

      if (!otpSent) {
        const { error: otpError } = await supabase.auth.signInWithOtp({ phone })
        if (otpError) throw otpError

        setOtpSent(true)
        return
      }

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      })
      if (verifyError) throw verifyError

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ id: data.user.id, phone, role })
        if (profileError) throw profileError
      }

      router.push('/dashboard')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the app.')
      setLoading(false)
      return
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) throw resetError

      setResetSent(true)
    } catch (resetError) {
      setError(resetError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-md">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d4a843]">Connecting Homes &amp; Designers</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-[#1a2a3a]">HexBridge</h1>
          <p className="mt-4 text-lg text-[#86868b]">{isSignup ? 'Create an account with email or Mobile OTP.' : 'Sign in with email or Mobile OTP.'}</p>

          <div className="mt-8 grid grid-cols-2 gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5">
            <button
              type="button"
              onClick={() => { setLoginMethod('email'); setOtpSent(false); setError('') }}
              className={`rounded-xl py-3 text-sm font-semibold transition ${loginMethod === 'email' ? 'bg-[#1a2a3a] text-white' : 'text-[#6e6e73] hover:bg-[#f3f4f6]'}`}
            >
              Email Login
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('phone'); setError('') }}
              className={`rounded-xl py-3 text-sm font-semibold transition ${loginMethod === 'phone' ? 'bg-[#1a2a3a] text-white' : 'text-[#6e6e73] hover:bg-[#f3f4f6]'}`}
            >
              Mobile OTP
            </button>
          </div>

          {forgotPassword ? (
            <form onSubmit={handlePasswordReset} className="mt-10 space-y-4">
              {resetSent ? (
                <>
                  <p className="text-center text-[#6e6e73]">Password reset instructions have been sent to your email.</p>
                  <button
                    type="button"
                    onClick={() => { setForgotPassword(false); setResetSent(false); setError('') }}
                    className="mx-auto block text-sm font-semibold text-[#d4a843] hover:underline"
                  >
                    Back to Sign In
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email address"
                    className="w-full rounded-2xl bg-white px-5 py-4 text-lg text-[#1d1d1f] shadow-sm outline-none ring-1 ring-black/5 placeholder:text-[#86868b] focus:ring-[#0071e3]"
                    required
                    disabled={loading}
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="mx-auto block rounded-full bg-[#d4a843] px-12 py-4 text-lg font-semibold text-white shadow-[0_8px_20px_rgba(212,168,67,0.25)] transition hover:bg-[#c49a3a] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForgotPassword(false); setError('') }}
                    className="mx-auto block text-sm font-semibold text-[#d4a843] hover:underline"
                  >
                    Back to Sign In
                  </button>
                </>
              )}
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-4">
            {loginMethod === 'email' ? (
              <>
                {isSignup && (
                  <>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-2xl bg-white px-5 py-4 text-lg text-[#1d1d1f] shadow-sm outline-none ring-1 ring-black/5 placeholder:text-[#86868b] focus:ring-[#0071e3]"
                      required
                      disabled={loading}
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Phone number"
                      className="w-full rounded-2xl bg-white px-5 py-4 text-lg text-[#1d1d1f] shadow-sm outline-none ring-1 ring-black/5 placeholder:text-[#86868b] focus:ring-[#0071e3]"
                      required
                      disabled={loading}
                    />
                    <select
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      className="w-full rounded-2xl bg-white px-5 py-4 text-[#1d1d1f] shadow-sm outline-none ring-1 ring-black/5 focus:ring-[#0071e3]"
                    >
                      <option value="homeowner">Homeowner</option>
                      <option value="designer">Designer / Contractor</option>
                    </select>
                  </>
                )}
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  className="w-full rounded-2xl bg-white px-5 py-4 text-lg text-[#1d1d1f] shadow-sm outline-none ring-1 ring-black/5 placeholder:text-[#86868b] focus:ring-[#0071e3]"
                  required
                  disabled={loading}
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    className="w-full rounded-2xl bg-white px-5 py-4 pr-20 text-lg text-[#1d1d1f] shadow-sm outline-none ring-1 ring-black/5 placeholder:text-[#86868b] focus:ring-[#0071e3]"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#0071e3] hover:underline"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2 shadow-sm ring-1 ring-black/5 focus-within:ring-[#0071e3]">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#f4f4f4] via-[#f4a340] to-[#159447] text-xl" aria-hidden="true">🇮🇳</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Registered Phone number"
                    className="min-w-0 flex-1 bg-transparent py-4 text-lg text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
                    required
                    disabled={otpSent || loading}
                  />
                </label>

                {!otpSent && (
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    className="w-full rounded-2xl bg-white px-5 py-4 text-[#1d1d1f] shadow-sm outline-none ring-1 ring-black/5 focus:ring-[#0071e3]"
                  >
                    <option value="homeowner">Homeowner</option>
                    <option value="designer">Designer / Contractor</option>
                  </select>
                )}

                {otpSent && (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="Enter the OTP sent to your phone"
                    className="w-full rounded-2xl bg-white px-5 py-4 text-lg text-[#1d1d1f] shadow-sm outline-none ring-1 ring-black/5 placeholder:text-[#86868b] focus:ring-[#0071e3]"
                    required
                    disabled={loading}
                  />
                )}
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mx-auto block rounded-full bg-[#0071e3] px-12 py-4 text-lg font-semibold text-white shadow-[0_8px_20px_rgba(0,113,227,0.25)] transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Please wait...' : (loginMethod === 'email' ? 'Sign In' : (otpSent ? 'Verify OTP' : 'Send OTP'))}
            </button>
          </form>
          )}

          {!forgotPassword && loginMethod === 'email' && !isSignup && (
            <button
              type="button"
              onClick={() => { setForgotPassword(true); setError(''); setSuccess('') }}
              className="mx-auto mt-5 block text-sm font-semibold text-[#0071e3] hover:underline"
            >
              Forgot password?
            </button>
          )}

          {!forgotPassword && loginMethod === 'phone' && otpSent && (
            <button
              type="button"
              onClick={() => { setOtpSent(false); setOtp(''); setError('') }}
              className="mx-auto mt-6 block text-sm text-[#0071e3] hover:underline"
            >
              Change phone number
            </button>
          )}

          <button
            type="button"
            onClick={() => { setIsSignup((current) => !current); setOtpSent(false); setOtp(''); setError(''); setSuccess('') }}
            className="mx-auto mt-6 block text-sm text-[#0071e3] hover:underline"
          >
            {isSignup ? 'Already have an account? Sign in' : 'New to HexBridge? Create an account'}
          </button>
        </section>
      </div>
    </main>
  )
}
