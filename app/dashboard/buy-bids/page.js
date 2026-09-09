'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'

const defaultPackages = [
  { name: 'Starter', bids: 1, price: 250, savings: 0 },
  { name: 'Silver', bids: 3, price: 675, savings: 75 },
  { name: 'Gold', bids: 5, price: 1000, savings: 250 },
  { name: 'Platinum', bids: 10, price: 1800, savings: 700 },
]

const loadRazorpayScript = () => new Promise((resolve) => {
  if (window.Razorpay) {
    resolve(true)
    return
  }

  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  script.onload = () => resolve(true)
  script.onerror = () => resolve(false)
  document.body.appendChild(script)
})

export default function BuyBidsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [designer, setDesigner] = useState(false)
  const [bidCredits, setBidCredits] = useState(0)
  const [buying, setBuying] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [creditsReady, setCreditsReady] = useState(true)
  const [packages, setPackages] = useState(defaultPackages)

  useEffect(() => {
    async function loadProfile() {
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

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError
        if (profile?.role !== 'designer') {
          setDesigner(false)
          return
        }

        setDesigner(true)

        const { data: pricing } = await supabase
          .from('admin_settings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (pricing) {
          setPackages([
            { name: 'Starter', bids: 1, price: pricing.starter_package_price ?? 250 },
            { name: 'Silver', bids: 3, price: pricing.silver_package_price ?? 675 },
            { name: 'Gold', bids: 5, price: pricing.gold_package_price ?? 1000 },
            { name: 'Platinum', bids: 10, price: pricing.platinum_package_price ?? 1800 },
          ])
        }

        const { data: creditsProfile, error: creditsError } = await supabase
          .from('profiles')
          .select('bid_credits')
          .eq('id', user.id)
          .single()

        if (creditsError) {
          if (creditsError.code === '42703') {
            setCreditsReady(false)
            setError('Bid credits are not set up yet. Run supabase/profiles.sql in your Supabase SQL Editor, then refresh this page.')
            return
          }
          throw creditsError
        }

        setBidCredits(creditsProfile?.bid_credits || 0)
      } catch (loadError) {
        console.error('Unable to load designer profile:', loadError)
        setError('Unable to load your bid credits. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const addCredits = async (packageDetails) => {
    const { data: updatedCredits, error: creditError } = await supabase.rpc('add_bid_credits', {
      credits_to_add: packageDetails.bids,
    })

    if (creditError) throw creditError
    setBidCredits(updatedCredits)
    setMessage(`${packageDetails.name} package purchased. ${packageDetails.bids} bid${packageDetails.bids === 1 ? '' : 's'} added.`)
    setBuying(null)
  }

  const handlePurchase = async (packageDetails) => {
    setBuying(packageDetails.name)
    setMessage('')
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) throw new Error('Payment service is unavailable. Please try again.')

      const orderResponse = await fetch('/api/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: packageDetails.price }),
      })
      const order = await orderResponse.json()
      if (order.error) throw new Error(order.error)

      if (order.mock) {
        await addCredits(packageDetails)
        return
      }

      if (!window.Razorpay || !order.orderId) {
        throw new Error('Payment order could not be started.')
      }

      const razorpay = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: packageDetails.price * 100,
        currency: 'INR',
        name: 'HexBridge',
        description: `${packageDetails.name} bid package`,
        order_id: order.orderId,
        handler: async () => {
          try {
            await addCredits(packageDetails)
          } catch (creditError) {
            console.error('Unable to add purchased bid credits:', creditError)
            setError('Payment succeeded, but credits could not be added. Please contact support.')
            setBuying(null)
          }
        },
        prefill: { email: user.email },
        theme: { color: '#d4a843' },
      })

      razorpay.open()
    } catch (purchaseError) {
      console.error('Bid package purchase failed:', purchaseError)
      setError(purchaseError?.message || 'Purchase failed. Please try again.')
      setBuying(null)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-[#1a2a3a] text-xl font-semibold">Loading...</p></div>
  }

  if (!designer) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-lg">
          <h1 className="text-2xl font-bold text-[#1a2a3a]">Designer access only</h1>
          <p className="mt-2 text-gray-600">Bid packages are available for designer accounts.</p>
          <button onClick={() => router.push('/dashboard')} className="mt-5 rounded-lg bg-[#d4a843] px-6 py-3 font-bold text-white hover:bg-[#c49a3a]">Go to Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="mx-auto max-w-6xl flex-1 p-6 ml-64">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-[#d4a843] font-semibold">HexBridge</p>
            <h1 className="mt-2 text-3xl font-bold text-[#1a2a3a]">Buy Bid Packages</h1>
            <p className="mt-2 text-gray-600">Choose a package and use your credits to bid on more projects.</p>
          </div>
          <div className="rounded-xl bg-[#1a2a3a] px-5 py-3 text-white shadow-lg">
            <p className="text-xs uppercase tracking-wider text-gray-300">Available bids</p>
            <p className="mt-1 text-2xl font-bold text-[#d4a843]">{bidCredits}</p>
          </div>
        </div>

        {message && <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((packageDetails) => {
            const perBid = packageDetails.price / packageDetails.bids
            const standardPrice = packageDetails.bids * 250
            const savings = Math.max(0, standardPrice - packageDetails.price)
            return (
              <article key={packageDetails.name} className="flex flex-col rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200">
                <h2 className="text-xl font-bold text-[#1a2a3a]">{packageDetails.name}</h2>
                <p className="mt-4 text-4xl font-bold text-[#d4a843]">₹{packageDetails.price}</p>
                <p className="mt-2 font-semibold text-[#1a2a3a]">{packageDetails.bids} bid{packageDetails.bids === 1 ? '' : 's'}</p>
                <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
                  <p>₹{perBid.toFixed(2)} per bid</p>
                  <p className="font-semibold text-green-700">{savings ? `Save ₹${savings}` : 'No savings'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePurchase(packageDetails)}
                  disabled={buying !== null || !creditsReady}
                  className="mt-6 w-full rounded-xl bg-[#d4a843] px-4 py-3 font-bold text-white transition hover:bg-[#c49a3a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {buying === packageDetails.name ? 'Processing...' : 'Buy Now'}
                </button>
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}
