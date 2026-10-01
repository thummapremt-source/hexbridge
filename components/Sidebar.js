'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

const DASHBOARD_HISTORY_KEY = 'hexbridge-dashboard-route-history'

const readRouteHistory = () => {
  try {
    const history = JSON.parse(window.sessionStorage.getItem(DASHBOARD_HISTORY_KEY) || '[]')
    return Array.isArray(history) ? history.filter((path) => typeof path === 'string' && path.startsWith('/dashboard')) : []
  } catch (error) {
    console.error('Error reading dashboard navigation history:', error)
    return []
  }
}

export default function Sidebar({ initialRole = null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState(initialRole)
  const [loading, setLoading] = useState(!initialRole)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!pathname?.startsWith('/dashboard')) return

    const history = readRouteHistory()
    if (history[history.length - 1] !== pathname) history.push(pathname)
    window.sessionStorage.setItem(DASHBOARD_HISTORY_KEY, JSON.stringify(history))
  }, [pathname])

  useEffect(() => {
    const handleBrowserBack = () => {
      const history = readRouteHistory()
      if (history[history.length - 1] === pathname) history.pop()
      window.sessionStorage.setItem(DASHBOARD_HISTORY_KEY, JSON.stringify(history))
    }

    window.addEventListener('popstate', handleBrowserBack)
    return () => window.removeEventListener('popstate', handleBrowserBack)
  }, [pathname])

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

  useEffect(() => {
    if (!isOpen) return

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.sessionStorage.removeItem(DASHBOARD_HISTORY_KEY)
    router.push('/login')
  }

  const handleBack = () => {
    const history = readRouteHistory()
    if (history[history.length - 1] === pathname) history.pop()
    const target = history[history.length - 1] || '/dashboard'
    window.sessionStorage.setItem(DASHBOARD_HISTORY_KEY, JSON.stringify(history))
    router.push(target)
  }

  const isActive = (path) => pathname === path

  if (loading) {
    return (
      <div className="fixed inset-y-0 left-0 hidden h-screen w-64 bg-[#1a2a3a] p-4 text-white lg:block">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    )
  }

  const menuItems = {
    admin: [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Admin Panel', path: '/dashboard/admin' },
      { name: 'Help & Support', path: '/dashboard/help-support' },
      { name: 'Profile', path: '/dashboard/profile' },
    ],
    homeowner: [
      { name: 'Home', path: '/dashboard' },
      { name: 'Get a Quote', path: '/dashboard/post-project' },
      { name: 'My Home', path: '/dashboard/my-projects' },
      { name: 'My Profile', path: '/dashboard/profile' },
      { name: 'Messages', path: '/dashboard/messages' },
      { name: 'Help & Support', path: '/dashboard/help-support' },
    ],
    designer: [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Find Projects', path: '/dashboard/browse' },
      { name: 'My Bids', path: '/dashboard/my-bids' },
      { name: 'Profile', path: '/dashboard/profile' },
      { name: 'Messages', path: '/dashboard/messages' },
      { name: 'Buy Bids', path: '/dashboard/buy-bids' },
      { name: 'Help & Support', path: '/dashboard/help-support' },
    ],
  }

  const items = menuItems[role] || menuItems.homeowner

  return (
    <>
      {pathname !== '/dashboard' && pathname?.startsWith('/dashboard') && (
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back to the previous page"
          className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d4a843]/60 bg-[#1a2a3a] px-4 text-sm font-semibold text-[#f3d477] shadow-lg transition hover:bg-[#263b50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843] sm:right-6"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0 7-7m-7 7h18" />
          </svg>
          <span>Back</span>
        </button>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] z-50 rounded-lg bg-[#1a2a3a] p-2 text-white shadow-lg lg:hidden"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        aria-controls="hexbridge-sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
      </button>

      {isOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      <aside
        id="hexbridge-sidebar"
        aria-label="Main navigation"
        className={`fixed bottom-0 left-0 top-0 z-40 h-[100dvh] w-[min(18rem,85vw)] overflow-y-auto bg-[#1a2a3a] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
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
      </aside>
    </>
  )
}
