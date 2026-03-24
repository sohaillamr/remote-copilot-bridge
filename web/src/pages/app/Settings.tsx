import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import TeamSettings from './TeamSettings'
import { supabase } from '../../lib/supabase'
import { User, Users, CreditCard, Terminal, LogOut, Check, Loader2, Copy, X, QrCode, GraduationCap, Smartphone, Download, Trash2, ShieldAlert } from 'lucide-react'
import { FadeIn } from '../../components/Animations'

/** Generate a 12-char alphanumeric pairing code (no ambiguous chars). */
function generatePairCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  let code = ''
  for (let i = 0; i < 12; i++) code += chars[bytes[i] % chars.length]
  return code
}

export default function Settings() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  // Plan & Payment state
  // Plan & Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'team'>('pro')
  const [seatCount, setSeatCount] = useState<number>(1)
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'team'>('pro')
  const [seatCount, setSeatCount] = useState<number>(1)
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState('')
              const [exporting, setExporting] = useState(false)


  // Pricing Calculation
  const getPricePerSeat = (seats: number) => {
    if (seats >= 10) return 8;
    if (seats >= 5) return 10;
    return 12; // Base price dropped from 24 to 12
  }
  
  const totalPrice = selectedPlan === 'pro' ? 12 : getPricePerSeat(seatCount) * seatCount;


  // Pricing Calculation
  const getPricePerSeat = (seats: number) => {
    if (seats >= 10) return 8;
    if (seats >= 5) return 10;
    return 12; // Base price dropped from 24 to 12
  }
  
  const totalPrice = selectedPlan === 'pro' ? 12 : getPricePerSeat(seatCount) * seatCount;

  // Instapay state
  const [instapayReceipt, setInstapayReceipt] = useState<File | null>(null)
  const [instapayAmount, setInstapayAmount] = useState('')
  const [instapayUploading, setInstapayUploading] = useState(false)
  const [instapaySuccess, setInstapaySuccess] = useState(false)
  const [instapayError, setInstapayError] = useState('')

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const pairUrl = qrToken ? `${window.location.origin}/pair?token=${qrToken}` : ''
  // Format code for display: XXXX-XXXX-XXXX
  const displayCode = qrToken
    ? `${qrToken.slice(0, 4)}-${qrToken.slice(4, 8)}-${qrToken.slice(8, 12)}`
    : ''

  async function generateQrToken() {
    if (!user) return
    setQrLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session
      if (!session) throw new Error('No active session')

      const token = generatePairCode()
      const { error } = await supabase.from('device_tokens').insert({
        user_id: user.id,
        token,
        access_token: session.access_token,
        refresh_token: session.refresh_token || '',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      })
      if (error) throw error
      setQrToken(token)
    } catch (err: any) {
      console.error('QR token error:', err)
      setQrError(
        err.message?.includes('device_tokens')
          ? 'Run the SQL migration (002_features.sql) in Supabase first.'
          : (err.message || 'Failed to generate pairing code')
      )
    } finally {
      setQrLoading(false)
    }
  }

  

  async function exportMyData() {
    if (!user) return
    setExporting(true)
    try {
      const [profileRes, convsRes, msgsRes, promptsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('conversations').select('*').eq('user_id', user.id),
        supabase.from('messages').select('*, conversations!inner(user_id)').eq('conversations.user_id', user.id),
        supabase.from('prompt_logs').select('*').eq('user_id', user.id),
      ])
      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        conversations: convsRes.data || [],
        messages: msgsRes.data || [],
        prompt_logs: promptsRes.data || [],
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `synapse-data-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  async function deleteMyAccount() {
    if (!user) return
    const confirmed = confirm(
      'Are you sure you want to delete your account? This action is irreversible.\n\n' +
      'All your conversations, prompts, and data will be permanently deleted.'
    )
    if (!confirmed) return
    const doubleConfirm = confirm('This is your final confirmation. Delete everything?')
    if (!doubleConfirm) return
    try {
      // Delete user data (cascading deletes handle related records)
      await supabase.from('conversations').delete().eq('user_id', user.id)
      await supabase.from('prompt_logs').delete().eq('user_id', user.id)
      await supabase.from('agents').delete().eq('user_id', user.id)
      await supabase.from('profiles').delete().eq('id', user.id)
      await signOut()
    } catch (err) {
      console.error('Account deletion failed:', err)
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

  async function handleInstapaySubmit() {
    if (!user || !instapayReceipt || !instapayAmount) return
    setInstapayUploading(true)
    setInstapayError('')
    try {
      const fileExt = instapayReceipt.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, instapayReceipt)
        
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName)

      const { error: dbError } = await supabase.from('manual_payments').insert({
        user_id: user.id,
        amount: parseFloat(instapayAmount),
        currency: 'USD',
        plan: selectedPlan,
        seats: selectedPlan === 'team' ? seatCount : 1,
        screenshot_url: urlData.publicUrl
      })

      if (dbError) throw dbError

      setInstapaySuccess(true)
      setTimeout(() => {
        setShowPaymentModal(false)
        setInstapaySuccess(false)
        setInstapayReceipt(null)
        setInstapayAmount('')
      }, 3000)

    } catch (err: any) {
      setInstapayError(err.message || 'Upload failed')
    } finally {
      setInstapayUploading(false)
    }
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
        {/* Team Settings (If Team Plan) */}
        {profile?.plan_tier === "team" && (
          <TeamSettings />
        )}


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
            {profile?.subscription_status === 'active' && profile.subscription_ends_at && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Subscribed On</span>
                  <span className="text-sm font-mono text-gray-400">
                    {new Date(new Date(profile.subscription_ends_at).getTime() - 30*24*60*60*1000).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Valid Until</span>
                  <span className="text-sm font-mono text-gray-400">{new Date(profile.subscription_ends_at).toLocaleDateString()}</span>
                </div>
              </>
            )}
            {profile?.subscription_provider && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm">Provider</span>
                <span className="text-sm capitalize text-gray-400">{profile.subscription_provider}</span>
              </div>
            )}
            <div className="pt-4 border-t border-white/[0.06] space-y-2">
              
              {profile?.subscription_status === 'active' ? (
                <div className="space-y-3 pt-2">
                  <button disabled className="btn-secondary w-full text-center block text-sm py-2.5 opacity-50 cursor-not-allowed">
                    {profile?.plan_tier === 'team' ? 'Team Subscription Active' : 'Pro Subscription Active'}
                  </button>
                  {profile?.plan_tier !== 'team' && (
                    <button
                      onClick={() => { setSelectedPlan('team'); setShowPaymentModal(true) }}
                      className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
                    >
                      <CreditCard size={14} /> Upgrade to Team (Beta)
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => { setSelectedPlan('pro'); setShowPaymentModal(true) }}
                    className="btn-secondary w-full py-2.5 text-sm flex items-center justify-center gap-2"
                  >
                    <User size={14} /> Upgrade to Pro
                  </button>
                  <button
                    onClick={() => { setSelectedPlan('team'); setShowPaymentModal(true) }}
                    className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
                  >
                    <CreditCard size={14} /> Upgrade to Team (Beta)
                  </button>
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
            Scan the QR code or type the pairing code on your other device to log in instantly.
          </p>
          {isLocalhost && (
            <p className="text-xs text-amber-400/80 mb-3">
              ⚠️ QR login works best in production. Localhost URLs won't be reachable from other devices.
            </p>
          )}
          {qrToken ? (
            <div className="flex flex-col items-center gap-4">
              {/* QR code */}
              <div className="bg-white p-3 rounded-xl">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pairUrl)}&color=7c3aed&bgcolor=ffffff`}
                  alt="QR Code for pairing — scan with your other device camera"
                  width={180}
                  height={180}
                  className="rounded"
                  loading="eager"
                />
              </div>

              {/* Pairing code — big and prominent */}
              <div className="w-full max-w-[280px]">
                <p className="text-xs text-gray-500 text-center mb-2">Or enter this code on your device's login page:</p>
                <div
                  className="bg-white/[0.04] border border-white/10 rounded-xl px-6 py-4 text-center cursor-pointer hover:bg-white/[0.06] transition-colors"
                  onClick={() => handleCopy(qrToken)}
                  title="Click to copy"
                >
                  <span className="text-2xl font-mono font-bold tracking-[0.3em] text-synapse-400">
                    {displayCode}
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 text-center mt-2">
                  {copied ? '✓ Copied!' : 'Tap code to copy • Valid for 24 hours'}
                </p>
              </div>

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
                Generate Pairing Code
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
            That's it — no tokens or keys needed.
          </p>
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
                  <button onClick={() => handleCopy('pip install synapse-agent')} className="ml-auto text-gray-500 hover:text-gray-300 transition-colors p-1" title="Copy">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="terminal-body">
                  <p><span className="text-emerald-400">$</span> <span className="text-gray-400">pip install synapse-agent</span></p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-synapse-500/20 text-synapse-400 text-xs flex items-center justify-center font-bold">2</span>
                <span className="text-sm font-medium">Log in with your email</span>
              </div>
              <div className="terminal">
                <div className="terminal-body space-y-1">
                  <p><span className="text-emerald-400">$</span> <span className="text-gray-400">synapse login</span></p>
                  <p className="text-gray-600">  Email: <span className="text-amber-400/70">{user?.email || 'you@example.com'}</span></p>
                  <p className="text-gray-600">  <span className="text-emerald-400/70">✉ Magic link sent! Check your inbox.</span></p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-synapse-500/20 text-synapse-400 text-xs flex items-center justify-center font-bold">3</span>
                <span className="text-sm font-medium">Start the agent</span>
              </div>
              <div className="terminal">
                <div className="terminal-body space-y-1">
                  <p><span className="text-emerald-400">$</span> <span className="text-gray-400">synapse start</span></p>
                  <p className="text-gray-600">  <span className="text-cyan-400/70">⚡ Synapse Agent connected</span></p>
                  <p className="text-gray-600">  <span className="text-gray-500">Detected: copilot, claude, gemini</span></p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-4">The agent auto-detects AI CLI tools on your machine (Copilot, Claude, Gemini, Codex, Aider).</p>
        </div>
      </FadeIn>

      {/* Team Management */}
      {profile?.plan_tier === 'team' && (
        <FadeIn delay={0.32}>
          <div className="glass-card rounded-xl p-5 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-synapse-400" />
                <h2 className="font-semibold text-sm">Team Management</h2>
              </div>
              <span className="text-xs bg-synapse-500/10 text-synapse-400 px-2.5 py-1 rounded-full border border-synapse-500/20">
                Team Tier
              </span>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                You are on the Team (Beta) tier. You can now invite members up to your licensed seat limit.
              </p>
              
              <div className="p-4 bg-white/[0.03] border border-white/[0.05] rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white mb-1">Invite Members</h4>
                  <p className="text-xs text-gray-500">Generate a magic join link for your developers.</p>
                </div>
                <button 
                  onClick={() => alert('Invites will be fully enabled soon! For now, ask your team to sign up and contact support with their emails to sync the roster.')}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Generate Link
                </button>
              </div>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Team Management */}
      {profile?.plan_tier === 'team' && (
        <FadeIn delay={0.32}>
          <div className="glass-card rounded-xl p-5 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-synapse-400" />
                <h2 className="font-semibold text-sm">Team Management</h2>
              </div>
              <span className="text-xs bg-synapse-500/10 text-synapse-400 px-2.5 py-1 rounded-full border border-synapse-500/20">
                Team Tier
              </span>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                You are on the Team (Beta) tier. You can now invite members up to your licensed seat limit.
              </p>
              
              <div className="p-4 bg-white/[0.03] border border-white/[0.05] rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white mb-1">Invite Members</h4>
                  <p className="text-xs text-gray-500">Generate a magic join link for your developers.</p>
                </div>
                <button 
                  onClick={() => alert('Invites will be fully enabled soon! For now, ask your team to sign up and contact support with their emails to sync the roster.')}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Generate Link
                </button>
              </div>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Data & Privacy */}
      <FadeIn delay={0.35}>
        <div className="glass-card rounded-xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={17} className="text-synapse-400" />
            <h2 className="font-semibold text-sm">Data & Privacy</h2>
          </div>
          <p className="text-sm text-gray-400 mb-5">
            Export all your data or delete your account. See our{' '}
            <a href="/privacy" className="text-synapse-400 hover:underline">Privacy Policy</a> for details.
          </p>
          <div className="space-y-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={exportMyData}
              disabled={exporting}
              className="btn-secondary w-full text-center text-sm py-2.5 flex items-center justify-center gap-2"
            >
              {exporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
              {exporting ? 'Exporting...' : 'Export My Data'}
            </motion.button>
            <button
              onClick={deleteMyAccount}
              className="w-full text-center text-xs text-red-400/50 hover:text-red-400 transition-colors py-2"
            >
              <span className="flex items-center justify-center gap-1">
                <Trash2 size={11} />
                Delete my account and all data
              </span>
            </button>
          </div>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPaymentModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="glass-card rounded-2xl p-6 sm:p-8 max-w-sm w-full relative border border-white/[0.08] max-h-[90vh] overflow-y-auto">
                <button onClick={() => setShowPaymentModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
                
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-synapse-500/10 flex items-center justify-center mx-auto mb-4">
                    {selectedPlan === 'team' ? <CreditCard className="text-synapse-400" size={22} /> : <User className="text-synapse-400" size={22} />}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {selectedPlan === 'team' ? 'Synapse Team (Beta)' : 'Synapse Pro'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {selectedPlan === 'team' ? 'The ultimate context engine for your entire dev team.' : 'Unlimited prompts and comprehensive features for solo developers.'}
                  </p>
                </div>

                {selectedPlan === 'team' && (
                  <div className="mb-6 space-y-4">
                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.05]">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium">Number of Seats</span>
                        <span className="text-xs bg-synapse-500/20 text-synapse-400 px-2 py-1 rounded-full">
                          ${getPricePerSeat(seatCount)}/seat
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={seatCount}
                          onChange={(e) => setSeatCount(parseInt(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-synapse-500"
                        />
                        <input 
                          type="number" 
                          min="1" 
                          max="50" 
                          value={seatCount} 
                          onChange={(e) => setSeatCount(parseInt(e.target.value) || 1)}
                          className="input w-16 text-center text-sm py-1"
                        />
                      </div>
                      <div className="mt-3 flex justify-between text-xs text-gray-500">
                        <span>1-4: $12</span>
                        <span>5-9: $10</span>
                        <span>10+: $8</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-white mb-1">${totalPrice}<span className="text-sm font-normal text-gray-500">/mo</span></div>
                  <p className="text-[10px] text-gray-500">Please transfer equivalent in your local currency if applicable.</p>
                </div>

                <div className="space-y-4 mb-6 text-sm text-gray-400">
                  <div className="bg-synapse-500/10 p-4 rounded-xl border border-synapse-500/20 text-center">
                    <p className="text-xs text-gray-400 mb-2">Transfer via Instapay to:</p>
                    <p className="font-mono text-lg font-bold text-synapse-400 select-all">+201063022623</p>
                    <p className="text-xs text-gray-500 mt-1">Name: Sohail Amr Anwar Mohamed</p>
                  </div>

                  {instapaySuccess ? (
                    <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-xl text-center border border-emerald-500/20 text-xs">
                      Payment submitted! We will activate your {selectedPlan} subscription shortly.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Total Amount Transferred</label>
                        <input
                          type="text"
                          className="input w-full text-sm"
                          placeholder="e.g., $12 or 600 EGP"
                          value={instapayAmount}
                          onChange={(e) => setInstapayAmount(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Payment Screenshot</label>
                        <input
                          type="file"
                          accept="image/*"
                          className="input w-full text-xs"
                          onChange={(e) => setInstapayReceipt(e.target.files?.[0] || null)}
                        />
                      </div>
                      {instapayError && (
                        <p className="text-xs text-red-400">{instapayError}</p>
                      )}
                      <motion.button
                        onClick={handleInstapaySubmit}
                        disabled={!instapayAmount || !instapayReceipt || instapayUploading}
                        whileTap={{ scale: 0.98 }}
                        className="btn-primary w-full py-2.5 flex justify-center items-center gap-2 mt-4"
                      >
                        {instapayUploading ? <Loader2 size={16} className="animate-spin" /> : 'Submit Payment Info'}
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}