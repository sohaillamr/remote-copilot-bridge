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
        // Don't auto-redirect. Users in ephemeral scanners might lose their login.
        // Let them tap the button manually or copy the link to Safari.
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

  {/* Safari Warning */}
  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-left">
    <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2 mb-1">
      ?? Essential: Keep your login
    </h3>
    <p className="text-[13px] text-amber-200/80 mb-3 leading-relaxed">
      Scanning a QR code often opens a temporary viewer. To stay permanently logged in, you must continue in Safari.
    </p>
    <p className="text-[13px] text-amber-200/80 mb-3 leading-relaxed">
      Tap the ?? <strong>compass icon</strong> (bottom right) to open Safari, or copy the link below:
    </p>
    <div className="flex gap-2">
      <button
        onClick={() => handleCopy(pairUrl)}
        className="flex-1 bg-black/20 hover:bg-black/40 text-amber-400 border border-amber-500/20 rounded-lg py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy Link'}
      </button>
      <a
        href={pairUrl.replace('https://', 'x-safari-https://').replace('http://', 'x-safari-http://')}
        className="flex-1 bg-amber-500 hover:bg-amber-400 text-black rounded-lg py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2"
      >
        <ExternalLink size={14} />
        Force Safari
      </a>
    </div>
  </div>

  <div className="mt-6 pt-4 border-t border-white/[0.06]">
    <p className="text-xs text-gray-500 mb-3">If you are already in Safari or Chrome:</p>
    <button
      onClick={() => navigate('/app')}
      className="btn-primary w-full text-sm px-6 py-3 flex justify-center items-center gap-2"
    >
      Go to Command Center <ExternalLink size={14} />
    </button>
  </div>
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