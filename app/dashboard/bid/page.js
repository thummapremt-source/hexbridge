'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'

// Load Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function PlaceBid() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')

  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState(null)
  const [bidAmount, setBidAmount] = useState('')
  const [timelineDays, setTimelineDays] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bidFee, setBidFee] = useState(0)

  useEffect(() => {
    if (!projectId) {
      router.push('/dashboard/browse')
      return
    }

    async function loadProject() {
      try {
        // Get project
        const { data, error } = await supabase
          .from('projects')
          .select('*, profiles!homeowner_id(full_name, phone)')
          .eq('id', projectId)
          .single()

        if (error) throw error
        setProject(data)

        // Get bid fee based on project type
        const { data: settings } = await supabase
          .from('admin_settings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (settings) {
          const feeMap = {
            'single_room': settings.single_room_fee || 150,
            '1bhk': settings.fee_1bhk || 250,
            '2bhk': settings.fee_2bhk || 400,
            '3bhk': settings.fee_3bhk || 550,
            '4bhk': settings.fee_4bhk || 700,
            '5bhk_plus': settings.fee_5bhk_plus || 900
          }
          setBidFee(feeMap[data.project_type] || 250)
        }
      } catch (err) {
        console.error('Error:', err)
        alert('Project not found')
        router.push('/dashboard/browse')
      } finally {
        setLoading(false)
      }
    }
    loadProject()
  }, [projectId, router])

  const handlePayment = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please login first')
        router.push('/login')
        return
      }

      // Check if already bid
      const { data: existingBid } = await supabase
        .from('bids')
        .select('id')
        .eq('project_id', projectId)
        .eq('designer_id', user.id)
        .single()

      if (existingBid) {
        alert('You have already placed a bid on this project.')
        setSubmitting(false)
        return
      }

      // Load Razorpay
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        alert('Payment service is unavailable. Please try again.')
        setSubmitting(false)
        return
      }

      // Create Razorpay order
      const response = await fetch('/api/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: bidFee })
      })

      const { orderId, error } = await response.json()
      if (error) {
        alert('Failed to create payment: ' + error)
        setSubmitting(false)
        return
      }

      // Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: bidFee * 100,
        currency: 'INR',
        name: 'HexBridge',
        description: `Bid fee for ${project.title}`,
        order_id: orderId,
        handler: async function (response) {
          // Payment successful – save bid
          try {
            const { error: bidError } = await supabase
              .from('bids')
              .insert({
                project_id: projectId,
                designer_id: user.id,
                bid_amount: parseInt(bidAmount),
                timeline_days: parseInt(timelineDays),
                message: message,
                status: 'pending',
                razorpay_payment_id: response.razorpay_payment_id
              })

            if (bidError) throw bidError

            alert('✅ Payment successful! Your bid has been placed.')
            router.push('/dashboard/browse')
          } catch (err) {
            console.error('Error saving bid:', err)
            alert('Payment successful but failed to save bid. Please contact support.')
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#d4a843'
        }
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (err) {
      console.error('Error:', err)
      alert('Payment failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-[#1a2a3a] text-xl font-semibold">Loading project...</div>
    </div>
  }

  if (!project) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-red-500 text-xl">Project not found</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-2xl font-bold text-[#1a2a3a]">📋 Place a Bid</h1>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h2 className="font-bold">{project.title}</h2>
            <p className="text-gray-600 text-sm">{project.description}</p>
            <div className="mt-2 text-sm text-gray-500">
              <p><span className="font-semibold">Type:</span> {project.project_type.replace('_', ' ').toUpperCase()}</p>
              <p><span className="font-semibold">Location:</span> {project.location}</p>
              <p><span className="font-semibold">Posted by:</span> {project.profiles?.full_name}</p>
              <p className="text-[#d4a843] font-bold">Bid Fee: ₹{bidFee}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Your Bid Amount (₹) *</label>
              <input 
                type="number" 
                value={bidAmount} 
                onChange={(e) => setBidAmount(e.target.value)}
                className="w-full p-3 border rounded-lg" 
                placeholder="e.g., 50000"
                required 
                min="1"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Timeline (Days) *</label>
              <input 
                type="number" 
                value={timelineDays} 
                onChange={(e) => setTimelineDays(e.target.value)}
                className="w-full p-3 border rounded-lg" 
                placeholder="e.g., 30"
                required 
                min="1"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Message to Homeowner</label>
              <textarea 
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
                rows="3"
                className="w-full p-3 border rounded-lg" 
                placeholder="Why should they choose you? Share your experience..."
              />
            </div>

            <div className="bg-[#fef9e7] p-4 rounded-lg border border-[#d4a843]">
              <p className="text-sm text-gray-700">
                💰 <span className="font-bold">Bid Fee: ₹{bidFee}</span> will be charged to place this bid.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-[#d4a843] text-white py-3 rounded-lg font-bold hover:bg-[#c49a3a] transition disabled:opacity-50"
            >
              {submitting ? 'Processing...' : `💰 Pay ₹${bidFee} & Submit Bid`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}