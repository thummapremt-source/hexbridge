'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Sidebar from '../../../components/Sidebar'
import { INDIAN_STATES } from '../../../lib/indianStates'

const initialForm = {
  title: '',
  description: '',
  state: '',
  mandal: '',
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

    if (!form.title.trim() || !form.description.trim() || !form.state || !form.mandal.trim()) {
      setError('Please fill in the project title, description, state, and mandal/city.')
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
        location: `${form.mandal.trim()}, ${form.state}`,
        state: form.state,
        mandal: form.mandal.trim(),
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
      <div className="min-h-screen bg-[#101820] flex items-center justify-center">
        <div className="text-[#d4a843] text-xl font-semibold">Checking access...</div>
      </div>
    )
  }

  if (!isHomeowner) {
    return (
      <div className="min-h-screen bg-[#101820] flex">
        <Sidebar />
        <div className="flex-1 p-6 lg:ml-64 flex items-center justify-center">
          <div className="max-w-lg rounded-2xl border border-white/10 bg-[#1a2a3a] p-8 text-center shadow-xl">
            <h2 className="text-2xl font-bold text-red-500">⚠️ Access Denied</h2>
            <p className="mt-2 text-gray-300">This page is only for homeowners.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 rounded-lg bg-[#d4a843] px-6 py-2 font-bold text-[#101820] transition hover:bg-[#c49a3a]"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#101820] flex">
      <Sidebar />

      <main className="flex-1 p-6 lg:ml-64">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-[#1a2a3a] p-6 shadow-xl md:p-8">
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.22em] text-[#d4a843] font-semibold">HexBridge</p>
              <h1 className="mt-2 text-3xl font-bold text-white">Post a New Project</h1>
            </div>

            {error && (
              <div role="alert" className="mb-4 rounded-lg border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div role="status" className="mb-4 rounded-lg border border-green-400/30 bg-green-950/30 px-4 py-3 text-sm text-green-300">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="title" className="mb-2 block text-sm font-semibold text-gray-200">Project Title</label>
                <input
                  id="title"
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  placeholder="e.g. 3BHK Interior Remodel"
                  required
                  className="w-full rounded-xl border border-white/15 bg-[#101820] px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-[#d4a843]"
                />
              </div>

              <div>
                <label htmlFor="project_type" className="mb-2 block text-sm font-semibold text-gray-200">Project Type</label>
                <select
                  id="project_type"
                  name="project_type"
                  value={form.project_type}
                  onChange={updateField}
                  className="w-full rounded-xl border border-white/15 bg-[#101820] px-4 py-3 text-white outline-none focus:border-[#d4a843]"
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
                  <label htmlFor="hardware_type" className="mb-2 block text-sm font-semibold text-gray-200">Hardware Type</label>
                  <select
                    id="hardware_type"
                    name="hardware_type"
                    value={form.hardware_type}
                    onChange={updateField}
                    className="w-full rounded-xl border border-white/15 bg-[#101820] px-4 py-3 text-white outline-none focus:border-[#d4a843]"
                  >
                    <option value="soft_close">Soft Close</option>
                    <option value="standard">Standard</option>
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="state" className="mb-2 block text-sm font-semibold text-gray-200">State</label>
                <select
                  id="state"
                  name="state"
                  value={form.state}
                  onChange={updateField}
                  required
                  className="w-full rounded-xl border border-white/15 bg-[#101820] px-4 py-3 text-white outline-none focus:border-[#d4a843]"
                >
                  <option value="">Select a state or union territory</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="mandal" className="mb-2 block text-sm font-semibold text-gray-200">Mandal / City</label>
                <input
                  id="mandal"
                  type="text"
                  name="mandal"
                  value={form.mandal}
                  onChange={updateField}
                  placeholder="e.g. Serilingampally or Hyderabad"
                  required
                  className="w-full rounded-xl border border-white/15 bg-[#101820] px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-[#d4a843]"
                />
              </div>

              <div>
                <label htmlFor="description" className="mb-2 block text-sm font-semibold text-gray-200">Project Details</label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  rows={6}
                  placeholder="Describe your project scope, requirements, style preferences, and any constraints..."
                  required
                  className="w-full rounded-xl border border-white/15 bg-[#101820] px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-[#d4a843]"
                />
              </div>

              <div>
                <label htmlFor="project_tier" className="mb-2 block text-sm font-semibold text-gray-200">Project Tier</label>
                <select
                  id="project_tier"
                  name="project_tier"
                  value={form.project_tier}
                  onChange={updateField}
                  className="w-full rounded-xl border border-white/15 bg-[#101820] px-4 py-3 text-white outline-none focus:border-[#d4a843]"
                >
                  <option value="essentials">Essentials</option>
                  <option value="premium">Premium</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>

              <div>
                <label htmlFor="floor-plan" className="mb-2 block text-sm font-semibold text-gray-200">Floor Plan</label>
                <input
                  ref={floorPlanInputRef}
                  id="floor-plan"
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  onChange={handleFloorPlanChange}
                  className="block w-full rounded-xl border border-white/15 bg-[#101820] px-4 py-3 text-sm text-gray-200 file:mr-4 file:rounded-lg file:border-0 file:bg-[#d4a843] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#101820] hover:file:bg-[#c49a3a]"
                />
                <p className="mt-2 text-xs text-gray-400">Upload an image or PDF, up to 10 MB.</p>
                {floorPlan && <p className="mt-1 text-sm text-gray-300">Selected: {floorPlan.name}</p>}
              </div>

              <div>
                  <label htmlFor="timeline_days" className="mb-2 block text-sm font-semibold text-gray-200">Timeline (days)</label>
                  <input
                    id="timeline_days"
                    type="number"
                    name="timeline_days"
                    min="1"
                    max="365"
                    value={form.timeline_days}
                    onChange={updateField}
                    className="w-full rounded-xl border border-white/15 bg-[#101820] px-4 py-3 text-white outline-none focus:border-[#d4a843]"
                  />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#d4a843] px-6 py-3 text-sm font-bold text-[#101820] shadow-lg shadow-[#d4a843]/20 transition hover:bg-[#c49a3a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Posting Project...' : 'Post Project'}
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/dashboard/my-projects')}
                  className="rounded-xl border border-white/20 px-6 py-3 text-sm font-bold text-gray-200 transition hover:border-[#d4a843]/60 hover:text-white"
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