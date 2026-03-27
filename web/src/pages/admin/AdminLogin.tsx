import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Zap, Loader2, ShieldCheck, LogOut, Lock } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import GridBackground from '../../components/GridBackground'
import { FadeIn } from '../../components/Animations'

export default function AdminLogin() {
  const { user, signOut, isLoading: loading, isAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (loading) return null
  if (user && isAdmin) return <Navigate to="/admin" />

  // If a standard user visits the admin login URL
  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-4 relative">
        <GridBackground />
        <FadeIn className="w-full max-w-md relative z-10" y={20}>
          <div className="glass-card p-8 rounded-3xl text-center relative overflow-hidden">
             <div className="mx-auto mb-4 text-red-500/80 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] flex justify-center"><ShieldCheck size={48} /></div>
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              You are currently logged in as <span className="text-white font-medium">{user.email}</span>, which lacks administrator privileges.
            </p>
            <button 
              onClick={() => signOut()}
              className="px-6 py-3 w-full rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all flex items-center justify-center gap-2 mx-auto font-medium"
            >
              <LogOut size={18} /> Sign out & Swap Accounts
            </button>
          </div>
        </FadeIn>
      </div>
    )
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
    } catch (error: any) {
      setErrorMsg(error?.message || 'Invalid admin credentials.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-4 relative">
      <GridBackground />

      <FadeIn className="w-full max-w-md relative z-10" y={20}>
        <div className="glass-card p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <ShieldCheck size={100} />
          </div>

          <div className="text-center mb-8 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
              <Zap className="text-white fill-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Admin Portal</h1>
            <p className="text-gray-400">Secure access for administrators.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Admin Email</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm"
                  placeholder="admin@synapse.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Passphrase</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting || loading ? <Loader2 className="animate-spin" size={20} /> : 'Authenticate'}
            </button>
          </form>
        </div>
      </FadeIn>
    </div>
  )
}
