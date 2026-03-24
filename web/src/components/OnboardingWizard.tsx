import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, ChevronRight, X, Terminal, Smartphone, Copy, Check, ExternalLink, Zap } from 'lucide-react'
import { useRelay } from '../contexts/AgentRelayContext'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'

function generatePairCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  let code = ''
  for (let i = 0; i < 12; i++) code += chars[bytes[i] % chars.length]
  return code
}

export default function OnboardingWizard() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1)
  const { agentReachable } = useRelay()
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  
  // Mobile pair states
  const [pairToken, setPairToken] = useState<string | null>(null)
  const [pairUrl, setPairUrl] = useState<string>('')

  useEffect(() => {
    if (!user) return
    const key = `synapse_onboarding_${user.id}`
    const completed = localStorage.getItem(key)
    if (completed !== 'true') {
      setIsOpen(true)
      localStorage.setItem(key, 'true')
    }
  }, [user])

  // Auto advance to step 4 if agent connects while on step 3
  useEffect(() => {
    if (step === 3 && agentReachable) {
      setTimeout(() => setStep(4), 1500)
    }
  }, [step, agentReachable])

  // Generate pair token when reaching step 4
  useEffect(() => {
    if (step === 4 && !pairToken && user) {
      const createToken = async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const session = sessionData?.session
          if (!session) return

          const code = generatePairCode()
          const { error } = await supabase.from('device_tokens').insert({
            user_id: user.id,
            token: code,
            access_token: session.access_token,
            refresh_token: session.refresh_token || '',
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
          })
          if (!error) {
            setPairToken(code)
            setPairUrl(`${window.location.origin}/pair?token=${code}`)
          }
        } catch (e) {
          console.error('Failed to generate device token:', e)
        }
      }
      createToken()
    }
  }, [step, pairToken, user])

  const dismiss = () => {
    if (user) {
      localStorage.setItem(`synapse_onboarding_${user.id}`, 'true')
    }
    setIsOpen(false)
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg glass-card rounded-2xl overflow-hidden shadow-2xl border border-synapse-500/20 relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06] bg-[#0c0c0f]/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-synapse-500/20 flex items-center justify-center">
              <Zap className="text-synapse-400" size={16} />
            </div>
            <div>
              <h2 className="font-semibold text-white tracking-tight">Welcome to Synapse</h2>
              <p className="text-xs text-gray-400">Let's get your agent connected</p>
            </div>
          </div>
          <button onClick={dismiss} className="p-2 rounded-lg hover:bg-white/[0.06] text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            
            {/* STEP 1 */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 text-synapse-400 mb-2">
                  <Terminal size={20} />
                  <h3 className="font-semibold text-lg text-white">1. Install the CLI</h3>
                </div>
                <p className="text-sm text-gray-400">Open your computer's terminal and install the Synapse Agent via pip.</p>
                <div className="bg-[#09090b] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between group">
                  <code className="text-sm font-mono text-emerald-400">$ <span className="text-gray-300">pip install synapse-agent</span></code>
                  <button 
                    onClick={() => copyToClipboard('pip install synapse-agent', 1)}
                    className="p-1.5 rounded-md hover:bg-white/[0.08] text-gray-500 transition-colors"
                  >
                    {copiedIndex === 1 ? <Check size={14} className="text-emerald-400"/> : <Copy size={14} />}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 text-synapse-400 mb-2">
                  <Terminal size={20} />
                  <h3 className="font-semibold text-lg text-white">2. Authenticate</h3>
                </div>
                <p className="text-sm text-gray-400">Run the login command in your terminal. This will open a browser to link your account.</p>
                <div className="bg-[#09090b] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between group">
                  <code className="text-sm font-mono text-emerald-400">$ <span className="text-gray-300">synapse login</span></code>
                  <button 
                    onClick={() => copyToClipboard('synapse login', 2)}
                    className="p-1.5 rounded-md hover:bg-white/[0.08] text-gray-500 transition-colors"
                  >
                    {copiedIndex === 2 ? <Check size={14} className="text-emerald-400"/> : <Copy size={14} />}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 text-synapse-400 mb-2">
                  <Terminal size={20} />
                  <h3 className="font-semibold text-lg text-white">3. Start the Agent</h3>
                </div>
                <p className="text-sm text-gray-400">Run the start command. We are listening for your connection right now...</p>
                <div className="bg-[#09090b] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between group mb-6">
                  <code className="text-sm font-mono text-emerald-400">$ <span className="text-gray-300">synapse start</span></code>
                  <button 
                    onClick={() => copyToClipboard('synapse start', 3)}
                    className="p-1.5 rounded-md hover:bg-white/[0.08] text-gray-500 transition-colors"
                  >
                    {copiedIndex === 3 ? <Check size={14} className="text-emerald-400"/> : <Copy size={14} />}
                  </button>
                </div>
                
                {agentReachable ? (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                    <CheckCircle size={18} />
                    <span className="font-medium text-sm">Agent Connected Successfully!</span>
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-center gap-3 text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
                    <span className="text-sm font-medium">Waiting for connection...</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-emerald-400" size={32} />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-semibold text-lg text-white">You're all set!</h3>
                  <p className="text-sm text-gray-400">Your desktop agent is running perfectly.</p>
                </div>

                <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl flex flex-col items-center text-center gap-3">
                  <h4 className="text-sm font-medium flex items-center gap-2"><Smartphone size={16} className="text-synapse-400"/> Connect Mobile App</h4>
                  <p className="text-xs text-gray-500 px-4">Scan this QR code with your phone's camera to instantly log in and access your desktop agent on the go.</p>
                  
                  {pairUrl ? (
                    <div className="bg-white p-3 rounded-xl inline-block mt-2">
                       <QRCodeCanvas value={pairUrl} size={130} />
                    </div>
                  ) : (
                    <div className="w-[130px] h-[130px] bg-white/[0.05] rounded-xl flex items-center justify-center animate-pulse mt-2">
                      <Zap className="text-gray-500" />
                    </div>
                  )}

                  {pairToken && (
                    <p className="text-[10px] text-gray-600 mt-2 font-mono tracking-widest">
                       CODE: {pairToken.slice(0, 4)}-{pairToken.slice(4, 8)}-{pairToken.slice(8, 12)}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer / Controls */}
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className={`w-2 h-2 rounded-full transition-colors ${step === idx ? 'bg-synapse-400' : step > idx ? 'bg-emerald-400' : 'bg-gray-700'}`} />
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            {step < 4 ? (
              <>
                <button onClick={dismiss} className="text-xs text-gray-500 hover:text-white px-2">Skip</button>
                <button 
                  onClick={() => setStep(s => s + 1)}
                  className="btn-primary text-sm px-4 py-2 flex items-center gap-1"
                >
                  Next <ChevronRight size={16} />
                </button>
              </>
            ) : (
              <button 
                onClick={dismiss}
                className="btn-primary text-sm px-6 py-2 flex items-center gap-2"
              >
                Go to Dashboard <ExternalLink size={14} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
