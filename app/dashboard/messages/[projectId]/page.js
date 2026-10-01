'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'

const formatDateTime = (date) => new Date(date).toLocaleString('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

export default function ChatPage() {
  const router = useRouter()
  const { projectId } = useParams()
  const [user, setUser] = useState(null)
  const [project, setProject] = useState(null)
  const [receiverId, setReceiverId] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [error, setError] = useState('')

  const loadMessages = useCallback(async (currentUserId, acceptedBid) => {
    const { data, error: messagesError } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, message, is_read, created_at, profiles!sender_id(full_name)')
      .eq('project_id', projectId)
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    setMessages(data || [])

    const unreadIds = (data || [])
      .filter((item) => item.receiver_id === currentUserId && !item.is_read)
      .map((item) => item.id)

    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadIds)
        .eq('receiver_id', currentUserId)
    }

    setReceiverId(acceptedBid.designer_id === currentUserId
      ? acceptedBid.projects.homeowner_id
      : acceptedBid.designer_id)
  }, [projectId])

  useEffect(() => {
    async function loadChat() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (!currentUser) {
          router.push('/login')
          return
        }

        const { data: acceptedBid, error: bidError } = await supabase
          .from('bids')
          .select('designer_id, projects!inner(id, title, homeowner_id, status)')
          .eq('project_id', projectId)
          .eq('status', 'accepted')
          .single()

        if (bidError) {
          setAccessDenied(true)
          return
        }

        const isParticipant = currentUser.id === acceptedBid.designer_id
          || currentUser.id === acceptedBid.projects.homeowner_id

        if (!isParticipant) {
          setAccessDenied(true)
          return
        }

        setUser(currentUser)
        setProject(acceptedBid.projects)
        await loadMessages(currentUser.id, acceptedBid)
      } catch (loadError) {
        console.error('Error loading chat:', loadError)
        setError('Unable to load this conversation. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (projectId) loadChat()
  }, [loadMessages, projectId, router])

  useEffect(() => {
    if (!user || !projectId || !receiverId) return undefined

    const interval = window.setInterval(() => {
      loadMessages(user.id, {
        designer_id: user.id,
        projects: { homeowner_id: receiverId },
      }).catch((refreshError) => console.error('Error refreshing messages:', refreshError))
    }, 10000)

    return () => window.clearInterval(interval)
  }, [loadMessages, projectId, receiverId, user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedMessage = messageText.trim()

    if (!trimmedMessage || !user || !receiverId) return

    setSending(true)
    setError('')

    try {
      const { data: newMessage, error: sendError } = await supabase
        .from('messages')
        .insert({
          project_id: projectId,
          sender_id: user.id,
          receiver_id: receiverId,
          message: trimmedMessage,
        })
        .select('id, sender_id, receiver_id, message, is_read, created_at, profiles!sender_id(full_name)')
        .single()

      if (sendError) throw sendError

      setMessages((current) => [...current, newMessage])
      setMessageText('')
    } catch (sendError) {
      console.error('Error sending message:', sendError)
      setError('Unable to send your message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-[#1a2a3a] text-xl font-semibold">Loading conversation...</div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-lg">
          <h1 className="text-2xl font-bold text-[#1a2a3a]">Access denied</h1>
          <p className="text-gray-600 mt-2">Messages are available only to participants in accepted projects.</p>
          <button
            onClick={() => router.push('/dashboard/messages')}
            className="mt-4 bg-[#d4a843] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#c49a3a] transition"
          >
            Back to Messages
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 lg:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:ml-64">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => router.push('/dashboard/messages')}
            className="mb-5 font-semibold text-[#1a2a3a] hover:underline"
          >
            Back to Messages
          </button>

          <div className="rounded-2xl bg-white p-4 shadow-xl sm:p-6">
            <h1 className="break-words text-2xl font-bold text-[#1a2a3a]">{project.title}</h1>
            <p className="mt-1 text-sm text-gray-500">Private project conversation</p>

            <div className="mt-6 h-[min(28rem,55dvh)] min-h-64 space-y-4 overflow-y-auto rounded-lg border bg-gray-50 p-3 sm:p-4">
              {messages.length === 0 ? (
                <p className="mt-20 text-center text-gray-500">No messages yet. Start the conversation.</p>
              ) : messages.map((item) => {
                const isMine = item.sender_id === user.id

                return (
                  <div key={item.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] break-words rounded-lg px-4 py-3 sm:max-w-[80%] ${isMine ? 'bg-[#1a2a3a] text-white' : 'bg-white text-gray-700 shadow'}`}>
                      <p className="text-sm">{item.message}</p>
                      <p className={`mt-2 text-xs ${isMine ? 'text-gray-300' : 'text-gray-500'}`}>
                        {isMine ? 'You' : (item.profiles?.full_name || 'Participant')} · {formatDateTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {error && <p className="mt-4 text-red-500">{error}</p>}

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Write a message..."
                className="min-w-0 flex-1 rounded-lg border p-3"
                disabled={sending}
                required
              />
              <button
                type="submit"
                disabled={sending || !messageText.trim()}
                className="rounded-lg bg-[#d4a843] px-6 py-3 font-bold text-white transition hover:bg-[#c49a3a] disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}