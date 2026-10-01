'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
              .upsert({ id: data.user.id, full_name: fullName, phone, role }, { onConflict: 'id' })
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
              role: loginData.user.user_metadata?.role === 'designer' ? 'designer' : 'homeowner',
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
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-8 text-[#1d1d1f] sm:px-8">
      <div className="mx-auto w-full max-w-md">
        <section>
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d4a843]">
            Connecting Homes &amp; Designers
          </Link>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#1a2a3a] sm:text-5xl">HexBridge</h1>
          <p className="mt-4 text-lg text-[#86868b]">
            {forgotPassword
              ? 'Reset your password.'
              : isSignup
                ? 'Create an account with email or Mobile OTP.'
                : 'Sign in with email or Mobile OTP.'}
          </p>

          <div className="mt-8">
            {!forgotPassword && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5">
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
            )}
          </div>

          {forgotPassword ? (
            <form onSubmit={handlePasswordReset} className="mt-8 space-y-4">
              {resetSent ? (
                <>
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Password reset instructions have been sent to your email.</p>
                  <button
                    type="button"
                    onClick={() => { setForgotPassword(false); setResetSent(false); setError('') }}
                    className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-[#8c6a22] transition hover:bg-amber-50"
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
                    aria-label="Email address"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-[#1a2a3a] outline-none transition placeholder:text-slate-400 focus:border-[#d4a843] focus:ring-4 focus:ring-[#d4a843]/15"
                    required
                    disabled={loading}
                  />
                  {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-[#d4a843] px-6 py-4 text-base font-bold text-[#1a2a3a] shadow-lg shadow-[#d4a843]/25 transition duration-200 hover:-translate-y-0.5 hover:bg-[#e1b951] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForgotPassword(false); setError('') }}
                    className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-[#8c6a22] transition hover:bg-amber-50"
                  >
                    Back to Sign In
                  </button>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {loginMethod === 'email' ? (
                <>
                  {isSignup && (
                    <>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Full name"
                        aria-label="Full name"
                        autoComplete="name"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-[#1a2a3a] outline-none transition placeholder:text-slate-400 focus:border-[#d4a843] focus:ring-4 focus:ring-[#d4a843]/15"
                        required
                        disabled={loading}
                      />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="Phone number"
                        aria-label="Phone number"
                        autoComplete="tel"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-[#1a2a3a] outline-none transition placeholder:text-slate-400 focus:border-[#d4a843] focus:ring-4 focus:ring-[#d4a843]/15"
                        required
                        disabled={loading}
                      />
                      <select
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        aria-label="Account type"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-[#1a2a3a] outline-none transition focus:border-[#d4a843] focus:ring-4 focus:ring-[#d4a843]/15"
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
                    aria-label="Email address"
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-[#1a2a3a] outline-none transition placeholder:text-slate-400 focus:border-[#d4a843] focus:ring-4 focus:ring-[#d4a843]/15"
                    required
                    disabled={loading}
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password"
                      aria-label="Password"
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pr-20 text-base text-[#1a2a3a] outline-none transition placeholder:text-slate-400 focus:border-[#d4a843] focus:ring-4 focus:ring-[#d4a843]/15"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm font-semibold text-[#8c6a22] transition hover:bg-amber-50"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 focus-within:border-[#d4a843] focus-within:ring-4 focus-within:ring-[#d4a843]/15">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#f4f4f4] via-[#f4a340] to-[#159447] text-xl" aria-hidden="true">🇮🇳</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Registered phone number"
                      aria-label="Registered phone number"
                      autoComplete="tel"
                      className="min-w-0 flex-1 bg-transparent py-3.5 text-base text-[#1a2a3a] outline-none placeholder:text-slate-400"
                      required
                      disabled={otpSent || loading}
                    />
                  </label>

                  {!otpSent && (
                    <select
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      aria-label="Account type"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-[#1a2a3a] outline-none transition focus:border-[#d4a843] focus:ring-4 focus:ring-[#d4a843]/15"
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
                      aria-label="One-time password"
                      autoComplete="one-time-code"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-[#1a2a3a] outline-none transition placeholder:text-slate-400 focus:border-[#d4a843] focus:ring-4 focus:ring-[#d4a843]/15"
                      required
                      disabled={loading}
                    />
                  )}
                </>
              )}

              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#d4a843] px-6 py-4 text-base font-bold text-[#1a2a3a] shadow-lg shadow-[#d4a843]/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#e1b951] hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d4a843]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Please wait...' : loginMethod === 'email'
                  ? isSignup ? 'Create Account' : 'Sign In'
                  : otpSent ? 'Verify OTP' : 'Send OTP'}
              </button>
            </form>
          )}

          {!forgotPassword && loginMethod === 'email' && !isSignup && (
            <button
              type="button"
              onClick={() => { setForgotPassword(true); setError(''); setSuccess('') }}
              className="mt-4 w-full rounded-xl px-3 py-2 text-sm font-semibold text-[#8c6a22] transition hover:bg-amber-50"
            >
              Forgot password?
            </button>
          )}

          {!forgotPassword && loginMethod === 'phone' && otpSent && (
            <button
              type="button"
              onClick={() => { setOtpSent(false); setOtp(''); setError('') }}
              className="mt-4 w-full rounded-xl px-3 py-2 text-sm font-semibold text-[#8c6a22] transition hover:bg-amber-50"
            >
              Change phone number
            </button>
          )}

          {!forgotPassword && (
            <button
              type="button"
              onClick={() => { setIsSignup((current) => !current); setOtpSent(false); setOtp(''); setError(''); setSuccess('') }}
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#1a2a3a] transition hover:border-[#d4a843] hover:bg-amber-50/50"
            >
              {isSignup ? 'Already have an account? Sign in' : 'New to HexBridge? Create an account'}
            </button>
          )}

        </section>
      </div>
    </main>
  )
}
