'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'

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

export default function ProjectBidsPage() {
  const router = useRouter()
  const { projectId } = useParams()
  const [project, setProject] = useState(null)
  const [bids, setBids] = useState([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [processingBidId, setProcessingBidId] = useState(null)

  useEffect(() => {
    async function loadProjectBids() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, title, description, project_type, location, status, created_at')
          .eq('id', projectId)
          .eq('homeowner_id', user.id)
          .single()

        if (projectError) {
          if (projectError.code === 'PGRST116') {
            setAccessDenied(true)
            return
          }
          throw projectError
        }

        const { data: bidsData, error: bidsError } = await supabase
          .from('bids')
          .select('id, designer_id, bid_amount, timeline_days, message, status, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })

        if (bidsError) throw bidsError

        const designerIds = [...new Set((bidsData || []).map((bid) => bid.designer_id).filter(Boolean))]
        let profilesById = {}

        if (designerIds.length > 0) {
          try {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, phone, email')
              .in('id', designerIds)

            if (profilesError) {
              console.warn('Profile lookup unavailable for this project:', profilesError?.message || profilesError)
            } else {
              profilesById = Object.fromEntries((profilesData || []).map((profile) => [profile.id, profile]))
            }
          } catch (profileLookupError) {
            console.warn('Profile lookup unavailable for this project:', profileLookupError?.message || profileLookupError)
          }
        }

        const normalizedBids = (bidsData || []).map((bid) => ({
          ...bid,
          profiles: profilesById[bid.designer_id] || null,
        }))

        setProject(projectData)
        setBids(normalizedBids)
      } catch (loadError) {
        console.error('Error loading project bids:', loadError)
        setError('Unable to load this project and its bids. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (projectId) loadProjectBids()
  }, [projectId, router])

  const showToast = (message, type) => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 4000)
  }

  const updateBidStatus = async (bidId, nextStatus) => {
    setProcessingBidId(bidId)

    try {
      const { error: bidError } = await supabase
        .from('bids')
        .update({ status: nextStatus })
        .eq('id', bidId)
        .eq('project_id', projectId)

      if (bidError) throw bidError

      if (nextStatus === 'accepted') {
        const { error: projectError } = await supabase
          .from('projects')
          .update({ status: 'assigned' })
          .eq('id', projectId)

        if (projectError) throw projectError

        const { error: otherBidsError } = await supabase
          .from('bids')
          .update({ status: 'rejected' })
          .eq('project_id', projectId)
          .neq('id', bidId)

        if (otherBidsError) throw otherBidsError

        setProject((current) => ({ ...current, status: 'assigned' }))
        setBids((current) => current.map((bid) => ({
          ...bid,
          status: bid.id === bidId ? 'accepted' : 'rejected',
        })))
        showToast('Bid accepted successfully.', 'success')
      } else {
        setBids((current) => current.map((bid) => (
          bid.id === bidId ? { ...bid, status: 'rejected' } : bid
        )))
        showToast('Bid rejected successfully.', 'success')
      }
    } catch (actionError) {
      console.error('Error updating bid:', actionError)
      showToast(`Unable to ${nextStatus} this bid. Please try again.`, 'error')
    } finally {
      setProcessingBidId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-[#1a2a3a] text-xl font-semibold">Loading project bids...</div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-lg">
          <h1 className="text-2xl font-bold text-[#1a2a3a]">Access denied</h1>
          <p className="text-gray-600 mt-2">Only the homeowner who posted this project can view its bids.</p>
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
      {toast && (
        <div className={`fixed top-5 right-5 z-10 rounded-lg px-5 py-3 text-white shadow-xl ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push('/dashboard/my-projects')}
          className="text-[#1a2a3a] font-semibold hover:underline mb-5"
        >
          Back to My Projects
        </button>

        {error ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 text-red-500">{error}</div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-[#1a2a3a]">{project.title}</h1>
                  <p className="text-gray-600 mt-2">{project.description}</p>
                </div>
                <span className="text-sm font-semibold capitalize text-[#1a2a3a] bg-gray-100 px-3 py-1 rounded-full">
                  {project.status}
                </span>
              </div>
              <div className="mt-4 space-y-1 text-sm text-gray-600">
                <p><span className="font-semibold text-[#1a2a3a]">Type:</span> {formatProjectType(project.project_type)}</p>
                <p><span className="font-semibold text-[#1a2a3a]">Location:</span> {project.location || 'Not specified'}</p>
                <p><span className="font-semibold text-[#1a2a3a]">Created:</span> {formatDate(project.created_at)}</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-[#1a2a3a] mb-4">Bids ({bids.length})</h2>
            {bids.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-6 text-gray-600">No bids have been received yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bids.map((bid) => (
                  <div key={bid.id} className="bg-white rounded-2xl shadow-xl p-6">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-xl font-bold text-[#1a2a3a]">
                        {bid.profiles?.full_name || 'Designer'}
                      </h3>
                      <span className="text-sm font-semibold capitalize text-[#1a2a3a] bg-gray-100 px-3 py-1 rounded-full">
                        {bid.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <p><span className="font-semibold text-[#1a2a3a]">Bid amount:</span> ₹{bid.bid_amount}</p>
                      <p><span className="font-semibold text-[#1a2a3a]">Timeline:</span> {bid.timeline_days} days</p>
                      <p><span className="font-semibold text-[#1a2a3a]">Message:</span> {bid.message || 'No message provided'}</p>
                      <p><span className="font-semibold text-[#1a2a3a]">Submitted:</span> {formatDate(bid.created_at)}</p>
                    </div>

                    {bid.status === 'accepted' && (
                      <div className="mt-4 border-t pt-4 text-sm text-gray-600">
                        <p className="font-bold text-[#d4a843]">Contact revealed</p>
                        <p><span className="font-semibold text-[#1a2a3a]">Phone:</span> {bid.profiles?.phone || 'Not available'}</p>
                        <p><span className="font-semibold text-[#1a2a3a]">Email:</span> {bid.profiles?.email || 'Not available'}</p>
                      </div>
                    )}

                    {bid.status === 'pending' && (
                      <div className="mt-5 flex gap-3">
                        <button
                          onClick={() => updateBidStatus(bid.id, 'accepted')}
                          disabled={processingBidId !== null}
                          className="flex-1 bg-[#d4a843] text-white py-2 rounded-lg font-bold hover:bg-[#c49a3a] transition disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => updateBidStatus(bid.id, 'rejected')}
                          disabled={processingBidId !== null}
                          className="flex-1 bg-[#1a2a3a] text-white py-2 rounded-lg font-bold hover:bg-[#2a3a4a] transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  )
}