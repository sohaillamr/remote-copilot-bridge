import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, DollarSign, Activity, Zap, TrendingUp, Clock } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts'

interface DashboardStats {
  total_users: number
  active_today: number
  paying_users: number
  trialing_users: number
  mrr_cents: number
  agents_online: number
  prompts_today: number
  prompts_this_month: number
  avg_latency_ms: number
  churn_rate: number
  conversion_rate: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [signups, setSignups] = useState<{ day: string; count: number }[]>([])
  const [mrr, setMrr] = useState<{ month: string; mrr: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [statsRes, signupsRes, mrrRes] = await Promise.all([
      supabase.rpc('admin_dashboard_stats'),
      supabase.rpc('admin_signups_over_time', { days: 30 }),
      supabase.rpc('admin_mrr_over_time', { months: 12 }),
    ])
    setStats(statsRes.data)
    setSignups(signupsRes.data || [])
    setMrr(mrrRes.data || [])
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading dashboard...</div>
  }

  const kpis = [
    { label: 'Total Users', value: stats?.total_users ?? 0, icon: Users, color: 'text-blue-400' },
    { label: 'Active Today', value: stats?.active_today ?? 0, icon: Activity, color: 'text-green-400' },
    { label: 'Paying', value: stats?.paying_users ?? 0, icon: DollarSign, color: 'text-yellow-400' },
    { label: 'MRR', value: `$${((stats?.mrr_cents ?? 0) / 100).toFixed(0)}`, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Prompts Today', value: stats?.prompts_today ?? 0, icon: Zap, color: 'text-synapse-400' },
    { label: 'Avg Latency', value: `${stats?.avg_latency_ms ?? 0}ms`, icon: Clock, color: 'text-purple-400' },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-800">
                <Icon className={color} size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Signups */}
        <div className="card">
          <h3 className="font-semibold mb-4">Signups (30 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={signups}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#D1D5DB' }}
              />
              <Area type="monotone" dataKey="count" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* MRR */}
        <div className="card">
          <h3 className="font-semibold mb-4">MRR (12 months)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mrr}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#D1D5DB' }}
                formatter={(value: number) => [`$${value}`, 'MRR']}
              />
              <Line type="monotone" dataKey="mrr" stroke="#34D399" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold">{stats?.trialing_users ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">Trialing</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold">{stats?.agents_online ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">Agents Online</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold">{((stats?.conversion_rate ?? 0) * 100).toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-1">Conversion Rate</p>
        </div>
      </div>
    </div>
  )
}
