'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AdminPanel() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [settings, setSettings] = useState({
    single_room_fee: 150,
    fee_1bhk: 250,
    fee_2bhk: 400,
    fee_3bhk: 550,
    fee_4bhk: 700,
    fee_5bhk_plus: 900
  })

  useEffect(() => {
    async function loadAdmin() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'admin') {
          setIsAdmin(false)
          setLoading(false)
          return
        }
        setIsAdmin(true)

        // Load existing settings
        const { data: settingsData } = await supabase
          .from('admin_settings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (settingsData) {
          setSettings({
            single_room_fee: settingsData.single_room_fee || 150,
            fee_1bhk: settingsData.fee_1bhk || 250,
            fee_2bhk: settingsData.fee_2bhk || 400,
            fee_3bhk: settingsData.fee_3bhk || 550,
            fee_4bhk: settingsData.fee_4bhk || 700,
            fee_5bhk_plus: settingsData.fee_5bhk_plus || 900
          })
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    loadAdmin()
  }, [router])

  const handleChange = (e) => {
    const { name, value } = e.target
    setSettings(prev => ({ ...prev, [name]: parseInt(value) || 0 }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .limit(1)
        .single()

      let result
      if (existing) {
        // Update existing
        result = await supabase
          .from('admin_settings')
          .update({
            single_room_fee: settings.single_room_fee,
            fee_1bhk: settings.fee_1bhk,
            fee_2bhk: settings.fee_2bhk,
            fee_3bhk: settings.fee_3bhk,
            fee_4bhk: settings.fee_4bhk,
            fee_5bhk_plus: settings.fee_5bhk_plus,
            updated_at: new Date()
          })
          .eq('id', existing.id)
      } else {
        // Insert new
        result = await supabase
          .from('admin_settings')
          .insert({
            single_room_fee: settings.single_room_fee,
            fee_1bhk: settings.fee_1bhk,
            fee_2bhk: settings.fee_2bhk,
            fee_3bhk: settings.fee_3bhk,
            fee_4bhk: settings.fee_4bhk,
            fee_5bhk_plus: settings.fee_5bhk_plus
          })
      }

      if (result.error) throw result.error

      alert('✅ Bid fees updated successfully!')
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to update fees: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-[#1a2a3a] text-xl font-semibold">Loading...</div>
    </div>
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-lg">
          <h2 className="text-2xl font-bold text-red-500">⚠️ Access Denied</h2>
          <p className="text-gray-600 mt-2">You need admin privileges to access this page.</p>
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
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-[#1a2a3a] mb-2">⚙️ Admin Panel</h1>
          <p className="text-gray-600 mb-6">Set bid fees for different project types.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Single Room Fee (₹)</label>
              <input
                type="number"
                name="single_room_fee"
                value={settings.single_room_fee}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">1 BHK Fee (₹)</label>
              <input
                type="number"
                name="fee_1bhk"
                value={settings.fee_1bhk}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">2 BHK Fee (₹)</label>
              <input
                type="number"
                name="fee_2bhk"
                value={settings.fee_2bhk}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">3 BHK Fee (₹)</label>
              <input
                type="number"
                name="fee_3bhk"
                value={settings.fee_3bhk}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">4 BHK Fee (₹)</label>
              <input
                type="number"
                name="fee_4bhk"
                value={settings.fee_4bhk}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">5 BHK+ Fee (₹)</label>
              <input
                type="number"
                name="fee_5bhk_plus"
                value={settings.fee_5bhk_plus}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                min="0"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#d4a843] text-white py-3 rounded-lg font-bold hover:bg-[#c49a3a] transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : '💾 Save Fees'}
            </button>
          </form>

          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 text-[#1a2a3a] hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}