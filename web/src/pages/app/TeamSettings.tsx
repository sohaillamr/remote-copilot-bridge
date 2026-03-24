import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Users, UserPlus, X, Mail, Shield } from 'lucide-react'
import { useRelay } from '../../contexts/AgentRelayContext'
import { FadeIn } from '../../components/Animations'

interface Team {
  id: string
  name: string
  seat_count: number
  subscription_status: string
}

interface TeamMember {
  user_id: string
  role: string
  profile?: { display_name: string, email: string }
}

interface TeamInvite {
  id: string
  email: string
  role: string
  token: string
}

export default function TeamSettings() {
  const { user } = useAuth()
  const { addToast } = useRelay()
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')

  useEffect(() => { loadTeam() }, [user])

  async function loadTeam() {
    if (!user) return
    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', user.id)
        .single()
      
      if (teamData) {
        setTeam(teamData)
        await Promise.all([loadMembers(teamData.id), loadInvites(teamData.id)])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadMembers(teamId: string) {
    const { data } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', teamId)
    // You might want to join profiles here depending on RLS.
    // For now, keep it simple.
    setMembers(data || [])
  }

  async function loadInvites(teamId: string) {
    const { data } = await supabase
      .from('team_invites')
      .select('*')
      .eq('team_id', teamId)
    setInvites(data || [])
  }

  async function handleInvite() {
    if (!team || !inviteEmail) return
    const currentSeats = members.length + invites.length + 1 // including owner
    if (currentSeats >= team.seat_count) {
      addToast('Seat limit reached. Upgrade team seats first.')
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
    loadInvites(team!.id)
  }

  async function removeMember(userId: string) {
    await supabase.from('team_members').delete().eq('team_id', team!.id).eq('user_id', userId)
    loadMembers(team!.id)
  }

  if (loading) return <div className="animate-pulse h-32 bg-white/5 rounded-xl" />
  if (!team) return null // Hide if no team

  const totalUsed = members.length + invites.length + 1 // +1 for owner

  return (
    <FadeIn>
      <div className="glass-card rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="text-blue-400" /> Team Management
        </h2>
        
        <div className="flex items-center justify-between mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
          <div>
            <div className="font-medium text-blue-200">Seats Used</div>
            <div className="text-blue-400/80">{totalUsed} / {team.seat_count} members & invites</div>
          </div>
          <div className="text-right">
            <div className="font-medium text-blue-200">Plan Status</div>
            <div className="text-blue-400/80 uppercase">{team.subscription_status}</div>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-300">Invite new member</h3>
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="Email address" 
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="input flex-1"
            />
            <select 
              value={inviteRole} 
              onChange={e => setInviteRole(e.target.value)}
              className="input w-32"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={handleInvite} className="btn-primary flex items-center gap-2">
              <UserPlus size={16} /> Invite
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Active Members ({members.length + 1})</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-blue-400" />
                  <span className="text-sm">You (Owner)</span>
                </div>
              </div>
              {members.map(m => (
                <div key={m.user_id} className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <Users size={16} className="text-gray-400" />
                    <span className="text-sm font-mono text-gray-400 text-xs">{m.user_id.slice(0, 8)}...</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300">{m.role}</span>
                  </div>
                  <button onClick={() => removeMember(m.user_id)} className="p-1 hover:bg-white/10 rounded text-red-400">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Pending Invites ({invites.length})</h3>
            {invites.length === 0 ? (
              <div className="text-sm text-gray-500 py-4 text-center border border-dashed border-white/10 rounded">No pending invites</div>
            ) : (
              <div className="space-y-2">
                {invites.map(inv => (
                  <div key={inv.id} className="flex flex-col gap-2 p-3 rounded bg-white/5 border border-white/10 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-300">{inv.email}</span>
                      </div>
                      <button onClick={() => revokeInvite(inv.id)} className="p-1 hover:bg-white/10 rounded text-red-400">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-[10px] text-gray-500 bg-black/30 px-2 py-1 rounded select-all flex-1">
                        {inv.token}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </FadeIn>
  )
}
