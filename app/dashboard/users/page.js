'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Sidebar from '../../../components/Sidebar'

const formatDate = (date) => {
  if (!date) return 'Not available'

  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [role, setRole] = useState('homeowner')

  useEffect(() => {
    async function loadUsers() {
      try {
        if (!supabase) {
          setAccessDenied(true)
          setLoading(false)
          return
        }

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          console.warn('Profile check failed for admin access:', profileError?.message || profileError)
          setAccessDenied(true)
          setLoading(false)
          return
        }

        if (profileData?.role !== 'admin') {
          setAccessDenied(true)
          setLoading(false)
          return
        }

        setRole('admin')

        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, created_at')
          .order('created_at', { ascending: false })

        if (usersError) {
          console.warn('Users query failed:', usersError?.message || usersError)
          setUsers([])
          return
        }

        setUsers(usersData || [])
      } catch (error) {
        console.error('Error loading users:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-[#1a2a3a] text-xl font-semibold">Loading users...</div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-lg">
          <h1 className="text-2xl font-bold text-[#1a2a3a]">Access denied</h1>
          <p className="text-gray-600 mt-2">Only admins can view this page.</p>
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
      <Sidebar role={role} onLogout={async () => {
        if (supabase) {
          await supabase.auth.signOut()
        }
        router.push('/login')
      }} />

      <main className="flex-1 p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h1 className="text-3xl font-bold text-[#1a2a3a]">Users</h1>
            <p className="text-gray-600 mt-2">Manage all registered HexBridge users.</p>
          </div>

          {users.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-6 text-center text-gray-600">
              No users found.
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#1a2a3a]">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#1a2a3a]">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#1a2a3a]">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#1a2a3a]">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-semibold text-[#1a2a3a]">{user.full_name || 'Unnamed user'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.email || 'Not available'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold uppercase bg-[#d4a843]/15 text-[#1a2a3a]">
                            {user.role || 'user'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(user.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
