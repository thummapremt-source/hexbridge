'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import Sidebar from '../../components/Sidebar'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      try {
        if (!supabase) {
          router.push('/login')
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        let { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile) {
          const fallbackName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User'
          const fallbackRole = user.user_metadata?.role || 'homeowner'

          const { data: insertedProfile, error: insertError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              full_name: fallbackName,
              phone: user.phone || '',
              role: fallbackRole,
            }, { onConflict: 'id' })
            .select('full_name, role')
            .single()

          if (insertError) {
            console.error('Profile bootstrap failed:', insertError)
            const message = insertError.code === '42501'
              ? 'Profile setup is blocked by Supabase RLS. Run the SQL in supabase/profiles-disable-rls.sql in your Supabase SQL editor, then refresh.'
              : insertError.message || 'Profile setup failed.'
            setError(message)
            setProfile(null)
            return
          }

          profile = insertedProfile
        }

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
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg text-center">
          <h2 className="text-2xl font-bold text-[#1a2a3a]">Profile setup needed</h2>
          <p className="mt-3 text-gray-600">{error || 'No profile found for this account.'}</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-5 bg-[#d4a843] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#c49a3a] transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar initialRole={profile.role} />

      <main className="flex-1 p-6 ml-64">
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
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push('/dashboard/post-project')}
                      className="bg-[#d4a843] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#c49a3a] transition"
                    >
                      + Create Project
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold">🛠️ Browse Available Projects</h2>
                  <p className="text-gray-600 mt-1">
                    Find projects that match your expertise and place your bid.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push('/dashboard/browse')}
                      className="bg-[#d4a843] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#c49a3a] transition"
                    >
                      View Projects
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="mt-8 text-red-500 hover:underline"
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}