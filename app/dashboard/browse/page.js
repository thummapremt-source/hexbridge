'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { INDIAN_STATES } from '../../../lib/indianStates'

export default function BrowseProjects() {
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ state: '', city: '' })
  const [appliedFilters, setAppliedFilters] = useState({ state: '', city: '' })

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        let query = supabase
          .from('projects')
          .select('*, profiles!homeowner_id(full_name, phone)')
          .eq('status', 'open')

        if (appliedFilters.state) {
          query = query.eq('state', appliedFilters.state)
        }

        if (appliedFilters.city) {
          query = query.ilike('mandal', `%${appliedFilters.city}%`)
        }

        const { data, error: queryError } = await query.order('created_at', { ascending: false })

        if (queryError) throw queryError
        if (!cancelled) setProjects(data || [])
      } catch (err) {
        console.error('Error loading projects:', err)
        if (!cancelled) setError('Unable to load projects. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [appliedFilters.city, appliedFilters.state, router])

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const applyFilters = (event) => {
    event.preventDefault()
    setAppliedFilters({ state: filters.state, city: filters.city.trim() })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101820] flex items-center justify-center">
        <div className="text-[#d4a843] text-xl font-semibold">Loading projects...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#101820] flex">
      <Sidebar />
      <div className="flex-1 p-6 lg:ml-64">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">🛠️ Available Projects</h1>
          <p className="mb-6 text-gray-400">Browse all open projects or narrow the list by location.</p>

          <form
            onSubmit={applyFilters}
            className="mb-8 grid grid-cols-1 items-end gap-4 rounded-2xl border border-[#d4a843]/30 bg-[#1a2a3a] p-5 shadow-xl md:grid-cols-[1fr_1fr_auto]"
          >
            <div>
              <label htmlFor="state-filter" className="mb-2 block text-sm font-semibold text-white">State</label>
              <select
                id="state-filter"
                name="state"
                value={filters.state}
                onChange={handleFilterChange}
                className="w-full rounded-xl border border-white/15 bg-[#101820] px-4 py-3 text-white outline-none focus:border-[#d4a843]"
              >
                <option value="">All States</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="city-filter" className="mb-2 block text-sm font-semibold text-white">City / Mandal</label>
              <input
                id="city-filter"
                type="text"
                name="city"
                value={filters.city}
                onChange={handleFilterChange}
                placeholder="Enter a city or mandal"
                className="w-full rounded-xl border border-white/15 bg-[#101820] px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-[#d4a843]"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-[#d4a843] px-6 py-3 font-bold text-[#101820] transition hover:bg-[#c49a3a]"
            >
              Apply Filter
            </button>
          </form>

          {error && (
            <p role="alert" className="mb-6 rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {projects.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#1a2a3a] p-8 text-center">
              <h2 className="text-xl font-bold text-white">No matching open projects</h2>
              <p className="mt-2 text-gray-400">
                {appliedFilters.state || appliedFilters.city
                  ? 'Try changing or clearing your location filters.'
                  : 'Check back later for new projects.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {projects.map((project) => (
                <div key={project.id} className="rounded-2xl border border-white/10 bg-[#1a2a3a] p-6 shadow-xl transition hover:border-[#d4a843]/50 hover:shadow-2xl">
                  <h2 className="text-xl font-bold text-white">{project.title}</h2>
                  <p className="mt-1 text-sm text-gray-300">
                    {project.description?.slice(0, 100)}
                    {project.description?.length > 100 && '...'}
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-gray-400">
                    <p><span className="font-semibold text-gray-200">Type:</span> {project.project_type?.replaceAll('_', ' ').toUpperCase() || 'Not specified'}</p>
                    <p><span className="font-semibold text-gray-200">Location:</span> {[project.mandal, project.state].filter(Boolean).join(', ') || project.location || 'Not specified'}</p>
                    <p><span className="font-semibold text-gray-200">Timeline:</span> {project.timeline_days ? `${project.timeline_days} days` : 'Not specified'}</p>
                    {project.plywood_brands?.length > 0 && (
                      <p><span className="font-semibold text-gray-200">Plywood:</span> {project.plywood_brands.join(', ')}</p>
                    )}
                    <p><span className="font-semibold text-gray-200">Posted by:</span> {project.profiles?.full_name || 'Anonymous'}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/bid?projectId=${project.id}`)}
                    className="mt-4 w-full rounded-lg bg-[#d4a843] py-2 font-bold text-[#101820] transition hover:bg-[#c49a3a]"
                  >
                    Place a Bid
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}