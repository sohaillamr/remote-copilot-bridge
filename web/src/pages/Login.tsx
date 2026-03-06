import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Mail, ArrowLeft, Github, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import GridBackground from '../components/GridBackground'
import { FadeIn } from '../components/Animations'

export default function LoginPage() {
  const { user, signInWithGithub, signInWithGoogle, signInWithEmail, isLoading: loading } = useAuth()
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/app" replace />

  const handleOAuth = async (provider: 'github' | 'google') => {
    setBusy(true)
    setError('')
    try {
      if (provider === 'github') await signInWithGithub(); else await signInWithGoogle()
    } catch (e: any) {
      setError(e.message || 'OAuth failed')
      setBusy(false)
    }
  }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-synapse-400" size={32} />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <GridBackground />

      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-synapse-600/[0.06] rounded-full blur-[100px] pointer-events-none" />

      {/* Back link */}
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

      <FadeIn delay={0.15} className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="relative">
            <Zap className="text-synapse-400" size={24} />
            <div className="absolute inset-0 bg-synapse-500/30 blur-lg rounded-full" />
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
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-synapse-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          <div className="relative glass-card rounded-2xl p-8">
            {otpSent ? (
              <div className="text-center space-y-4">
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
                  <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
                  <p className="text-sm text-gray-500">Sign in to access your AI tools remotely</p>
                </div>

                {/* OAuth buttons */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => handleOAuth('github')}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-3 btn-secondary py-3 text-sm"
                  >
                    <Github size={18} />
                    Continue with GitHub
                  </button>
                  <button
                    onClick={() => handleOAuth('google')}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-3 btn-secondary py-3 text-sm"
                  >
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>

                {/* Divider */}
                <div className="relative flex items-center my-6">
                  <div className="flex-grow border-t border-white/5" />
                  <span className="px-3 text-xs text-gray-600 uppercase tracking-wider">or</span>
                  <div className="flex-grow border-t border-white/5" />
                </div>

                {/* Magic link form */}
                <form onSubmit={handleOtp} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input w-full"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy || !email}
                    className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
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
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-sm mt-4 text-center"
                  >
                    {error}
                  </motion.p>
                )}
              </>
            )}
          </div>
        </motion.div>

        <p className="text-center text-xs text-gray-600 mt-6">
          By signing in you agree to our Terms of Service
        </p>
      </FadeIn>
    </div>
  )
}

