import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { supabase, Agent } from '../../lib/supabase'
import { MessageSquare, Wifi, WifiOff, Terminal, Clock, ArrowRight, Zap } from 'lucide-react'
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/Animations'

export default function Dashboard() {
  const { profile } = useAuth()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAgents()
  }, [])

  async function loadAgents() {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .order('last_seen_at', { ascending: false })
    setAgents(data || [])
    setLoading(false)
  }

  const isOnline = (agent: Agent) => {
    if (!agent.last_seen_at) return false
    const diff = Date.now() - new Date(agent.last_seen_at).getTime()
    return diff < 60_000
  }

  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86_400_000))
    : 0

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-6xl">
      <FadeIn>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}.</p>
        </div>
      </FadeIn>

      {/* Trial banner */}
      {profile?.subscription_status === 'trial' && (
        <FadeIn delay={0.1}>
          <div className="glass-card rounded-xl p-3 sm:p-4 border-amber-500/10">
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

      {/* Quick actions */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {[
          { to: '/app/chat', icon: MessageSquare, label: 'New Chat', desc: 'Start a prompt session', color: 'synapse' },
          { to: '/app/files', icon: Terminal, label: 'File Browser', desc: 'Browse remote files', color: 'blue' },
          { to: '/app/settings', icon: Clock, label: 'Settings', desc: 'Manage account', color: 'purple' },
        ].map(({ to, icon: Icon, label, desc, color }) => (
          <StaggerItem key={to}>
            <Link to={to}>
              <motion.div
                whileHover={{ y: -2, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="glass-card rounded-xl p-3 sm:p-4 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 sm:p-2.5 rounded-xl bg-${color}-600/10`}>
                    <Icon className={`text-${color}-400`} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-gray-600">{desc}</p>
                  </div>
                  <ArrowRight className="text-gray-700 group-hover:text-gray-400 transition-colors shrink-0" size={16} />
                </div>
              </motion.div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Agent List */}
      <FadeIn delay={0.3}>
        <div>
          <h2 className="text-base font-semibold mb-4 text-gray-300">Your Agents</h2>
          {loading ? (
            <div className="glass-card rounded-xl text-center py-10 text-gray-600 text-sm">Loading agents...</div>
          ) : agents.length === 0 ? (
            <div className="glass-card rounded-xl text-center py-10 sm:py-12">
              <Terminal className="text-gray-700 mx-auto mb-4" size={28} />
              <p className="text-gray-400 text-sm mb-4">No agents connected yet</p>
              <div className="terminal max-w-xs mx-auto shadow-glow">
                <div className="terminal-header">
                  <div className="terminal-dot bg-red-500/80" />
                  <div className="terminal-dot bg-yellow-500/80" />
                  <div className="terminal-dot bg-green-500/80" />
                </div>
                <div className="terminal-body text-left space-y-1 text-xs sm:text-sm">
                  <p><span className="text-emerald-400">$</span> <span className="text-gray-400">pip install synapse-agent</span></p>
                  <p><span className="text-emerald-400">$</span> <span className="text-gray-400">synapse login</span></p>
                  <p><span className="text-emerald-400">$</span> <span className="text-gray-400">synapse start</span></p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-xl p-3 sm:p-4"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    {isOnline(agent) ? (
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
                          isOnline(agent) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-600'
                        }`}>
                          {isOnline(agent) ? 'Online' : 'Offline'}
                        </span>
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
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  )
}
