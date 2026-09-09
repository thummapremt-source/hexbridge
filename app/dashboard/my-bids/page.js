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

export default function MyBids() {
  const router = useRouter()
  const [bids, setBids] = useState([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadBids() {
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

        if (profile?.role !== 'designer') {
          setAccessDenied(true)
          return
        }

        const { data, error: bidsError } = await supabase
          .from('bids')
          .select('id, bid_amount, timeline_days, status, created_at, projects(title, location, project_type)')
          .eq('designer_id', user.id)
          .order('created_at', { ascending: false })

        if (bidsError) throw bidsError

        setBids(data || [])
      } catch (loadError) {
        console.error('Error loading bids:', loadError)
        setError('Unable to load your bids. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadBids()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-[#1a2a3a] text-xl font-semibold">Loading your bids...</div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-lg">
          <h1 className="text-2xl font-bold text-[#1a2a3a]">Designer access only</h1>
          <p className="text-gray-600 mt-2">Only designers and contractors can view their bids.</p>
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
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-[#1a2a3a]">My Bids</h1>
          <button
            onClick={() => router.push('/dashboard/browse')}
            className="bg-[#d4a843] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#c49a3a] transition"
          >
            Browse Projects
          </button>
        </div>

        {error && (
          <div className="bg-white rounded-2xl shadow-xl p-6 text-red-500 mb-6">{error}</div>
        )}

        {!error && bids.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
            <p className="text-gray-600">You haven't placed any bids yet. Browse projects to get started!</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bids.map((bid) => {
            const project = bid.projects

            return (
              <div key={bid.id} className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-xl font-bold text-[#1a2a3a]">
                    {project?.title || 'Untitled project'}
                  </h2>
                  <span className="text-sm font-semibold capitalize text-[#1a2a3a] bg-gray-100 px-3 py-1 rounded-full">
                    {bid.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <p><span className="font-semibold text-[#1a2a3a]">Bid amount:</span> ₹{bid.bid_amount}</p>
                  <p><span className="font-semibold text-[#1a2a3a]">Timeline:</span> {bid.timeline_days} days</p>
                  <p><span className="font-semibold text-[#1a2a3a]">Type:</span> {formatProjectType(project?.project_type)}</p>
                  <p><span className="font-semibold text-[#1a2a3a]">Location:</span> {project?.location || 'Not specified'}</p>
                  <p><span className="font-semibold text-[#1a2a3a]">Created:</span> {formatDate(bid.created_at)}</p>
                </div>

                <button
                  onClick={() => router.push('/dashboard/browse')}
                  className="mt-5 w-full bg-[#1a2a3a] text-white py-2 rounded-lg font-bold hover:bg-[#2a3a4a] transition"
                >
                  View Project
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}