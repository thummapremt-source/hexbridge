'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Sidebar from '../../../components/Sidebar'

const formatProjectType = (projectType) => {
  if (!projectType) return 'Not specified'
  return projectType.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const formatDate = (date) => {
  if (!date) return 'Not available'
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function MyProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProjects() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError

        if (profile?.role !== 'homeowner') {
          setAccessDenied(true)
          return
        }

        const { data, error: projectsError } = await supabase
          .from('projects')
          .select('id, title, description, project_type, location, status, created_at, homeowner_id')
          .eq('homeowner_id', user.id)
          .order('created_at', { ascending: false })

        if (projectsError) throw projectsError

        const projectsWithBidCount = await Promise.all(
          (data || []).map(async (project) => {
            const { count, error: bidCountError } = await supabase
              .from('bids')
              .select('*', { count: 'exact', head: true })
              .eq('project_id', project.id)

            if (bidCountError) {
              console.error('Error loading bid count for project:', bidCountError)
            }

            return {
              ...project,
              bidCount: count || 0,
            }
          })
        )

        setProjects(projectsWithBidCount)
      } catch (loadError) {
        console.error('Error loading projects:', loadError)
        setError('Unable to load your projects. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-[#1a2a3a] text-xl font-semibold">Loading...</div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <Sidebar role="homeowner" onLogout={handleLogout} />

        <main className="flex-1 p-6 md:p-8 lg:ml-64">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <h1 className="text-2xl font-bold text-[#1a2a3a]">Access Denied</h1>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar role="homeowner" onLogout={handleLogout} />

      <main className="flex-1 p-6 md:p-8 lg:ml-64">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[#d4a843] font-semibold">HexBridge</p>
              <h1 className="text-3xl font-bold text-[#1a2a3a] mt-1">My Projects</h1>
            </div>

            <Link
              href="/dashboard/post-project"
              className="inline-flex items-center justify-center rounded-xl bg-[#d4a843] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#d4a843]/20 transition hover:opacity-95"
            >
              Post New Project
            </Link>
          </div>

          {error && (
            <div className="bg-white rounded-2xl shadow-xl p-6 text-red-500 mb-6">{error}</div>
          )}

          {!error && projects.length === 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
              <p className="text-[#1a2a3a]">You haven&apos;t posted any projects yet.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h2 className="text-xl font-bold text-[#1a2a3a] leading-tight">{project.title}</h2>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                      project.status === 'open'
                        ? 'bg-[#d4a843]/15 text-[#8a6a20]'
                        : project.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : project.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : project.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {project.status || 'open'}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {project.description?.length > 120
                    ? `${project.description.slice(0, 120)}...`
                    : project.description || 'No description provided.'}
                </p>

                <div className="space-y-2 text-sm text-[#1a2a3a]">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium">{formatProjectType(project.project_type)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Location</span>
                    <span className="font-medium">{project.location || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Status</span>
                    <span className="font-medium capitalize">{project.status || 'open'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Bid Count</span>
                    <span className="font-medium">{project.bidCount}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Posted Date</span>
                    <span className="font-medium">{formatDate(project.created_at)}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href={`/dashboard/project-bids/${project.id}`}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-[#1a2a3a] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#243447]"
                  >
                    View Bids
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
