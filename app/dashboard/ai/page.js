'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

export default function AIAssistantPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
      } catch {
        router.push('/login')
        return
      } finally {
        setAuthChecked(true)
      }
    }

    checkAuth()
  }, [router])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!prompt.trim()) {
      setError('Please enter a prompt.')
      return
    }

    setLoading(true)
    setError('')
    setResponse('')

    try {
      const res = await fetch('/api/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          prompt,
          temperature: 0.7,
          max_tokens: 800,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to get a response from DeepSeek.')
      }

      setResponse(data.content || 'No answer returned from DeepSeek.')
    } catch (submitError) {
      setError(submitError.message || 'Something went wrong while contacting DeepSeek.')
    } finally {
      setLoading(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center text-[#1a2a3a]">
        Checking session...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-6 text-[#1a2a3a]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4a843]">HexBridge AI</p>
            <h1 className="mt-2 text-3xl font-semibold">Project Assistant</h1>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-full border border-[#d8d8dc] bg-white px-4 py-2 text-sm font-medium text-[#1a2a3a] hover:bg-[#f8f8f9]"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-[0_18px_45px_rgba(17,17,17,0.08)] ring-1 ring-black/5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-[#1a2a3a]">Ask for design ideas, project planning, or a bid review</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={7}
              placeholder="Example: Suggest 3 affordable interior concepts for a 2BHK apartment in Bangalore with minimal budget and warm lighting."
              className="w-full rounded-2xl border border-[#dfe2e6] bg-[#f9f9fb] p-4 text-base text-[#1a2a3a] outline-none focus:border-[#d4a843] focus:ring-2 focus:ring-[#d4a843]/25"
            />

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-[#6e6e73]">Powered by DeepSeek</div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-[#d4a843] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(212,168,67,0.25)] transition hover:bg-[#c49a3a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Thinking...' : 'Generate'}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {response && (
            <div className="mt-6 rounded-2xl bg-[#f5f7fb] p-4 text-sm leading-7 text-[#1a2a3a] whitespace-pre-wrap">
              {response}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
