import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRelay } from '../../contexts/AgentRelayContext'
import { FadeIn } from '../../components/Animations'
import { Users, UserPlus, Mail, Shield, Zap, X, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Team {
  id: string
  name: string
  seat_count: number
  subscription_status: string
  owner_id: string
}

interface TeamMember {
  user_id: string
  role: string
  // Virtual joined fields
  email?: string
}

interface TeamInvite {
  id: string
  email: string
  role: string
  token: string
}

interface AnalyticsData {
  total_prompts: number
  usage_by_member: {
    user_id: string
    email: string
    role: string
    prompt_count: number
  }[]
  usage_over_time: {
    date: string
    count: number
  }[]
}

export default function TeamDashboard() {
  const { user } = useAuth()
  const { addToast } = useRelay()
  
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'members' | 'analytics'>('members')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => { loadTeamData() }, [user])

  async function loadTeamData() {
    if (!user) return
    try {
      // Find the team this user belongs to or owns
      let teamId: string | null = null
      let role = 'member'

      // First check if owner
      const { data: ownedTeam } = await supabase.from('teams').select('*').eq('owner_id', user.id).single()
      
      if (ownedTeam) {
        teamId = ownedTeam.id
        role = 'owner'
        setIsOwner(true)
        setTeam(ownedTeam)
      } else {
        // Check if member
        const { data: membership } = await supabase.from('team_members').select('team_id, role').eq('user_id', user.id).single()
        if (membership) {
          teamId = membership.team_id
          role = membership.role
          const { data: memberTeam } = await supabase.from('teams').select('*').eq('id', teamId).single()
          setTeam(memberTeam || null)
        }
      }

      if (teamId) {
        await Promise.all([
          loadMembers(teamId),
          loadInvites(teamId),
          role === 'owner' || role === 'admin' ? loadAnalytics(teamId) : Promise.resolve()
        ])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadMembers(teamId: string) {
    const { data } = await supabase.from('team_members').select('user_id, role').eq('team_id', teamId)
    setMembers(data || [])
  }

  async function loadInvites(teamId: string) {
    const { data } = await supabase.from('team_invites').select('*').eq('team_id', teamId)
    setInvites(data || [])
  }

  async function loadAnalytics(teamId: string) {
    const { data, error } = await supabase.rpc('get_team_analytics', { p_team_id: teamId })
    if (!error && data) {
      setAnalytics(data as AnalyticsData)
    }
  }

  async function handleInvite() {
    if (!team || !inviteEmail) return
    const currentSeats = members.length + invites.length + 1 // including owner 
    if (currentSeats >= team.seat_count) {
      addToast('Seat limit reached. Upgrade team seats first.', 'error')
      return
    }

    const { error } = await supabase
      .from('team_invites')
      .insert({ team_id: team.id, email: inviteEmail, role: inviteRole })

    if (error) {
      addToast('Failed to send invite', 'error')
    } else {
      addToast('Invite sent!', 'success')
      setInviteEmail('')
      loadInvites(team.id)
    }
  }

  async function revokeInvite(inviteId: string) {
    await supabase.from('team_invites').delete().eq('id', inviteId)
    setInvites(invites.filter((i) => i.id !== inviteId))
    addToast('Invite revoked', 'success')
  }

  async function removeMember(userId: string) {
    if (!confirm("Are you sure you want to remove this member?")) return
    await supabase.from('team_members').delete().eq('user_id', userId).eq('team_id', team!.id)
    setMembers(members.filter((m) => m.user_id !== userId))
    addToast('Member removed', 'success')
    if (analytics) {
      loadAnalytics(team!.id) // Refresh stats
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-white/5 animate-pulse rounded-lg mb-6" />
        <div className="h-64 bg-white/5 animate-pulse rounded-2xl" />
      </div>
    )
  }

  if (!team) {
    return (
      <FadeIn>
        <div className="max-w-md mx-auto text-center mt-20">
          <div className="w-16 h-16 bg-synapse-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-synapse-500/20">
            <Users className="text-synapse-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">You aren't on a team yet</h2>
          <p className="text-gray-400 mb-6 text-sm">
            Upgrade your account to the Team tier to start inviting members, or wait for an invite link.
          </p>
          <a href="/app/settings" className="btn-primary inline-flex">Go to Settings</a>
        </div>
      </FadeIn>
    )
  }

  const totalUsed = members.length + invites.length + 1

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <FadeIn>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <Users className="text-synapse-400" /> {team.name}
            </h1>
            <p className="text-sm text-gray-400">Manage your team's access, seats, and usage analytics.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white/[0.03] border border-white/[0.05] rounded-xl flex items-center gap-3 text-sm">
              <div className="flex flex-col">
                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Seats Used</span>
                <span className="font-medium text-white">{totalUsed} / {team.seat_count}</span>
              </div>
              <div className="h-8 w-px bg-white/10 mx-1" />
              <div className="flex flex-col">
                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Status</span>
                <span className={`font-medium ${team.subscription_status === 'active' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {team.subscription_status}
                </span>
              </div>
            </div>
            {isOwner && (
              <a href="/app/settings" className="btn-secondary text-sm h-[46px] px-4 hidden sm:flex items-center">
                Upgrade Seats
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        {isOwner && (
          <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.05] rounded-xl w-fit mb-6">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'members' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Members & Invites
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${activeTab === 'analytics' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <BarChart3 size={14} /> Analytics
            </button>
          </div>
        )}

        {/* Tab Content: Members */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Invite Section */}
            {isOwner && (
              <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/[0.05] bg-gradient-to-br from-white/[0.02] to-transparent">
                <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                  <UserPlus size={16} className="text-synapse-400" /> Invite New Member
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="Developer's email address"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="input flex-1"
                  />
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className="input w-full sm:w-32"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={handleInvite} className="btn-primary sm:w-32 justify-center">
                    Send Invite
                  </button>
                </div>
                {totalUsed >= team.seat_count && (
                  <p className="mt-3 text-xs text-red-400 flex items-center gap-1.5 font-medium">
                    <AlertTriangle size={12} /> You have reached your seat limit.
                  </p>
                )}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Active Members */}
              <div className="glass-card rounded-2xl p-5 sm:p-6">
                <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                  <Shield size={16} className="text-emerald-400" /> Active Roster ({members.length + 1})
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        OW
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{isOwner ? 'You (Owner)' : 'Team Owner'}</span>
                        <span className="text-[11px] text-gray-500">Root Access</span>
                      </div>
                    </div>
                  </div>

                  {members.map(m => (
                    <div key={m.user_id} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-transparent transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-synapse-500/10 text-synapse-400 flex items-center justify-center font-bold text-xs uppercase">
                          {analytics ? analytics.usage_by_member.find(a => a.user_id === m.user_id)?.email?.slice(0,2) || 'MB' : 'MB'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">
                            {analytics ? analytics.usage_by_member.find(a => a.user_id === m.user_id)?.email || 'Member' : 'Member ID: ' + m.user_id.slice(0, 8)}
                          </span>
                          <span className="text-[11px] text-gray-500 capitalize">{m.role}</span>
                        </div>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => removeMember(m.user_id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          title="Remove member"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Invites */}
              {isOwner && (
                <div className="glass-card rounded-2xl p-5 sm:p-6 opacity-90">
                  <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                    <Mail size={16} className="text-yellow-400" /> Pending Invites ({invites.length})
                  </h3>
                  
                  {invites.length === 0 ? (
                    <div className="h-32 flex items-center justify-center border border-dashed border-white/10 rounded-xl">
                      <span className="text-xs text-gray-500">No pending invites.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {invites.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-300">{inv.email}</span>
                            <span className="text-[11px] text-yellow-500/70">Awaiting acceptance • {inv.role}</span>
                          </div>
                          <button
                            onClick={() => revokeInvite(inv.id)}
                            className="text-[11px] font-medium text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-400/10 hover:bg-red-400/20 transition-colors"
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Analytics */}
        {activeTab === 'analytics' && isOwner && analytics && (
          <FadeIn>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">Total Prompts (30d)</span>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-extrabold text-white">{analytics.total_prompts}</span>
                  <TrendingUp size={18} className="text-emerald-400 mb-1" />
                </div>
              </div>
              <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">Active Members</span>
                <span className="text-3xl font-extrabold text-white">{analytics.usage_by_member.filter(m => m.prompt_count > 0).length} <span className="text-lg text-gray-500 font-normal">/ {totalUsed}</span></span>
              </div>
              <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">Avg Prompts / User</span>
                <span className="text-3xl font-extrabold text-synapse-400">
                  {totalUsed > 0 ? Math.round(analytics.total_prompts / totalUsed) : 0}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 glass-card rounded-2xl p-5 sm:p-6 h-[400px] flex flex-col">
                <h3 className="text-sm font-medium text-white mb-6">Team Usage Activity</h3>
                <div className="flex-1 min-h-0 relative -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.usage_over_time} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTeam" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="date" stroke="#ffffff30" fontSize={11} tickMargin={10} minTickGap={30} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} />
                      <YAxis stroke="#ffffff30" fontSize={11} tickMargin={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff15', borderRadius: '12px', fontSize: '13px' }}
                        labelFormatter={(l) => new Date(l).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}
                      />
                      <Area type="monotone" dataKey="count" name="Prompts" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorTeam)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 sm:p-6 overflow-y-auto">
                <h3 className="text-sm font-medium text-white mb-4">Member Consumption</h3>
                <div className="space-y-3">
                  {analytics.usage_by_member.sort((a,b) => b.prompt_count - a.prompt_count).map(m => (
                    <div key={m.user_id} className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center justify-between">
                      <div className="flex flex-col truncate pr-3">
                        <span className="text-[13px] text-white truncate">{m.email || 'Unknown User'}</span>
                        <span className="text-[10px] text-gray-500 capitalize">{m.role}</span>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5 font-mono text-sm text-synapse-300">
                        <Zap size={12} className="text-synapse-500" /> {m.prompt_count}
                      </div>
                    </div>
                  ))}
                  {analytics.usage_by_member.length === 0 && (
                    <span className="text-xs text-gray-500 text-center block mt-4">No data available.</span>
                  )}
                </div>
              </div>
            </div>
          </FadeIn>
        )}
      </FadeIn>
    </div>
  )
}
