import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { saveDeviceRefreshToken } from '../lib/persistentStorage'
import GridBackground from '../components/GridBackground'

export default function PairPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setErrorMsg('No pairing token provided.')
      return
    }
    claimToken(token)
  }, [])

  async function claimToken(token: string) {
    try {
      const { data, error } = await supabase.rpc('claim_device_token', {
        p_token: token,
      })
      if (error) throw error

      if (data?.error) {
        setStatus('error')
        setErrorMsg(data.error)
        return
      }

      if (data?.access_token && data?.refresh_token) {
        // Establish the session from the shared desktop tokens
        const { error: setErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        })
        if (setErr) throw setErr

        // CRITICAL: Immediately refresh to get this device's OWN independent
        // tokens. The desktop's refresh_token will be rotated away when either
        // device refreshes, so the mobile needs its own copy.
        const { data: refreshed, error: refreshErr } =
          await supabase.auth.refreshSession()

        if (refreshErr) {
          // refreshSession failed — the original tokens still work for now,
          // just save what we have. Auto-refresh will try again later.
          console.warn('Post-pair refresh failed:', refreshErr.message)
          await saveDeviceRefreshToken(data.refresh_token)
        } else if (refreshed?.session?.refresh_token) {
          // Save the device's own independent refresh token — this survives
          // even if localStorage/IDB is evicted and the main session is lost.
          await saveDeviceRefreshToken(refreshed.session.refresh_token)
        }

        setStatus('success')
        setTimeout(() => navigate('/app'), 2000)
      } else {
        setStatus('error')
        setErrorMsg('Invalid token response.')
      }
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err.message || 'Failed to pair device.')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <GridBackground />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-synapse-600/[0.06] rounded-full blur-[100px] pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute top-6 left-6 z-20"
      >
        <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-sm group">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back
        </Link>
      </motion.div>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="relative">
            <Zap className="text-synapse-400" size={24} />
            <div className="absolute inset-0 bg-synapse-500/30 blur-lg rounded-full" />
          </div>
          <span className="text-xl font-bold tracking-tight">Synapse</span>
        </div>
        <div className="glass-card rounded-2xl p-8 text-center">
          {status === 'loading' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Loader2 className="animate-spin text-synapse-400 mx-auto" size={32} />
              <h2 className="text-lg font-bold">Pairing Device...</h2>
              <p className="text-sm text-gray-400">Verifying your login token.</p>
            </motion.div>
          )}
          {status === 'success' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="text-emerald-400" size={32} />
              </div>
              <h2 className="text-lg font-bold text-emerald-400">Paired Successfully!</h2>
              <p className="text-sm text-gray-400">Redirecting to your dashboard...</p>
            </motion.div>
          )}
          {status === 'error' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
                <XCircle className="text-red-400" size={32} />
              </div>
              <h2 className="text-lg font-bold text-red-400">Pairing Failed</h2>
              <p className="text-sm text-gray-400">{errorMsg}</p>
              <Link to="/login" className="inline-block text-sm text-synapse-400 hover:text-synapse-300 transition-colors mt-2">
                Go to Login →
              </Link>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}