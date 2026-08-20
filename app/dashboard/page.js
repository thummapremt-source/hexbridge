'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'   // ✅ Correct path
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(profile)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router])

  if (loading) {
    return <div className="text-center text-white text-xl mt-20">Loading...</div>
  }

  if (!profile) {
    return <div className="text-center text-white text-xl mt-20">No profile found</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-[#1a2a3a]">
            Welcome, {profile.full_name}!
          </h1>
          <p className="text-gray-600 mt-2">
            You are logged in as a <strong>{profile.role}</strong>.
          </p>
          <div className="mt-6 border-t pt-6">
            {profile.role === 'homeowner' ? (
              <div>
                <h2 className="text-xl font-semibold">🏠 Post a New Project</h2>
                <p className="text-gray-600 mt-1">
                  Describe your interior needs and get bids from top designers.
                </p>
                <button 
                  onClick={() => router.push('/dashboard/post-project')}
                  className="mt-4 bg-[#d4a843] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#c49a3a] transition"
                >
                  + Create Project
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold">🛠️ Browse Available Projects</h2>
                <p className="text-gray-600 mt-1">
                  Find projects that match your expertise and place your bid.
                </p>
                <button 
                  onClick={() => router.push('/dashboard/browse')}
                  className="mt-4 bg-[#d4a843] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#c49a3a] transition"
                >
                  View Projects
                </button>
              </div>
            )}
          </div>
          <button 
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="mt-8 text-red-500 hover:underline"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}