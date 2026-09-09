'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'

export default function BrowseProjects() {
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data, error } = await supabase
          .from('projects')
          .select('*, profiles!homeowner_id(full_name, phone)')
          .eq('status', 'open')
          .order('created_at', { ascending: false })

        if (error) throw error
        setProjects(data || [])
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-[#1a2a3a] text-xl font-semibold">Loading projects...</div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-lg">
          <h2 className="text-2xl font-bold text-[#1a2a3a]">No open projects yet</h2>
          <p className="text-gray-600 mt-2">Check back later or share HexBridge with homeowners!</p>
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
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar />
      <div className="flex-1 p-6 ml-64">
        <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1a2a3a] mb-6">🛠️ Available Projects</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
              <h2 className="text-xl font-bold text-[#1a2a3a]">{project.title}</h2>
              <p className="text-gray-600 text-sm mt-1">
                {project.description?.slice(0, 100)}
                {project.description?.length > 100 && '...'}
              </p>
              <div className="mt-3 space-y-1 text-sm text-gray-500">
                <p><span className="font-semibold">Type:</span> {project.project_type.replace('_', ' ').toUpperCase()}</p>
                <p><span className="font-semibold">Location:</span> {project.location}</p>
                <p><span className="font-semibold">Timeline:</span> {project.timeline_days ? `${project.timeline_days} days` : 'Not specified'}</p>
                {project.plywood_brands?.length > 0 && (
                  <p><span className="font-semibold">Plywood:</span> {project.plywood_brands.join(', ')}</p>
                )}
                <p><span className="font-semibold">Posted by:</span> {project.profiles?.full_name || 'Anonymous'}</p>
              </div>
              <button
                onClick={() => router.push(`/dashboard/bid?projectId=${project.id}`)}
                className="mt-4 w-full bg-[#1a2a3a] text-white py-2 rounded-lg font-bold hover:bg-[#2a3a4a] transition"
              >
                Place a Bid
              </button>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}