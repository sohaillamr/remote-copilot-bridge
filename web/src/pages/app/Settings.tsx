import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { User, CreditCard, Terminal, LogOut, Check, Loader2, Copy, X, QrCode, GraduationCap, Smartphone } from 'lucide-react'
import { FadeIn } from '../../components/Animations'

export default function Settings() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentPlan, setPaymentPlan] = useState<'usd' | 'egp'>('usd')
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState('')
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [eduEmail, setEduEmail] = useState('')
  const [eduSaving, setEduSaving] = useState(false)
  const [eduError, setEduError] = useState('')

  const isStudent = profile?.plan_tier === 'student'
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const pairUrl = qrToken ? `${window.location.origin}/pair?token=${qrToken}` : ''

  async function generateQrToken() {
    if (!user) return
    setQrLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session
      if (!session) throw new Error('No active session')

      const token = crypto.randomUUID()
      const { error } = await supabase.from('device_tokens').insert({
        user_id: user.id,
        token,
        access_token: session.access_token,
        refresh_token: session.refresh_token || '',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      if (error) throw error
      setQrToken(token)
    } catch (err: any) {
      console.error('QR token error:', err)
      setQrError(
        err.message?.includes('device_tokens')
          ? 'Run the SQL migration (002_features.sql) in Supabase first.'
          : (err.message || 'Failed to generate QR code')
      )
    } finally {
      setQrLoading(false)
    }
  }

  function isEduEmailAddr(email: string): boolean {
    const lower = email.toLowerCase().trim()
    return lower.endsWith('.edu') ||
           /\.edu\.[a-z]{2,}$/.test(lower) ||
           /\.ac\.[a-z]{2,}$/.test(lower)
  }

  async function verifyStudentEmail() {
    if (!user || !eduEmail.trim()) return
    if (!isEduEmailAddr(eduEmail)) {
      setEduError('Please enter a valid academic email (.edu, .ac.uk, etc.)')
      return
    }
    setEduSaving(true)
    setEduError('')
    try {
      await supabase.from('profiles').update({
        edu_email: eduEmail.trim().toLowerCase(),
        edu_verified_at: new Date().toISOString(),
        plan_tier: 'student',
      }).eq('id', user.id)
      setShowStudentModal(false)
      setEduEmail('')
      // Refresh profile instead of full page reload
      if (user) refreshProfile(user.id)
    } catch (err: any) {
      setEduError(err.message || 'Failed to verify')
    } finally {
      setEduSaving(false)
    }
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400',
    trial: 'bg-amber-500/10 text-amber-400',
    past_due: 'bg-red-500/10 text-red-400',
    cancelled: 'bg-white/5 text-gray-500',
    inactive: 'bg-white/5 text-gray-500',
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      <FadeIn>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </FadeIn>

      {/* Profile */}
      <FadeIn delay={0.1}>
        <div className="glass-card rounded-xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <User size={17} className="text-synapse-400" />
            <h2 className="font-semibold text-sm">Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-600 block mb-1.5">Email</label>
              <input type="text" className="input w-full" value={user?.email || ''} disabled />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1.5">Display Name</label>
              <input
                type="text"
                className="input w-full"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : saved ? <Check size={14} /> : null}
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
            </motion.button>
          </div>
        </div>
      </FadeIn>

      {/* Subscription */}
      <FadeIn delay={0.2}>
        <div className="glass-card rounded-xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard size={17} className="text-synapse-400" />
            <h2 className="font-semibold text-sm">Subscription</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Status</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                statusColors[profile?.subscription_status || 'inactive']
              }`}>
                {profile?.subscription_status || 'inactive'}
              </span>
            </div>
            {profile?.subscription_status === 'trial' && profile.trial_ends_at && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm">Trial Ends</span>
                <span className="text-sm font-mono text-gray-400">{new Date(profile.trial_ends_at).toLocaleDateString()}</span>
              </div>
            )}
            {profile?.subscription_provider && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm">Provider</span>
                <span className="text-sm capitalize text-gray-400">{profile.subscription_provider}</span>
              </div>
            )}
            <div className="pt-4 border-t border-white/[0.06] space-y-2">
              {isStudent && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs mb-2 px-1">
                  <GraduationCap size={12} />
                  <span>Student discount active</span>
                </div>
              )}
              {profile?.subscription_status === 'active' ? (
                <a
                  href="https://app.lemonsqueezy.com/my-orders"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary w-full text-center block text-sm py-2.5"
                >
                  Manage Subscription
                </a>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setPaymentPlan('usd')
                      setShowPaymentModal(true)
                    }}
                    className="btn-primary w-full text-center block text-sm py-2.5"
                  >
                    Subscribe &mdash; {isStudent ? '$4' : '$5'}/month
                  </button>
                  <button
                    onClick={() => {
                      setPaymentPlan('egp')
                      setShowPaymentModal(true)
                    }}
                    className="w-full text-center text-[11px] text-gray-600 hover:text-synapse-400 transition-colors py-1"
                  >
                    Egypt? Pay with Paymob ({isStudent ? '200' : '250'} EGP)
                  </button>
                  {!isStudent && (
                    <button
                      onClick={() => setShowStudentModal(true)}
                      className="w-full text-center text-[11px] text-gray-600 hover:text-synapse-400 transition-colors py-1 flex items-center justify-center gap-1"
                    >
                      <GraduationCap size={11} />
                      Student? Get it for $4/month
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Login on Another Device */}
      <FadeIn delay={0.25}>
        <div className="glass-card rounded-xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone size={17} className="text-synapse-400" />
            <h2 className="font-semibold text-sm">Login on Another Device</h2>
          </div>
          <p className="text-sm text-gray-400 mb-5">
            Scan a QR code from your phone or tablet to log in instantly — no email needed.
          </p>
          {isLocalhost && (
            <p className="text-xs text-amber-400/80 mb-3">
              ⚠ QR login works best in production. Localhost URLs won't be reachable from other devices.
            </p>
          )}
          {qrToken ? (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-3 rounded-xl">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pairUrl)}`}
                  alt="QR Code"
                  width={180}
                  height={180}
                  className="rounded"
                />
              </div>
              <p className="text-xs text-gray-500 text-center max-w-[250px]">
                Scan with your camera app. Expires in 5 minutes, one-time use.
              </p>
              <button
                onClick={() => setQrToken(null)}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { setQrError(''); generateQrToken() }}
                disabled={qrLoading}
                className="btn-secondary w-full text-center text-sm py-2.5 flex items-center justify-center gap-2"
            >
              {qrLoading ? <Loader2 className="animate-spin" size={14} /> : <QrCode size={14} />}
              Generate QR Code
            </motion.button>
            {qrError && (
              <p className="text-xs text-red-400 text-center">{qrError}</p>
            )}
            </div>
          )}
        </div>
      </FadeIn>

      {/* Connect Agent */}
      <FadeIn delay={0.3}>
        <div className="glass-card rounded-xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <Terminal size={17} className="text-synapse-400" />
            <h2 className="font-semibold text-sm">Connect Your Machine</h2>
          </div>
          <p className="text-sm text-gray-400 mb-5">
            Install the agent on any computer, then log in with your email.
            That's it \u2014 no tokens or keys needed.
          </p>

          {/* Step 1 */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-synapse-500/20 text-synapse-400 text-xs flex items-center justify-center font-bold">1</span>
                <span className="text-sm font-medium">Install the agent</span>
              </div>
              <div className="terminal">
                <div className="terminal-header">
                  <div className="terminal-dot bg-red-500/80" />
                  <div className="terminal-dot bg-yellow-500/80" />
                  <div className="terminal-dot bg-green-500/80" />
                  <button
                    onClick={() => handleCopy('pip install synapse-agent')}
                    className="ml-auto text-gray-500 hover:text-gray-300 transition-colors p-1"
                    title="Copy"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="terminal-body">
                  <p><span className="text-emerald-400">$</span> <span className="text-gray-400">pip install synapse-agent</span></p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-synapse-500/20 text-synapse-400 text-xs flex items-center justify-center font-bold">2</span>
                <span className="text-sm font-medium">Log in with your email</span>
              </div>
              <div className="terminal">
                <div className="terminal-body space-y-1">
                  <p><span className="text-emerald-400">$</span> <span className="text-gray-400">synapse login</span></p>
                  <p className="text-gray-600">  Email: <span className="text-amber-400/70">{user?.email || 'you@example.com'}</span></p>
                  <p className="text-gray-600">  <span className="text-emerald-400/70">\u2709 Magic link sent! Check your inbox.</span></p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-synapse-500/20 text-synapse-400 text-xs flex items-center justify-center font-bold">3</span>
                <span className="text-sm font-medium">Start the agent</span>
              </div>
              <div className="terminal">
                <div className="terminal-body space-y-1">
                  <p><span className="text-emerald-400">$</span> <span className="text-gray-400">synapse start</span></p>
                  <p className="text-gray-600">  <span className="text-cyan-400/70">\u26a1 Synapse Agent connected</span></p>
                  <p className="text-gray-600">  <span className="text-gray-500">Detected: copilot, claude, gemini</span></p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-600 mt-4">The agent auto-detects AI CLI tools on your machine (Copilot, Claude, Gemini, Codex, Aider).</p>
        </div>
      </FadeIn>

      {/* Sign out */}
      <FadeIn delay={0.4}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={signOut}
          className="btn-secondary w-full flex items-center justify-center gap-2 text-red-400/70 hover:text-red-400 py-2.5"
        >
          <LogOut size={15} />
          Sign Out
        </motion.button>
      </FadeIn>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="glass-card rounded-2xl p-6 sm:p-8 max-w-sm w-full relative border border-white/[0.08]">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-synapse-500/10 flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="text-synapse-400" size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {paymentPlan === 'usd'
                      ? `Subscribe — ${isStudent ? '$4' : '$5'}/mo`
                      : `Subscribe — ${isStudent ? '200' : '250'} EGP/mo`}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Unlimited prompts, all AI tools, priority support
                    {isStudent && ' • Student discount applied'}
                  </p>
                </div>
                <div className="space-y-3 mb-6 text-sm text-gray-400">
                  {['Unlimited AI prompts', 'All CLI tools (Copilot, Claude, Gemini…)', 'Model selection', 'File browser & shell access', 'Priority support'].map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <a
                  href={
                    isStudent
                      ? (paymentPlan === 'usd'
                          ? 'https://accept.paymob.com/synapse-student-usd'
                          : 'https://accept.paymob.com/synapse-student-egp')
                      : (paymentPlan === 'usd'
                          ? 'https://accept.paymob.com/synapse-usd'
                          : 'https://accept.paymob.com/synapse-egp')
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full text-center block text-sm py-3 font-medium"
                >
                  Continue to Payment
                </a>
                <p className="text-[10px] text-gray-700 text-center mt-3">
                  Secure payment via Paymob. Cancel anytime.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Student Verification Modal */}
      <AnimatePresence>
        {showStudentModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStudentModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="glass-card rounded-2xl p-6 sm:p-8 max-w-sm w-full relative border border-white/[0.08]">
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-synapse-500/10 flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="text-synapse-400" size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Student Discount</h3>
                  <p className="text-xs text-gray-500">Verify your academic email to get Synapse for $4/month</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1.5">Academic Email</label>
                    <input
                      type="email"
                      value={eduEmail}
                      onChange={e => setEduEmail(e.target.value)}
                      placeholder="you@university.edu"
                      className="input w-full"
                    />
                    <p className="text-[10px] text-gray-600 mt-1">Accepted: .edu, .ac.uk, .edu.au, and other academic domains</p>
                  </div>
                  {eduError && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-400"
                    >
                      {eduError}
                    </motion.p>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={verifyStudentEmail}
                    disabled={eduSaving || !eduEmail.trim()}
                    className="btn-primary w-full text-sm py-2.5 flex items-center justify-center gap-2"
                  >
                    {eduSaving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                    Verify & Apply Discount
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
