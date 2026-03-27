import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { useRelay } from '../../contexts/AgentRelayContext'
import { supabase, type Agent } from '../../lib/supabase'
import {
  MessageSquare, Wifi, WifiOff, Terminal, Clock, ArrowRight,
  Zap, Check, Activity, Keyboard, BarChart3, Sparkles,
} from 'lucide-react'
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/Animations'
import OnboardingWizard from '../../components/OnboardingWizard'

function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    let start = 0
    const step = Math.ceil(value / (duration / 16))
    const id = setInterval(() => {
      start = Math.min(start + step, value)
      setDisplay(start)
      if (start >= value) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [value, duration])
  return <>{display}</>
}

export default function Dashboard() {
  const { profile, user } = useAuth()
  const { selectedAgent, selectAgent, detectedTools, agentReachable } = useRelay()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ conversations: 0, promptsToday: 0, totalPrompts: 0 })

  useEffect(() => { loadAgents(); loadStats() }, [])

  async function loadAgents() {
    if (!user) return
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', user.id)
      .order('last_seen_at', { ascending: false })
    setAgents(data || [])
    setLoading(false)
  }

  async function loadStats() {
    if (!user) return
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const [convRes, todayRes, totalRes] = await Promise.all([
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('prompt_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', todayStart.toISOString()),
      supabase.from('prompt_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    setStats({
      conversations: convRes.count ?? 0,
      promptsToday: todayRes.count ?? 0,
      totalPrompts: totalRes.count ?? 0,
    })
  }

  const isOnline = (agent: Agent) => {
    if (!agent.last_seen_at) return false
    return Date.now() - new Date(agent.last_seen_at).getTime() < 60_000
  }

  const onlineCount = useMemo(() => agents.filter(isOnline).length, [agents])

  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86_400_000))
    : 0

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-6xl">
      <OnboardingWizard />
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Command Center</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {greeting}{profile?.display_name ? `, ${profile.display_name}` : ''}.
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            agentReachable
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-white/[0.04] text-gray-500 border border-white/[0.06]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${agentReachable ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
            {agentReachable ? 'Agent Connected' : 'No Agent'}
          </div>
        </div>
      </FadeIn>

      {profile?.subscription_status === 'trial' && (
        <FadeIn delay={0.1}>
          <div className="glass-card rounded-xl p-3 sm:p-4 border-amber-500/10 bg-gradient-to-r from-amber-500/[0.04] to-transparent">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Zap className="text-amber-400" size={16} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-amber-300 text-sm">Free Trial</p>
                  <p className="text-xs text-gray-500">{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining</p>
                </div>
              </div>
              <Link to="/app/settings" className="btn-primary text-xs px-3 sm:px-4 py-2 shrink-0">Upgrade</Link>
            </div>
          </div>
        </FadeIn>
      )}

      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Conversations', value: stats.conversations, icon: MessageSquare, color: 'text-synapse-400', bg: 'bg-synapse-600/10' },
          { label: 'Prompts Today', value: stats.promptsToday, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-600/10' },
          { label: 'Total Prompts', value: stats.totalPrompts, icon: BarChart3, color: 'text-emerald-400', bg: 'bg-emerald-600/10' },
          { label: 'Agents Online', value: onlineCount, icon: Wifi, color: 'text-amber-400', bg: 'bg-amber-600/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <StaggerItem key={label}>
            <div className="glass-card rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${bg}`}>
                  <Icon className={color} size={14} />
                </div>
                <span className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{label}</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold tabular-nums">
                <AnimatedNumber value={value} />
              </p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <FadeIn delay={0.15}>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
      </FadeIn>
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {[
            { to: '/app/chat', icon: MessageSquare, label: 'Start a Prompt', desc: 'Jump into a new session', iconBg: 'bg-synapse-600/10', iconColor: 'text-synapse-400', shortcut: 'Ctrl+2' },
            { to: '/app/files', icon: Terminal, label: 'Browse Machine Files', desc: 'Explore and run code', iconBg: 'bg-blue-600/10', iconColor: 'text-blue-400', shortcut: 'Ctrl+3' },
            { to: '/app/settings', icon: Clock, label: 'Configure Setup', desc: 'Permissions and account', iconBg: 'bg-purple-600/10', iconColor: 'text-purple-400', shortcut: 'Ctrl+4' },
        ].map(({ to, icon: Icon, label, desc, iconBg, iconColor, shortcut }) => (
          <StaggerItem key={to}>
            <Link to={to}>
              <motion.div
                whileHover={{ y: -2, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="glass-card rounded-xl p-3 sm:p-4 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 sm:p-2.5 rounded-xl ${iconBg}`}>
                    <Icon className={iconColor} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-gray-600">{desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-flex text-[10px] text-gray-600 bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5 font-mono">
                      {shortcut}
                    </span>
                    <ArrowRight className="text-gray-700 group-hover:text-gray-400 transition-colors" size={16} />
                  </div>
                </div>
              </motion.div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {agentReachable && detectedTools.length > 0 && (
        <FadeIn delay={0.2}>
          <div className="glass-card rounded-xl p-4 sm:p-5 border-emerald-500/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative">
                <Sparkles className="text-emerald-400" size={16} />
                <div className="absolute inset-0 bg-emerald-400/20 blur-md rounded-full" />
              </div>
              <span className="text-sm font-medium text-emerald-300">Detected Tools</span>
              <span className="text-[10px] text-gray-600 ml-auto font-mono">{detectedTools.length} tools</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {detectedTools.map(t => (
                <span key={t.name} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] text-gray-400 border border-white/[0.06] font-mono">
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      <FadeIn delay={0.3}>
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Your Agents</h2>
          {loading ? (
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                {[1, 2].map(i => (
                  <div key={i} className="glass-card p-4 sm:p-5 rounded-xl border border-white/[0.04]">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 w-24 bg-white/[0.04] rounded animate-pulse" />
                          <div className="h-3 w-16 bg-white/[0.04] rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="w-16 h-6 rounded-full bg-white/[0.04] animate-pulse" />
                    </div>
                    <div className="pt-3 flex gap-2">
                      <div className="w-full h-8 rounded bg-white/[0.04] animate-pulse" />
                      <div className="w-full h-8 rounded bg-white/[0.04] animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
          ) : agents.length === 0 ? (
            <div className="glass-card rounded-xl text-center py-10 sm:py-12">
              <Terminal className="text-gray-700 mx-auto mb-4" size={28} />
              <p className="text-gray-400 text-sm font-medium mb-1">Your workspace is waiting. Let's wake up your first agent.</p>
              <p className="text-gray-600 text-xs mb-5">Follow these 3 commands to get up and running instantly</p>
              <div className="terminal max-w-xs mx-auto shadow-glow">
                <div className="terminal-header">
                  <div className="terminal-dot bg-red-500/80" />
                  <div className="terminal-dot bg-yellow-500/80" />
                  <div className="terminal-dot bg-green-500/80" />
                </div>
                <div className="terminal-body text-left space-y-1 text-xs sm:text-sm">
                  <p className="text-gray-500 mb-2 border-b border-white/5 pb-2 text-xs"># Requires Python 3.10+</p>
                  <p><span className="text-emerald-400">$</span> <span className="text-gray-400">pip install synapse-bridge</span></p>
                  <p><span className="text-emerald-400">$</span> <span className="text-gray-400">synapse login</span></p>
                  <p><span className="text-emerald-400">$</span> <span className="text-gray-400">synapse start</span></p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map((agent, i) => {
                const online = isOnline(agent)
                const isSelected = selectedAgent?.id === agent.id
                return (
                  <motion.button
                    key={agent.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => selectAgent(isSelected ? null : agent)}
                    className={`w-full glass-card rounded-xl p-3 sm:p-4 text-left transition-all ${
                      isSelected
                        ? 'ring-1 ring-synapse-500/30 border-synapse-500/20'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      {online ? (
                        <div className="relative mt-1 sm:mt-0 shrink-0">
                          <Wifi className="text-emerald-400" size={18} />
                          <div className="absolute inset-0 bg-emerald-400/20 blur-md rounded-full" />
                        </div>
                      ) : (
                        <WifiOff className="text-gray-700 mt-1 sm:mt-0 shrink-0" size={18} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm flex flex-wrap items-center gap-2">
                          <span className="truncate">{agent.hostname || 'Unknown Machine'}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-600'
                          }`}>
                            {online ? 'Online' : 'Offline'}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-synapse-500/15 text-synapse-400 flex items-center gap-1">
                              <Check size={9} /> Selected
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600 truncate mt-0.5">
                          Tools: {agent.tools?.join(', ') || 'none'}
                          {agent.work_dir && ` \u00B7 ${agent.work_dir}`}
                        </p>
                        {agent.last_seen_at && (
                          <p className="text-[10px] text-gray-700 font-mono mt-1 sm:hidden">
                            {new Date(agent.last_seen_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {agent.last_seen_at && (
                        <p className="text-[10px] text-gray-700 font-mono whitespace-nowrap hidden sm:block shrink-0">
                          {new Date(agent.last_seen_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.4}>
        <div className="glass-card rounded-xl p-3 sm:p-4 flex items-center gap-3">
          <Keyboard className="text-gray-600 shrink-0" size={16} />
          <p className="text-xs text-gray-600">
            <span className="text-gray-500 font-medium">Shortcuts: </span>
            <kbd className="font-mono bg-white/[0.04] px-1.5 py-0.5 rounded text-gray-500 text-[10px]">Ctrl+K</kbd>{' '}focus chat
            <span className="mx-1.5 text-gray-700">&middot;</span>
            <kbd className="font-mono bg-white/[0.04] px-1.5 py-0.5 rounded text-gray-500 text-[10px]">Ctrl+1-4</kbd>{' '}navigate
          </p>
        </div>
      </FadeIn>
    </div>
  )
}
