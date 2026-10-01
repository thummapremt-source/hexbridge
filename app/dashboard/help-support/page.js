'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Sidebar from '../../../components/Sidebar'

const formatDateTime = (value) => new Date(value).toLocaleString('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const statusLabels = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
}

export default function HelpSupportPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tickets, setTickets] = useState([])
  const [responses, setResponses] = useState({})
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [savingTicketId, setSavingTicketId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    let cancelled = false

    async function loadSupportPage() {
      try {
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError

        if (!currentUser) {
          router.push('/login')
          return
        }

        const { data: currentProfile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', currentUser.id)
          .single()

        if (profileError) throw profileError

        const { data: ticketData, error: ticketsError } = await supabase
          .from('support_tickets')
          .select('*')
          .order('created_at', { ascending: false })

        if (ticketsError) throw ticketsError
        if (cancelled) return

        setUser(currentUser)
        setProfile(currentProfile)
        setTickets(ticketData || [])
        setResponses(Object.fromEntries((ticketData || []).map((ticket) => [
          ticket.id,
          { reply: ticket.admin_reply || '', status: ticket.status },
        ])))
      } catch (loadError) {
        console.error('Error loading support requests:', loadError)
        if (!cancelled) setError('Unable to load Help & Support. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSupportPage()
    return () => {
      cancelled = true
    }
  }, [router])

  const handleSubmitRequest = async (event) => {
    event.preventDefault()
    if (!user || !profile) return

    setSubmitting(true)
    setError('')
    setNotice('')

    try {
      const { data: ticket, error: insertError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          requester_name: profile.full_name || '',
          requester_email: user.email || '',
          requester_role: profile.role || '',
          subject: subject.trim(),
          message: message.trim(),
        })
        .select('*')
        .single()

      if (insertError) throw insertError

      setTickets((current) => [ticket, ...current])
      setSubject('')
      setMessage('')
      setNotice('Your support request was sent. We’ll get back to you as soon as we can.')
    } catch (submitError) {
      console.error('Error submitting support request:', submitError)
      setError('Unable to send your support request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveResponse = async (ticketId) => {
    const response = responses[ticketId]
    if (!response) return

    setSavingTicketId(ticketId)
    setError('')
    setNotice('')

    try {
      const reply = response.reply.trim()
      const update = {
        admin_reply: reply || null,
        status: response.status,
        responded_at: reply ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }
      const { data: updatedTicket, error: updateError } = await supabase
        .from('support_tickets')
        .update(update)
        .eq('id', ticketId)
        .select('*')
        .single()

      if (updateError) throw updateError

      setTickets((current) => current.map((ticket) => (
        ticket.id === ticketId ? updatedTicket : ticket
      )))
      setNotice('Support request updated.')
    } catch (updateError) {
      console.error('Error updating support request:', updateError)
      setError('Unable to update this support request. Please try again.')
    } finally {
      setSavingTicketId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg font-semibold text-[#1a2a3a]">Loading Help &amp; Support...</p>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="max-w-lg rounded-2xl bg-white p-6 text-center shadow-xl sm:p-8">
          <p role="alert" className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="mt-5 rounded-lg bg-[#d4a843] px-5 py-3 font-bold text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 lg:flex">
      <Sidebar initialRole={profile?.role} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:ml-64">
        <div className="mx-auto max-w-5xl">
          <header className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d4a843]">HexBridge</p>
            <h1 className="mt-2 text-3xl font-bold text-[#1a2a3a]">Help &amp; Support</h1>
            <p className="mt-2 text-gray-600">
              {isAdmin
                ? 'Review requests from homeowners and designers, reply, and update their status.'
                : 'Tell us what you need help with. You can track replies and request status here.'}
            </p>
          </header>

          {error && (
            <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {notice}
            </p>
          )}

          {!isAdmin && (
            <section className="mb-8 rounded-2xl bg-white p-5 shadow-xl sm:p-7">
              <h2 className="text-xl font-bold text-[#1a2a3a]">Send a support request</h2>
              <form onSubmit={handleSubmitRequest} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="support-subject" className="mb-1 block text-sm font-semibold text-[#1a2a3a]">Subject</label>
                  <input
                    id="support-subject"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    maxLength={120}
                    minLength={3}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#d4a843]"
                    placeholder="Briefly describe what you need help with"
                  />
                </div>
                <div>
                  <label htmlFor="support-message" className="mb-1 block text-sm font-semibold text-[#1a2a3a]">Details</label>
                  <textarea
                    id="support-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={5000}
                    minLength={10}
                    rows={5}
                    required
                    className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#d4a843]"
                    placeholder="Include the details that will help us resolve your request."
                  />
                  <p className="mt-1 text-right text-xs text-gray-500">{message.length}/5000</p>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-[#d4a843] px-5 py-3 font-bold text-white transition hover:bg-[#c49a3a] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {submitting ? 'Sending request...' : 'Send request'}
                </button>
              </form>
            </section>
          )}

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[#1a2a3a]">
                {isAdmin ? 'Support inbox' : 'Your requests'}
              </h2>
              <span className="rounded-full bg-[#1a2a3a] px-3 py-1 text-sm font-semibold text-white">
                {tickets.length} {tickets.length === 1 ? 'request' : 'requests'}
              </span>
            </div>

            {tickets.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-center text-gray-600 shadow-xl">
                {isAdmin ? 'There are no support requests yet.' : 'You have not sent a support request yet.'}
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => {
                  const response = responses[ticket.id] || { reply: ticket.admin_reply || '', status: ticket.status }

                  return (
                    <article key={ticket.id} className="rounded-2xl bg-white p-5 shadow-xl sm:p-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-bold text-[#1a2a3a]">{ticket.subject}</h3>
                          {isAdmin && (
                            <p className="mt-1 break-words text-sm text-gray-500">
                              {ticket.requester_name || 'HexBridge user'}
                              {ticket.requester_email ? ` · ${ticket.requester_email}` : ''}
                              {ticket.requester_role ? ` · ${ticket.requester_role}` : ''}
                            </p>
                          )}
                        </div>
                        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                          ticket.status === 'resolved'
                            ? 'bg-green-100 text-green-800'
                            : ticket.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-700'
                        }`}>
                          {statusLabels[ticket.status] || ticket.status}
                        </span>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{ticket.message}</p>
                      <p className="mt-3 text-xs text-gray-500">Submitted {formatDateTime(ticket.created_at)}</p>

                      {isAdmin ? (
                        <div className="mt-5 space-y-3 border-t border-gray-100 pt-5">
                          <div>
                            <label htmlFor={`reply-${ticket.id}`} className="mb-1 block text-sm font-semibold text-[#1a2a3a]">Admin reply</label>
                            <textarea
                              id={`reply-${ticket.id}`}
                              value={response.reply}
                              onChange={(event) => setResponses((current) => ({
                                ...current,
                                [ticket.id]: { ...response, reply: event.target.value },
                              }))}
                              maxLength={5000}
                              rows={3}
                              className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#d4a843]"
                              placeholder="Write a response for the requester"
                            />
                          </div>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1">
                              <label htmlFor={`status-${ticket.id}`} className="mb-1 block text-sm font-semibold text-[#1a2a3a]">Status</label>
                              <select
                                id={`status-${ticket.id}`}
                                value={response.status}
                                onChange={(event) => setResponses((current) => ({
                                  ...current,
                                  [ticket.id]: { ...response, status: event.target.value },
                                }))}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#d4a843]"
                              >
                                <option value="open">Open</option>
                                <option value="in_progress">In progress</option>
                                <option value="resolved">Resolved</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSaveResponse(ticket.id)}
                              disabled={savingTicketId === ticket.id}
                              className="w-full rounded-lg bg-[#d4a843] px-5 py-3 font-bold text-white transition hover:bg-[#c49a3a] disabled:opacity-60 sm:w-auto"
                            >
                              {savingTicketId === ticket.id ? 'Saving...' : 'Save response'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {ticket.admin_reply && (
                            <div className="mt-5 rounded-xl border border-[#d4a843]/30 bg-amber-50 p-4">
                              <p className="text-sm font-bold text-[#1a2a3a]">Reply from HexBridge Support</p>
                              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{ticket.admin_reply}</p>
                              {ticket.responded_at && (
                                <p className="mt-2 text-xs text-gray-500">Replied {formatDateTime(ticket.responded_at)}</p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
