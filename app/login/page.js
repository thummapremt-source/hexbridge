'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'   // ✅ TWO levels up – CORRECT
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('homeowner')
  const [isLogin, setIsLogin] = useState(true)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    let result

    if (isLogin) {
      result = await supabase.auth.signInWithPassword({ email, password })
    } else {
      result = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { full_name: fullName, role: role } }
      })
      if (result.data.user) {
        await supabase.from('profiles').insert([
          { id: result.data.user.id, full_name: fullName, role: role, phone: phone }
        ])
      }
    }

    if (result.error) {
      alert(result.error.message)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2a3a] to-[#2a3a4a] p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-[#d4a843]">HexBridge</h1>
          <p className="text-gray-600 text-sm">Bridge. Build. Bid.</p>
        </div>
        <h2 className="text-xl font-semibold text-center text-gray-700 mb-4">
          {isLogin ? 'Welcome Back' : 'Create Your Account'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <input 
                type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a843] outline-none" required 
              />
              <input 
                type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a843] outline-none" required 
              />
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a843] outline-none">
                <option value="homeowner">🏠 Homeowner (Post Projects)</option>
                <option value="designer">🛠️ Designer/Contractor (Bid on Projects)</option>
              </select>
            </>
          )}

          <input 
            type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a843] outline-none" required 
          />
          <input 
            type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a843] outline-none" required 
          />

          <button type="submit" className="w-full bg-[#d4a843] text-white py-3 rounded-lg font-bold hover:bg-[#c49a3a] transition duration-200 shadow-lg">
            {isLogin ? 'Sign In' : 'Sign Up for Free'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-600">
          {isLogin ? "New to HexBridge? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-[#1a2a3a] font-semibold hover:underline">
            {isLogin ? 'Create Account' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  )
}