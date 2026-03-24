import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { DollarSign, TrendingDown, CreditCard, Check, X, ExternalLink } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,   
  BarChart, Bar,
} from 'recharts'

export default function AdminRevenue() {
  const [mrr, setMrr] = useState<{ month: string; mrr: number }[]>([])
  const [churn, setChurn] = useState<{ month: string; churned: number; rate: number }[]>([])                                                                      
  const [events, setEvents] = useState<{ id: string; provider: string; event_name: string; payload: Record<string, any>; created_at: string }[]>([])              
  const [manualPayments, setManualPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [mrrRes, churnRes, eventsRes, paymentsRes] = await Promise.all([
      supabase.rpc('admin_mrr_over_time', { months: 12 }),
      supabase.rpc('admin_churn_by_month', { months: 6 }),
      supabase
        .from('payment_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('manual_payments')
        .select('*, user:user_id(display_name, email)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ])
    setMrr(mrrRes.data || [])
    setChurn(churnRes.data || [])
    setEvents(eventsRes.data || [])
    setManualPayments(paymentsRes.data || [])
    setLoading(false)
  }

  async function handleApprove(id: string) {
    if (!confirm('Are you sure you want to approve this payment?')) return;
    await supabase.rpc('admin_approve_payment', { p_payment_id: id });
    loadAll();
  }

  async function handleReject(id: string) {
    if (!confirm('Are you sure you want to reject this payment?')) return;
    await supabase.rpc('admin_reject_payment', { p_payment_id: id });
    loadAll();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading revenue data...</div>
  }

  const currentMrr = mrr.length > 0 ? mrr[mrr.length - 1].mrr : 0
  const prevMrr = mrr.length > 1 ? mrr[mrr.length - 2].mrr : 0
  const mrrGrowth = prevMrr > 0 ? ((currentMrr - prevMrr) / prevMrr * 100).toFixed(1) : '—'

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Revenue</h1>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-green-400" />
            <span className="text-sm text-gray-500">Current MRR</span>
          </div>
          <p className="text-3xl font-bold">${currentMrr}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-yellow-400" />
            <span className="text-sm text-gray-500">MRR Growth</span>
          </div>
          <p className="text-3xl font-bold">{mrrGrowth}%</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={16} className="text-blue-400" />
            <span className="text-sm text-gray-500">Recent Events</span>
          </div>
          <p className="text-3xl font-bold">{events.length}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4">MRR Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mrr}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8 }}
                formatter={(value: number) => [`$${value}`, 'MRR']}
              />
              <Line type="monotone" dataKey="mrr" stroke="#34D399" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Churn by Month</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={churn}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8 }}
              />
              <Bar dataKey="churned" fill="#F87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pending Manual Payments */}
      <div className="card">
        <h3 className="font-semibold mb-4">Pending Instapay Manual Payments</h3>
        {manualPayments.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No pending manual payments</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Proof</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {manualPayments.map(mp => (
                  <tr key={mp.id} className="border-b border-gray-800/50">
                    <td className="py-3">
                      <div>
                        <p className="text-gray-200">{mp.user?.display_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{mp.user?.email}</p>
                      </div>
                    </td>
                    <td className="py-3 text-gray-300">
                      {mp.amount} {mp.currency}
                    </td>
                    <td className="py-3">
                      <a href={mp.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-synapse-400 hover:text-synapse-300 flex items-center gap-1">
                        View Receipt <ExternalLink size={12} />
                      </a>
                    </td>
                    <td className="py-3 text-gray-400">
                      {new Date(mp.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleApprove(mp.id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="Approve & Activate">
                          <Check size={16} />
                        </button>
                        <button onClick={() => handleReject(mp.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Reject">
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent payment events */}
      <div className="card">
        <h3 className="font-semibold mb-4">Recent Payment Events</h3>
        {events.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No payment events yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="pb-3 font-medium">Provider</th>
                  <th className="pb-3 font-medium">Event</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id} className="border-b border-gray-800/50">
                    <td className="py-2 capitalize">{ev.provider}</td>
                    <td className="py-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-800">{ev.event_name}</span>
                    </td>
                    <td className="py-2 text-gray-400">
                      {ev.payload?.data?.attributes?.total_formatted ||
                       ev.payload?.amount_cents ? `${(ev.payload.amount_cents / 100).toFixed(2)} EGP` : '—'}
                    </td>
                    <td className="py-2 text-gray-400">{new Date(ev.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

