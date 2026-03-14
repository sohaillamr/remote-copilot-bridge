import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Loader2, CheckCircle, XCircle, ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { saveDeviceRefreshToken } from '../lib/persistentStorage'
import GridBackground from '../components/GridBackground'

export default function PairPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [pairToken, setPairToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const pairUrl = pairToken ? `${window.location.origin}/pair?token=${pairToken}` : ''
  const displayCode = pairToken
    ? `${pairToken.slice(0, 4)}-${pairToken.slice(4, 8)}-${pairToken.slice(8, 12)}`
    : ''

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setErrorMsg('No pairing token provided.')
      return
    }
    setPairToken(token)
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
          // refreshSession failed - the original tokens still work for now,
          // just save what we have. Auto-refresh will try again later.
          console.warn('Post-pair refresh failed:', refreshErr.message)
          await saveDeviceRefreshToken(data.refresh_token)
        } else if (refreshed?.session?.refresh_token) {
          // Save the device's own independent refresh token - this survives
          // even if localStorage/IDB is evicted and the main session is lost.
          await saveDeviceRefreshToken(refreshed.session.refresh_token)

          // Update device_tokens row with the fresh tokens so the NEXT claim
          // (e.g. from regular Safari after the QR scanner's isolated browser)
          // gets valid tokens instead of the already-rotated originals.
          try {
            await supabase.from('device_tokens').update({
              access_token: refreshed.session.access_token,
              refresh_token: refreshed.session.refresh_token,
            }).eq('token', token)
          } catch { /* non-critical - next claim will just need re-generation */ }
        }

        setStatus('success')
        // Don't auto-redirect immediately - show the pairing code & instructions
        // so user can re-pair in regular Safari if this is an isolated browser.
        setTimeout(() => navigate('/app'), 8000)
      } else {
        setStatus('error')
        setErrorMsg('Invalid token response.')
      }
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err.message || 'Failed to pair device.')
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

              {/* Show pairing code for re-use in regular Safari */}
              {pairToken && (
                <div className="mt-4 space-y-3">
                  <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-2">
                      If this opened in the wrong browser, open Safari and go to:
                    </p>
                    <p className="text-xs text-synapse-400 font-medium break-all mb-3">
                      {window.location.origin}/login
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      Then tap <span className="text-gray-300">"Have a pairing code?"</span> and enter:
                    </p>
                    <div
                      className="bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 cursor-pointer hover:bg-white/[0.06] transition-colors"
                      onClick={() => handleCopy(pairToken)}
                    >
                      <span className="text-xl font-mono font-bold tracking-[0.3em] text-synapse-400">
                        {displayCode}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-2">
                      {copied ? '✓ Copied!' : 'Tap code to copy'}
                    </p>
                  </div>

                  {/* Copy URL button */}
                  <button
                    onClick={() => handleCopy(pairUrl)}
                    className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors py-2"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    Copy pair link
                  </button>
                </div>
              )}

              <button
                onClick={() => navigate('/app')}
                className="btn-primary text-sm px-6 py-2.5 mt-2 inline-flex items-center gap-2"
              >
                <ExternalLink size={14} />
                Go to Dashboard
              </button>
              <p className="text-xs text-gray-600">Auto-redirecting in a few seconds…</p>
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