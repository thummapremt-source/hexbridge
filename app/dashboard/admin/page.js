'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

const formatProjectType = (projectType) => {
  if (!projectType) return 'Not specified'

  return projectType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const formatDate = (date) => {
  if (!date) return 'Not available'

  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function AdminPanel() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState('')
  const [settings, setSettings] = useState({
    single_room_fee: 150,
    fee_1bhk: 250,
    fee_2bhk: 400,
    fee_3bhk: 550,
    fee_4bhk: 700,
    fee_5bhk_plus: 900,
    commercial_project_fee: 600,
    others_project_fee: 250,
    starter_package_price: 250,
    silver_package_price: 675,
    gold_package_price: 1000,
    platinum_package_price: 1800
  })

  useEffect(() => {
    async function loadAdmin() {
      try {
        if (!supabase) {
          setLoading(false)
          setIsAdmin(false)
          return
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'admin') {
          setIsAdmin(false)
          setLoading(false)
          return
        }
        setIsAdmin(true)

        // Load existing settings
        const { data: settingsData } = await supabase
          .from('admin_settings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (settingsData) {
          setSettings({
            single_room_fee: settingsData.single_room_fee || 150,
            fee_1bhk: settingsData.fee_1bhk || 250,
            fee_2bhk: settingsData.fee_2bhk || 400,
            fee_3bhk: settingsData.fee_3bhk || 550,
            fee_4bhk: settingsData.fee_4bhk || 700,
            fee_5bhk_plus: settingsData.fee_5bhk_plus || 900,
            commercial_project_fee: settingsData.commercial_project_fee || 600,
            others_project_fee: settingsData.others_project_fee || 250,
            starter_package_price: settingsData.starter_package_price || 250,
            silver_package_price: settingsData.silver_package_price || 675,
            gold_package_price: settingsData.gold_package_price || 1000,
            platinum_package_price: settingsData.platinum_package_price || 1800
          })
        }

        const [{ data: projectsData, error: projectsError }, { data: bidsData, error: bidsError }, { data: profilesData, error: profilesError }] = await Promise.all([
          supabase.from('projects').select('*').order('created_at', { ascending: false }),
          supabase.from('bids').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('id, full_name, phone, role'),
        ])

        if (projectsError) throw projectsError
        if (bidsError) throw bidsError
        if (profilesError) throw profilesError

        const profilesById = Object.fromEntries((profilesData || []).map((profile) => [profile.id, profile]))
        setProjects((projectsData || []).map((project) => ({
          ...project,
          homeowner: profilesById[project.homeowner_id] || null,
          bids: (bidsData || [])
            .filter((bid) => bid.project_id === project.id)
            .map((bid) => ({ ...bid, designer: profilesById[bid.designer_id] || null })),
        })))
      } catch (error) {
        console.error('Error:', error)
        setProjectsError(error?.message || 'Unable to load projects and bids.')
      } finally {
        setLoading(false)
        setProjectsLoading(false)
      }
    }
    loadAdmin()
  }, [router])

  const handleChange = (e) => {
    const { name, value } = e.target
    setSettings(prev => ({ ...prev, [name]: parseInt(value) || 0 }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .limit(1)
        .single()

      let result
      if (existing) {
        // Update existing
        result = await supabase
          .from('admin_settings')
          .update({
            single_room_fee: settings.single_room_fee,
            fee_1bhk: settings.fee_1bhk,
            fee_2bhk: settings.fee_2bhk,
            fee_3bhk: settings.fee_3bhk,
            fee_4bhk: settings.fee_4bhk,
            fee_5bhk_plus: settings.fee_5bhk_plus,
            commercial_project_fee: settings.commercial_project_fee,
            others_project_fee: settings.others_project_fee,
            starter_package_price: settings.starter_package_price,
            silver_package_price: settings.silver_package_price,
            gold_package_price: settings.gold_package_price,
            platinum_package_price: settings.platinum_package_price,
            updated_at: new Date()
          })
          .eq('id', existing.id)
      } else {
        // Insert new
        result = await supabase
          .from('admin_settings')
          .insert({
            single_room_fee: settings.single_room_fee,
            fee_1bhk: settings.fee_1bhk,
            fee_2bhk: settings.fee_2bhk,
            fee_3bhk: settings.fee_3bhk,
            fee_4bhk: settings.fee_4bhk,
            fee_5bhk_plus: settings.fee_5bhk_plus,
            commercial_project_fee: settings.commercial_project_fee,
            others_project_fee: settings.others_project_fee,
            starter_package_price: settings.starter_package_price,
            silver_package_price: settings.silver_package_price,
            gold_package_price: settings.gold_package_price,
            platinum_package_price: settings.platinum_package_price
          })
      }

      if (result.error) throw result.error

      alert('✅ Bid fees updated successfully!')
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to update fees: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-[#1a2a3a] text-xl font-semibold">Loading...</div>
    </div>
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-lg">
          <h2 className="text-2xl font-bold text-red-500">⚠️ Access Denied</h2>
          <p className="text-gray-600 mt-2">You need admin privileges to access this page.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 bg-[#d4a843] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#c49a3a] transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-[#1a2a3a] mb-2">⚙️ Admin Panel</h1>
          <p className="text-gray-600 mb-6">Set bid fees for different project types.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Single Room Fee (₹)</label>
              <input
                type="number"
                name="single_room_fee"
                value={settings.single_room_fee}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">1 BHK Fee (₹)</label>
              <input
                type="number"
                name="fee_1bhk"
                value={settings.fee_1bhk}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">2 BHK Fee (₹)</label>
              <input
                type="number"
                name="fee_2bhk"
                value={settings.fee_2bhk}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">3 BHK Fee (₹)</label>
              <input
                type="number"
                name="fee_3bhk"
                value={settings.fee_3bhk}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">4 BHK Fee (₹)</label>
              <input
                type="number"
                name="fee_4bhk"
                value={settings.fee_4bhk}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">5 BHK+ Fee (₹)</label>
              <input
                type="number"
                name="fee_5bhk_plus"
                value={settings.fee_5bhk_plus}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Commercial Project Fee (₹)</label>
              <input type="number" name="commercial_project_fee" value={settings.commercial_project_fee} onChange={handleChange} className="w-full p-3 border rounded-lg" min="0" required />
            </div>

            <div>
              <label className="block font-semibold mb-1">Other Project Fee (₹)</label>
              <input type="number" name="others_project_fee" value={settings.others_project_fee} onChange={handleChange} className="w-full p-3 border rounded-lg" min="0" required />
            </div>

            <div className="border-t pt-5">
              <h2 className="text-xl font-bold text-[#1a2a3a]">Buy Bid Package Pricing</h2>
              <p className="mt-1 text-sm text-gray-600">Changes apply to new purchases immediately.</p>
            </div>

            <div>
              <label className="block font-semibold mb-1">Starter Package (1 bid) (₹)</label>
              <input type="number" name="starter_package_price" value={settings.starter_package_price} onChange={handleChange} className="w-full p-3 border rounded-lg" min="0" required />
            </div>

            <div>
              <label className="block font-semibold mb-1">Silver Package (3 bids) (₹)</label>
              <input type="number" name="silver_package_price" value={settings.silver_package_price} onChange={handleChange} className="w-full p-3 border rounded-lg" min="0" required />
            </div>

            <div>
              <label className="block font-semibold mb-1">Gold Package (5 bids) (₹)</label>
              <input type="number" name="gold_package_price" value={settings.gold_package_price} onChange={handleChange} className="w-full p-3 border rounded-lg" min="0" required />
            </div>

            <div>
              <label className="block font-semibold mb-1">Platinum Package (10 bids) (₹)</label>
              <input type="number" name="platinum_package_price" value={settings.platinum_package_price} onChange={handleChange} className="w-full p-3 border rounded-lg" min="0" required />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#d4a843] text-white py-3 rounded-lg font-bold hover:bg-[#c49a3a] transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : '💾 Save Fees'}
            </button>
          </form>

          <section className="mt-10 border-t pt-8">
            <h2 className="text-2xl font-bold text-[#1a2a3a]">All Projects and Bids</h2>
            <p className="mt-1 text-gray-600">Review project details, client mobile numbers, and designer bids.</p>

            {projectsLoading && <p className="mt-5 text-gray-600">Loading project data...</p>}
            {projectsError && <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{projectsError}</p>}
            {!projectsLoading && !projectsError && projects.length === 0 && (
              <p className="mt-5 text-gray-600">No projects have been posted yet.</p>
            )}

            <div className="mt-5 space-y-5">
              {projects.map((project) => (
                <article key={project.id} className="rounded-xl border border-gray-200 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-[#1a2a3a]">{project.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">Posted {formatDate(project.created_at)}</p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold capitalize text-[#1a2a3a]">
                      {project.status || 'open'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                    <p><strong className="text-[#1a2a3a]">Client:</strong> {project.homeowner?.full_name || 'Not available'}</p>
                    <p><strong className="text-[#1a2a3a]">Mobile:</strong> {project.homeowner?.phone || 'Not available'}</p>
                    <p><strong className="text-[#1a2a3a]">Type:</strong> {formatProjectType(project.project_type)}</p>
                    <p><strong className="text-[#1a2a3a]">Location:</strong> {project.location || 'Not specified'}</p>
                    <p><strong className="text-[#1a2a3a]">Project Tier:</strong> {project.project_tier || 'Not specified'}</p>
                    <p><strong className="text-[#1a2a3a]">Timeline:</strong> {project.timeline_days ? `${project.timeline_days} days` : 'Not specified'}</p>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700">{project.description || 'No project details provided.'}</p>
                  {project.floor_plan_url && (
                    <a
                      href={project.floor_plan_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-block font-semibold text-[#1a2a3a] underline"
                    >
                      View floor plan
                    </a>
                  )}

                  <div className="mt-5 border-t pt-4">
                    <h4 className="font-bold text-[#1a2a3a]">Bids ({project.bids.length})</h4>
                    {project.bids.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-600">No bids received.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {project.bids.map((bid) => (
                          <div key={bid.id} className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <p className="font-semibold text-[#1a2a3a]">{bid.designer?.full_name || 'Designer'}</p>
                              <p className="capitalize">{bid.status || 'pending'}</p>
                            </div>
                            <div className="mt-2 grid gap-1 sm:grid-cols-2">
                              <p><strong className="text-[#1a2a3a]">Mobile:</strong> {bid.designer?.phone || 'Not available'}</p>
                              <p><strong className="text-[#1a2a3a]">Amount:</strong> ₹{bid.bid_amount ?? 'Not specified'}</p>
                              <p><strong className="text-[#1a2a3a]">Timeline:</strong> {bid.timeline_days ? `${bid.timeline_days} days` : 'Not specified'}</p>
                              <p><strong className="text-[#1a2a3a]">Submitted:</strong> {formatDate(bid.created_at)}</p>
                            </div>
                            <p className="mt-2"><strong className="text-[#1a2a3a]">Message:</strong> {bid.message || 'No message provided'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 text-[#1a2a3a] hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}