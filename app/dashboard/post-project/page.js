'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Sidebar from '../../../components/Sidebar'

const initialForm = {
  title: '',
  description: '',
  location: '',
  project_type: 'home_interiors',
  hardware_type: 'soft_close',
  project_tier: 'essentials',
  timeline_days: '56',
}

export default function PostProjectPage() {
  const router = useRouter()
  const floorPlanInputRef = useRef(null)
  const [form, setForm] = useState(initialForm)
  const [floorPlan, setFloorPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isHomeowner, setIsHomeowner] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function checkAccess() {
      try {
        if (!supabase) {
          router.push('/login')
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) throw profileError

        setIsHomeowner(profile?.role === 'homeowner')
      } catch (err) {
        console.error('Access check failed:', err)
        setError('Unable to verify account access.')
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [router])

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleFloorPlanChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setFloorPlan(null)
      return
    }

    const isSupportedType = file.type.startsWith('image/') || file.type === 'application/pdf'
    if (!isSupportedType) {
      setError('Please upload a floor plan image or PDF.')
      event.target.value = ''
      setFloorPlan(null)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Floor plan must be 10 MB or smaller.')
      event.target.value = ''
      setFloorPlan(null)
      return
    }

    setError('')
    setFloorPlan(file)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!supabase) {
      setError('Supabase is not configured. Please add your environment variables.')
      return
    }

    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      setError('Please fill in the project title, description, and location.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      let floorPlanUrl = null
      if (floorPlan) {
        const safeFileName = floorPlan.name.replace(/[^a-zA-Z0-9._-]/g, '-')
        const filePath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`
        const { error: uploadError } = await supabase.storage
          .from('floor-plans')
          .upload(filePath, floorPlan, { contentType: floorPlan.type, upsert: false })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('floor-plans')
          .getPublicUrl(filePath)
        floorPlanUrl = publicUrlData.publicUrl
      }

      const payload = {
        homeowner_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        project_type: form.project_type === 'hardware'
          ? `hardware_${form.hardware_type}`
          : form.project_type,
        project_tier: form.project_tier,
        timeline_days: Number(form.timeline_days) || 56,
        floor_plan_url: floorPlanUrl,
        status: 'open',
      }

      const { error: insertError } = await supabase.from('projects').insert([payload])

      if (insertError) {
        throw insertError
      }

      setSuccess('Project posted successfully!')
      setForm(initialForm)
      setFloorPlan(null)
      if (floorPlanInputRef.current) floorPlanInputRef.current.value = ''
      router.push('/dashboard/my-projects')
    } catch (err) {
      console.error('Project creation failed:', err)
      setError(err?.message || 'Project could not be posted. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-[#1a2a3a] text-xl font-semibold">Checking access...</div>
      </div>
    )
  }

  if (!isHomeowner) {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <Sidebar />
        <div className="flex-1 p-6 ml-64 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-lg">
            <h2 className="text-2xl font-bold text-red-500">⚠️ Access Denied</h2>
            <p className="text-gray-600 mt-2">This page is only for homeowners.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 bg-[#d4a843] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#c49a3a] transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar />

      <main className="flex-1 p-6 ml-64">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.22em] text-[#d4a843] font-semibold">HexBridge</p>
              <h1 className="text-3xl font-bold text-[#1a2a3a] mt-2">Post a New Project</h1>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#1a2a3a] mb-2">Project Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  placeholder="e.g. 3BHK Interior Remodel"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#1a2a3a] outline-none ring-0 focus:border-[#d4a843]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1a2a3a] mb-2">Project Type</label>
                <select
                  name="project_type"
                  value={form.project_type}
                  onChange={updateField}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#1a2a3a] outline-none focus:border-[#d4a843]"
                >
                  <option value="home_interiors">Home Interiors</option>
                  <option value="renovations">Renovations</option>
                  <option value="commercial_space">Commercial Space</option>
                  <option value="hardware">Hardware</option>
                  <option value="others">Others</option>
                </select>
              </div>

              {form.project_type === 'hardware' && (
                <div>
                  <label className="block text-sm font-semibold text-[#1a2a3a] mb-2">Hardware Type</label>
                  <select
                    name="hardware_type"
                    value={form.hardware_type}
                    onChange={updateField}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#1a2a3a] outline-none focus:border-[#d4a843]"
                  >
                    <option value="soft_close">Soft Close</option>
                    <option value="standard">Standard</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-[#1a2a3a] mb-2">Location</label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={updateField}
                  placeholder="e.g. Bengaluru, Karnataka"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#1a2a3a] outline-none focus:border-[#d4a843]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1a2a3a] mb-2">Project Details</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  rows={6}
                  placeholder="Describe your project scope, requirements, style preferences, and any constraints..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#1a2a3a] outline-none focus:border-[#d4a843]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1a2a3a] mb-2">Project Tier</label>
                <select
                  name="project_tier"
                  value={form.project_tier}
                  onChange={updateField}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#1a2a3a] outline-none focus:border-[#d4a843]"
                >
                  <option value="essentials">Essentials</option>
                  <option value="premium">Premium</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1a2a3a] mb-2">Floor Plan</label>
                <input
                  ref={floorPlanInputRef}
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  onChange={handleFloorPlanChange}
                  className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#1a2a3a] file:mr-4 file:rounded-lg file:border-0 file:bg-[#1a2a3a] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#243b53]"
                />
                <p className="mt-2 text-xs text-gray-500">Upload an image or PDF, up to 10 MB.</p>
                {floorPlan && <p className="mt-1 text-sm text-gray-600">Selected: {floorPlan.name}</p>}
              </div>

              <div>
                  <label className="block text-sm font-semibold text-[#1a2a3a] mb-2">Timeline (days)</label>
                  <input
                    type="number"
                    name="timeline_days"
                    min="1"
                    max="365"
                    value={form.timeline_days}
                    onChange={updateField}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#1a2a3a] outline-none focus:border-[#d4a843]"
                  />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#d4a843] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#d4a843]/20 transition hover:bg-[#c49a3a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Posting Project...' : 'Post Project'}
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/dashboard/my-projects')}
                  className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-[#1a2a3a] hover:bg-gray-50"
                >
                  View My Projects
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}