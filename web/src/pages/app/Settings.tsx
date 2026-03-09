import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { User, CreditCard, Terminal, LogOut, Check, Loader2, Copy, X } from 'lucide-react'
import { FadeIn } from '../../components/Animations'

export default function Settings() {
  const { user, profile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentPlan, setPaymentPlan] = useState<'usd' | 'egp'>('usd')

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
                    Subscribe &mdash; $5/month
                  </button>
                  <button
                    onClick={() => {
                      setPaymentPlan('egp')
                      setShowPaymentModal(true)
                    }}
                    className="w-full text-center text-[11px] text-gray-600 hover:text-synapse-400 transition-colors py-1"
                  >
                    Egypt? Pay with Paymob (250 EGP)
                  </button>
                </div>
              )}
            </div>
          </div>
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
                    {paymentPlan === 'usd' ? 'Subscribe — $5/mo' : 'Subscribe — 250 EGP/mo'}
                  </h3>
                  <p className="text-xs text-gray-500">Unlimited prompts, all AI tools, priority support</p>
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
                  href={paymentPlan === 'usd'
                    ? 'https://accept.paymob.com/synapse-usd'
                    : 'https://accept.paymob.com/synapse-egp'}
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
    </div>
  )
}
