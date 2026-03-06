import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { User, CreditCard, Shield, LogOut, Check, Loader2 } from 'lucide-react'
import { FadeIn } from '../../components/Animations'

export default function Settings() {
  const { user, profile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400',
    trial: 'bg-amber-500/10 text-amber-400',
    past_due: 'bg-red-500/10 text-red-400',
    cancelled: 'bg-white/5 text-gray-500',
    inactive: 'bg-white/5 text-gray-500',
  }

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-8 space-y-6">
      <FadeIn>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </FadeIn>

      {/* Profile */}
      <FadeIn delay={0.1}>
        <div className="glass-card rounded-xl p-6">
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
        <div className="glass-card rounded-xl p-6">
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
                  <a
                    href="https://synapse.lemonsqueezy.com/checkout/buy/your-product-id"
                    className="btn-primary w-full text-center block text-sm py-2.5"
                  >
                    Subscribe &mdash; $5/month
                  </a>
                  <p className="text-[11px] text-gray-600 text-center">
                    Egypt? <a href="#" className="text-synapse-400 hover:text-synapse-300 transition-colors">Pay with Paymob (250 EGP)</a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Setup */}
      <FadeIn delay={0.3}>
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield size={17} className="text-synapse-400" />
            <h2 className="font-semibold text-sm">Setup Instructions</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">Install the Synapse agent on any machine:</p>
          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dot bg-red-500/80" />
              <div className="terminal-dot bg-yellow-500/80" />
              <div className="terminal-dot bg-green-500/80" />
            </div>
            <div className="terminal-body space-y-1">
              <p><span className="text-emerald-400">$</span> <span className="text-gray-400">pip install synapse-agent</span></p>
              <p><span className="text-emerald-400">$</span> <span className="text-gray-400">synapse login</span></p>
              <p><span className="text-emerald-400">$</span> <span className="text-gray-400">synapse start</span></p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">The agent auto-detects your installed AI CLI tools.</p>
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
    </div>
  )
}
