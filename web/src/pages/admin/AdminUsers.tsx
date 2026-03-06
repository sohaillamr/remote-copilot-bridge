import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Ban, Clock, Eye, ChevronLeft, UserCircle } from 'lucide-react'

interface UserRow {
  id: string
  email: string
  display_name: string | null
  subscription_status: string
  subscription_provider: string | null
  trial_ends_at: string | null
  created_at: string
  is_banned: boolean
}

interface UserDetail {
  profile: UserRow
  agents: number
  conversations: number
  total_prompts: number
  last_prompt_at: string | null
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<UserDetail | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    setUsers(data || [])
    setLoading(false)
  }

  async function viewUser(userId: string) {
    const { data } = await supabase.rpc('admin_user_detail', { target_user_id: userId })
    if (data) setDetail(data)
  }

  async function extendTrial(userId: string, days: number) {
    await supabase.rpc('admin_extend_trial', { target_user_id: userId, extra_days: days })
    loadUsers()
    if (detail?.profile.id === userId) viewUser(userId)
  }

  async function toggleBan(userId: string, isBanned: boolean) {
    if (isBanned) {
      await supabase.rpc('admin_unban_user', { target_user_id: userId })
    } else {
      await supabase.rpc('admin_ban_user', { target_user_id: userId })
    }
    loadUsers()
    if (detail?.profile.id === userId) viewUser(userId)
  }

  const filtered = users.filter(u =>
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const statusColors: Record<string, string> = {
    active: 'bg-green-600/20 text-green-400',
    trialing: 'bg-yellow-600/20 text-yellow-400',
    past_due: 'bg-red-600/20 text-red-400',
    cancelled: 'bg-gray-700 text-gray-400',
    inactive: 'bg-gray-700 text-gray-400',
  }

  // Detail view
  if (detail) {
    return (
      <div className="space-y-6">
        <button onClick={() => setDetail(null)} className="btn-secondary text-sm flex items-center gap-1">
          <ChevronLeft size={14} /> Back to Users
        </button>

        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            <UserCircle className="text-gray-500" size={48} />
            <div>
              <h2 className="text-xl font-bold">{detail.profile.display_name || 'No name'}</h2>
              <p className="text-gray-400">{detail.profile.email}</p>
            </div>
            <span className={`ml-auto text-sm px-3 py-1 rounded-full ${statusColors[detail.profile.subscription_status]}`}>
              {detail.profile.subscription_status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{detail.agents}</p>
              <p className="text-xs text-gray-500">Agents</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{detail.conversations}</p>
              <p className="text-xs text-gray-500">Conversations</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{detail.total_prompts}</p>
              <p className="text-xs text-gray-500">Total Prompts</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <p className="text-sm">{detail.last_prompt_at ? new Date(detail.last_prompt_at).toLocaleDateString() : 'Never'}</p>
              <p className="text-xs text-gray-500">Last Prompt</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => extendTrial(detail.profile.id, 7)}
              className="btn-secondary text-sm flex items-center gap-1"
            >
              <Clock size={14} /> Extend Trial +7d
            </button>
            <button
              onClick={() => toggleBan(detail.profile.id, detail.profile.is_banned)}
              className={`text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                detail.profile.is_banned
                  ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                  : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
              }`}
            >
              <Ban size={14} />
              {detail.profile.is_banned ? 'Unban User' : 'Ban User'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-gray-500 text-sm">{users.length} total</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email or name..."
          className="input w-full pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Provider</th>
                <th className="pb-3 font-medium">Joined</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3">
                    <p className="font-medium">{user.display_name || user.email}</p>
                    {user.display_name && <p className="text-xs text-gray-500">{user.email}</p>}
                    {user.is_banned && <span className="text-xs text-red-400 ml-1">(banned)</span>}
                  </td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[user.subscription_status]}`}>
                      {user.subscription_status}
                    </span>
                  </td>
                  <td className="text-gray-400 capitalize">{user.subscription_provider || '—'}</td>
                  <td className="text-gray-400">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => viewUser(user.id)}
                      className="p-1 text-gray-500 hover:text-white transition-colors"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
