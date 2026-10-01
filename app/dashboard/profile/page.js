'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { INDIAN_STATES } from '../../../lib/indianStates'
import Sidebar from '../../../components/Sidebar'

export default function ProfilePage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    company_name: '',
    state: '',
    city: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, phone, company_name, state, city')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError

        setUserId(user.id)
        setFormData({
          full_name: profile?.full_name || '',
          phone: profile?.phone || '',
          company_name: profile?.company_name || '',
          state: profile?.state || '',
          city: profile?.city || '',
        })
      } catch (loadError) {
        console.error('Error loading profile:', loadError)
        setError('Unable to load your profile. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setSuccess('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!userId) {
      setError('Your session has expired. Please sign in again.')
      return
    }

    setSaving(true)
    setSuccess('')
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...formData,
          state: formData.state.trim(),
          city: formData.city.trim(),
        })
        .eq('id', userId)

      if (updateError) throw updateError

      setSuccess('Profile updated successfully!')
    } catch (updateError) {
      console.error('Error updating profile:', updateError)
      setError('Unable to update your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101820] flex items-center justify-center">
        <div className="text-[#d4a843] text-xl font-semibold">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#101820] lg:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:ml-64">
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#1a2a3a] p-5 shadow-xl sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold text-white">My Profile</h1>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="font-semibold text-gray-300 transition hover:text-[#d4a843]"
            >
              Back to Dashboard
            </button>
          </div>

          {error && <p role="alert" className="mb-4 text-red-300">{error}</p>}
          {success && <p role="status" className="mb-4 text-green-300">{success}</p>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="full_name" className="mb-1 block font-semibold text-gray-200">Full Name</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/15 bg-[#101820] p-3 text-white outline-none focus:border-[#d4a843]"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1 block font-semibold text-gray-200">Phone</label>
              <input
                id="phone"
                name="phone"
                type="text"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/15 bg-[#101820] p-3 text-white outline-none focus:border-[#d4a843]"
                required
              />
            </div>

            <div>
              <label htmlFor="company_name" className="mb-1 block font-semibold text-gray-200">Company Name (Optional)</label>
              <input
                id="company_name"
                name="company_name"
                type="text"
                value={formData.company_name}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/15 bg-[#101820] p-3 text-white outline-none focus:border-[#d4a843]"
              />
            </div>

            <div>
              <label htmlFor="state" className="mb-1 block font-semibold text-gray-200">State</label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/15 bg-[#101820] p-3 text-white outline-none focus:border-[#d4a843]"
                required
              >
                <option value="">Select a state or union territory</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="city" className="mb-1 block font-semibold text-gray-200">City</label>
              <input
                id="city"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/15 bg-[#101820] p-3 text-white outline-none focus:border-[#d4a843]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-[#d4a843] py-3 font-bold text-[#101820] transition hover:bg-[#c49a3a] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}