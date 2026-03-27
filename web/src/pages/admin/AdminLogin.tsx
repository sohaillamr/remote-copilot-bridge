import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Zap, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import GridBackground from '../../components/GridBackground'
import { FadeIn } from '../../components/Animations'

export default function AdminLogin() {
  const { user, signInWithEmail, isLoading: loading, isAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [otpMode, setOtpMode] = useState(false)

  if (user && isAdmin) return <Navigate to="/admin" />
  if (user && !isAdmin) return <Navigate to="/app" />

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      if (otpMode) {
        // Just using email OTP for admin login as well, or magic link
        await signInWithEmail(email)
        setOtpSent(true)
      } else {
        await signInWithEmail(email)
        setOtpSent(true)
        setOtpMode(true)
      }
    } catch (error: any) {
      if (error?.message) {
        setErrorMsg(error.message)
      } else {
        setErrorMsg('Failed to sign in. Check your credentials.')
      }
    } finally {
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
              <Zap className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Admin Portal</h1>
            <p className="text-gray-400">Secure access for Synapse administrators.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {errorMsg}
            </div>
          )}

          {otpSent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="text-emerald-400" size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2">Check your email</h2>
              <p className="text-gray-400 mb-6">We sent a secure sign-in link to <span className="text-white font-medium">{email}</span></p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Admin Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm"
                    placeholder="admin@synapse.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting || loading ? <Loader2 className="animate-spin" size={20} /> : 'Request Access'}
              </button>
            </form>
          )}
        </div>
      </FadeIn>
    </div>
  )
}