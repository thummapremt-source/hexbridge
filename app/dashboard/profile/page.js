'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

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
    setSaving(true)
    setSuccess('')
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(formData)
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-[#1a2a3a] text-xl font-semibold">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-[#1a2a3a]">My Profile</h1>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-[#1a2a3a] font-semibold hover:underline"
          >
            Back to Dashboard
          </button>
        </div>

        {error && <p className="mb-4 text-red-500">{error}</p>}
        {success && <p className="mb-4 text-green-600">{success}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="full_name" className="block font-semibold mb-1">Full Name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="block font-semibold mb-1">Phone</label>
            <input
              id="phone"
              name="phone"
              type="text"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
              required
            />
          </div>

          <div>
            <label htmlFor="company_name" className="block font-semibold mb-1">Company Name (Optional)</label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              value={formData.company_name}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="state" className="block font-semibold mb-1">State</label>
            <input
              id="state"
              name="state"
              type="text"
              value={formData.state}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
              required
            />
          </div>

          <div>
            <label htmlFor="city" className="block font-semibold mb-1">City</label>
            <input
              id="city"
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#d4a843] text-white py-3 rounded-lg font-bold hover:bg-[#c49a3a] transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}