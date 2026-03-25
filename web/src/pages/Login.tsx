import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Mail, ArrowLeft, Loader2, Smartphone, ShieldCheck, Globe, Lock } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { saveDeviceRefreshToken } from '../lib/persistentStorage'
import GridBackground from '../components/GridBackground'
import { FadeIn } from '../components/Animations'

export default function LoginPage() {
  const { user, signInWithEmail, isLoading: loading, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showPairCode, setShowPairCode] = useState(false)
  const [pairCode, setPairCode] = useState('')
  const [pairingBusy, setPairingBusy] = useState(false)
  const [pairError, setPairError] = useState('')

  if (user && isAdmin) return <Navigate to="/admin" replace />
  if (user) return <Navigate to="/app" replace />

  

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setBusy(true)
    setError('')
    try {
      await signInWithEmail(email)
      setOtpSent(true)
    } catch (e: any) {
      setError(e.message || 'Failed to send magic link')
    } finally {
      setBusy(false)
    }
  }

  const handlePairCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = pairCode.replace(/[\s-]/g, '').toUpperCase()
    if (code.length !== 12) return
    setPairingBusy(true)
    setPairError('')
    try {
      const { data, error } = await supabase.rpc('claim_device_token', { p_token: code })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      if (!data?.access_token || !data?.refresh_token) throw new Error('Invalid token response')

      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })
      if (setErr) throw setErr

      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession()
      if (refreshErr) {
        await saveDeviceRefreshToken(data.refresh_token)
      } else if (refreshed?.session?.refresh_token) {
        await saveDeviceRefreshToken(refreshed.session.refresh_token)
      }

      try {
        const freshSession = refreshed?.session
        if (freshSession) {
          await supabase.from('device_tokens').update({
            access_token: freshSession.access_token,
            refresh_token: freshSession.refresh_token,
          }).eq('token', code)
        }
      } catch { /* non-critical */ }

      navigate('/app')
    } catch (err: any) {
      setPairError(err.message || 'Failed to pair')
    } finally {
      setPairingBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="animate-spin text-synapse-400" size={32} />
        <span className="sr-only">Loading authentication...</span>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4" role="main" aria-label="Sign in">
      <GridBackground />

      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-synapse-600/[0.06] rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />

      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute top-6 left-6 z-20"
      >
        <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-sm group" aria-label="Back to landing page">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back
        </Link>
      </motion.div>

      <FadeIn delay={0.15} className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="relative">
            <Zap className="text-synapse-400" size={24} aria-hidden="true" />
            <div className="absolute inset-0 bg-synapse-500/30 blur-lg rounded-full" aria-hidden="true" />
          </div>
          <span className="text-xl font-bold tracking-tight">Synapse</span>
        </div>

        {/* Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="relative group"
        >
          {/* Glow border */}
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-synapse-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden="true" />

          <div className="relative glass-card rounded-2xl p-8">
            {otpSent ? (
              <div className="text-center space-y-4" role="status" aria-live="polite">
                <div className="w-16 h-16 rounded-2xl bg-synapse-500/10 flex items-center justify-center mx-auto">
                  <Mail className="text-synapse-400" size={28} />
                </div>
                <h2 className="text-xl font-bold">Check your email</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  We sent a magic link to{' '}
                  <span className="text-white font-medium">{email}</span>.
                  <br />
                  Click it to sign in.
                </p>
                <button
                  onClick={() => { setOtpSent(false); setEmail('') }}
                  className="text-sm text-synapse-400 hover:text-synapse-300 transition-colors"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">Resume your session</h2>
                  <p className="text-sm text-gray-500">Reconnect to your AI agents and pick up where you left off</p>
                </div>

                

                {/* Magic link form */}
                <form onSubmit={handleOtp} className="space-y-4" aria-label="Sign in with email">
                  <div>
                    <label htmlFor="login-email" className="sr-only">Email address</label>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input w-full focus:ring-2 focus:ring-synapse-500/50 focus:border-synapse-500/30 transition-all"
                      required
                      autoComplete="email"
                      aria-describedby={error ? 'login-error' : undefined}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy || !email}
                    className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 focus:ring-2 focus:ring-synapse-500/50 focus:ring-offset-2 focus:ring-offset-[#09090b]"
                  >
                    {busy ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Mail size={16} />
                    )}
                    Send Magic Link
                  </button>
                </form>

                {error && (
                  <motion.p
                    id="login-error"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-sm mt-4 text-center"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Pairing Code section */}
                <div className="relative flex items-center my-6" role="separator">
                  <div className="flex-grow border-t border-white/5" />
                  <span className="px-3 text-xs text-gray-600 uppercase tracking-wider">or</span>
                  <div className="flex-grow border-t border-white/5" />
                </div>

                <button
                  type="button"
                  onClick={() => setShowPairCode(!showPairCode)}
                  className="w-full text-center text-sm text-gray-500 hover:text-synapse-400 transition-colors flex items-center justify-center gap-2"
                  aria-expanded={showPairCode}
                  aria-controls="pair-code-form"
                >
                  <Smartphone size={15} />
                  Instant Mobile Login
                </button>

                {showPairCode && (
                  <motion.form
                    id="pair-code-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    onSubmit={handlePairCode}
                    className="mt-4 space-y-3 overflow-hidden"
                    aria-label="Device pairing"
                  >
                    <p className="text-xs text-gray-500 text-center">
                      Scan the QR code or type the 12-digit PIN from your desktop to instantly sync your session
                    </p>
                    <label htmlFor="pair-code-input" className="sr-only">Pairing code</label>
                    <input
                      id="pair-code-input"
                      type="text"
                      value={pairCode}
                      onChange={(e) => setPairCode(e.target.value.toUpperCase())}
                      placeholder="ABCD-EFGH-IJKL"
                      maxLength={14}
                      className="input w-full text-center text-lg font-mono tracking-[0.2em] uppercase focus:ring-2 focus:ring-synapse-500/50 focus:border-synapse-500/30 transition-all"
                      autoComplete="off"
                      aria-describedby={pairError ? 'pair-error' : undefined}
                    />
                    <button
                      type="submit"
                      disabled={pairingBusy || pairCode.replace(/[\s-]/g, '').length !== 12}
                      className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
                    >
                      {pairingBusy ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Smartphone size={16} />
                      )}
                      Pair Device
                    </button>
                    {pairError && (
                      <motion.p
                        id="pair-error"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-xs text-center"
                        role="alert"
                      >
                        {pairError}
                      </motion.p>
                    )}
                  </motion.form>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-4 sm:gap-6 mt-6 mb-4"
        >
          {[
            { icon: Lock, text: 'TLS Encrypted' },
            { icon: ShieldCheck, text: 'Open Source Agent' },
            { icon: Globe, text: 'GDPR Compliant' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <Icon size={12} className="text-gray-600" />
              {text}
            </div>
          ))}
        </motion.div>

        <p className="text-center text-xs text-gray-600">
          By signing in you agree to our{' '}
          <Link to="/terms" className="text-synapse-400/70 hover:text-synapse-400 transition-colors">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-synapse-400/70 hover:text-synapse-400 transition-colors">Privacy Policy</Link>
        </p>
      </FadeIn>
    </div>
  )
}
