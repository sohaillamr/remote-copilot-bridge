import { createClient } from '@supabase/supabase-js'

// Support both VITE_ prefix (local dev) and NEXT_PUBLIC_ prefix (Supabase Vercel integration)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
  || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Types from our DB schema ───────────────────────────────────

export type SubscriptionStatus = 'free' | 'trial' | 'active' | 'cancelled' | 'past_due' | 'expired'

export interface Profile {
  id: string
  email: string
  display_name: string
  avatar_url: string
  subscription_status: SubscriptionStatus
  subscription_id: string
  subscription_provider: string
  trial_ends_at: string | null
  subscription_ends_at: string | null
  customer_portal_url: string
  banned_at: string | null
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  user_id: string
  name: string
  hostname: string
  os: string
  tools: string[]
  work_dir: string
  is_online: boolean
  last_seen_at: string
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  agent_id: string | null
  tool: string
  title: string
  work_dir: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata: Record<string, unknown>
  created_at: string
}
