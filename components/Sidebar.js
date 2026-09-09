'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function Sidebar({ initialRole = null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState(initialRole)
  const [loading, setLoading] = useState(!initialRole)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (initialRole) return

    async function getUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setRole(profile?.role || null)
      } catch (error) {
        console.error('Error fetching role:', error)
      } finally {
        setLoading(false)
      }
    }
    getUserRole()
  }, [initialRole, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (path) => pathname === path

  if (loading) {
    return (
      <div className="h-screen w-64 bg-[#1a2a3a] text-white p-4">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    )
  }

  const menuItems = {
    admin: [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Admin Panel', path: '/dashboard/admin' },
      { name: 'Profile', path: '/dashboard/profile' },
    ],
    homeowner: [
      { name: 'Home', path: '/dashboard' },
      { name: 'Get a Quote', path: '/dashboard/post-project' },
      { name: 'My Home', path: '/dashboard/my-projects' },
      { name: 'My Profile', path: '/dashboard/profile' },
      { name: 'Messages', path: '/dashboard/messages' },
    ],
    designer: [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Find Projects', path: '/dashboard/browse' },
      { name: 'My Bids', path: '/dashboard/my-bids' },
      { name: 'Profile', path: '/dashboard/profile' },
      { name: 'Messages', path: '/dashboard/messages' },
      { name: 'Buy Bids', path: '/dashboard/buy-bids' },
    ],
  }

  const items = menuItems[role] || menuItems.homeowner

  return (
    <>
      {/* ✅ Mobile Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-[#1a2a3a] text-white p-2 rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ✅ Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-[#1a2a3a] text-white p-4 transition-transform duration-300 ease-in-out z-40 translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="text-center py-6 border-b border-gray-700">
            <h1 className="text-2xl font-bold text-[#d4a843]">HexBridge</h1>
            <p className="text-xs text-gray-400">Connecting Homes &amp; Designers</p>
          </div>

          <nav className="flex-1 mt-6 space-y-1">
            {items.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`block px-4 py-3 rounded-lg transition ${
                  isActive(item.path)
                    ? 'bg-[#d4a843] text-[#1a2a3a] font-bold'
                    : 'hover:bg-gray-700 hover:text-white'
                }`}
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-700 pt-4">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-700 transition text-red-400 hover:text-red-300"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
