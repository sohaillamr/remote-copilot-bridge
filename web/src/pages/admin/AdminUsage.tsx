import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Zap, Wrench, BarChart3 } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#a78bfa', '#34D399', '#60A5FA', '#FBBF24', '#F87171', '#818CF8']

export default function AdminUsage() {
  const [prompts, setPrompts] = useState<{ day: string; count: number }[]>([])
  const [toolUsage, setToolUsage] = useState<{ tool_name: string; count: number }[]>([])
  const [topUsers, setTopUsers] = useState<{ user_id: string; email: string; prompt_count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [promptsRes, toolsRes, topRes] = await Promise.all([
      supabase.rpc('admin_prompts_over_time', { days: 30 }),
      supabase.rpc('admin_usage_by_tool'),
      supabase.rpc('admin_top_users', { lim: 10 }),
    ])
    setPrompts(promptsRes.data || [])
    setToolUsage(toolsRes.data || [])
    setTopUsers(topRes.data || [])
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading usage data...</div>
  }

  const totalPrompts = prompts.reduce((s, d) => s + d.count, 0)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Usage Analytics</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-synapse-400" />
            <span className="text-sm text-gray-500">Prompts (30d)</span>
          </div>
          <p className="text-3xl font-bold">{totalPrompts.toLocaleString()}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Wrench size={16} className="text-blue-400" />
            <span className="text-sm text-gray-500">Tools Used</span>
          </div>
          <p className="text-3xl font-bold">{toolUsage.length}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={16} className="text-purple-400" />
            <span className="text-sm text-gray-500">Avg/Day</span>
          </div>
          <p className="text-3xl font-bold">{prompts.length > 0 ? Math.round(totalPrompts / prompts.length) : 0}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Prompts over time */}
        <div className="card">
          <h3 className="font-semibold mb-4">Prompts Per Day</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={prompts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8 }}
              />
              <Area type="monotone" dataKey="count" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tool distribution */}
        <div className="card">
          <h3 className="font-semibold mb-4">Tool Popularity</h3>
          {toolUsage.length === 0 ? (
            <p className="text-gray-500 text-center py-10">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={toolUsage}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="tool_name"
                >
                  {toolUsage.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top users */}
      <div className="card">
        <h3 className="font-semibold mb-4">Top Users by Prompts</h3>
        {topUsers.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No data yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium text-right">Prompts</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u, i) => (
                <tr key={u.user_id} className="border-b border-gray-800/50">
                  <td className="py-2 text-gray-500">{i + 1}</td>
                  <td className="py-2">{u.email}</td>
                  <td className="py-2 text-right font-mono">{u.prompt_count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
