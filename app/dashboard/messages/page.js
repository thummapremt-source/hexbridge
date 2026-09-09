'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export default function MessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadConversations() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const { data: acceptedBids, error: acceptedBidsError } = await supabase
          .from('bids')
          .select('project_id, designer_id, status')
          .eq('status', 'accepted')

        if (acceptedBidsError) {
          console.warn('Accepted bids lookup failed:', acceptedBidsError?.message || acceptedBidsError)
          setConversations([])
          return
        }

        const projectIds = [...new Set((acceptedBids || []).map((bid) => bid.project_id).filter(Boolean))]

        if (projectIds.length === 0) {
          setConversations([])
          return
        }

        let projectMap = new Map()

        try {
          const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select('id, title, homeowner_id')
            .in('id', projectIds)

          if (projectsError) {
            console.warn('Project lookup failed for conversations:', projectsError?.message || projectsError)
          } else {
            projectMap = new Map((projectsData || []).map((project) => [project.id, project]))
          }
        } catch (projectLookupError) {
          console.warn('Project lookup failed for conversations:', projectLookupError?.message || projectLookupError)
        }

        const validProjectIds = Array.from(projectMap.keys())

        if (validProjectIds.length === 0) {
          setConversations([])
          return
        }

        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, project_id, sender_id, receiver_id, message, is_read, created_at')
          .in('project_id', validProjectIds)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })

        if (messagesError) {
          console.warn('Message lookup failed for conversations:', messagesError?.message || messagesError)
          setConversations([])
          return
        }

        const latestByProject = new Map()

        ;(messages || []).forEach((message) => {
          const currentLatest = latestByProject.get(message.project_id)
          if (!currentLatest || new Date(message.created_at) > new Date(currentLatest.created_at)) {
            latestByProject.set(message.project_id, message)
          }
        })

        const otherUserIds = [...new Set((messages || []).flatMap((message) => [message.sender_id, message.receiver_id]).filter((id) => id && id !== user.id))]
        let profilesById = {}

        if (otherUserIds.length > 0) {
          try {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', otherUserIds)

            if (!profilesError) {
              profilesById = Object.fromEntries((profilesData || []).map((profile) => [profile.id, profile]))
            }
          } catch (profileLookupError) {
            console.warn('Profile lookup failed for conversations:', profileLookupError?.message || profileLookupError)
          }
        }

        setConversations(Array.from(latestByProject.entries()).map(([projectId, latestMessage]) => {
          const project = projectMap.get(projectId)
          const otherUserId = latestMessage.sender_id === user.id
            ? latestMessage.receiver_id
            : latestMessage.sender_id

          return {
            projectId,
            title: project?.title || 'Project conversation',
            designerName: profilesById[otherUserId]?.full_name || 'User',
            otherUserId,
            latestMessage,
          }
        }))
      } catch (loadError) {
        console.error('Error loading conversations:', loadError)
        setError('Unable to load your conversations. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadConversations()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-[#1a2a3a] text-xl font-semibold">Loading messages...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1a2a3a] mb-6">Messages</h1>

        {error && <div className="bg-white rounded-2xl shadow-xl p-6 text-red-500">{error}</div>}

        {!error && conversations.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center text-gray-600">
            No conversations yet. Messages are available after a bid is accepted.
          </div>
        )}

        <div className="space-y-5">
          {conversations.map((conversation) => (
            <button
              key={conversation.projectId}
              type="button"
              onClick={() => router.push(`/dashboard/messages/${conversation.projectId}`)}
              className="w-full text-left bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#1a2a3a]">{conversation.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">Conversation with {conversation.designerName}</p>
                </div>
                <span className="text-sm text-gray-500">{formatDate(conversation.latestMessage.created_at)}</span>
              </div>
              <p className="text-gray-600 mt-4 line-clamp-2">{conversation.latestMessage.message}</p>
              {!conversation.latestMessage.is_read && (
                <span className="inline-block mt-3 text-sm font-bold text-[#d4a843]">Unread message</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}