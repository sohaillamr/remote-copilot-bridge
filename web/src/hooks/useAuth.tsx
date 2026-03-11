import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, type Profile } from '../lib/supabase'
import { restoreSessionFromIDB } from '../lib/persistentStorage'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  isAdmin: boolean
  isLoading: boolean
  signInWithGithub: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string) => Promise<void>
  signOut: () => Promise<void>
  hasActiveSubscription: boolean
  refreshProfile: (userId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Decode role from JWT
  const isAdmin = (() => {
    if (!session?.access_token) return false
    try {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]))
      return payload.user_role === 'admin'
    } catch {
      return false
    }
  })()

  const hasActiveSubscription = (() => {
    if (!profile) return false
    const { subscription_status, trial_ends_at } = profile
    if (subscription_status === 'active') return true
    if (subscription_status === 'trial' && trial_ends_at) {
      return new Date(trial_ends_at) > new Date()
    }
    return false
  })()

  useEffect(() => {
    // Wait for IndexedDB session recovery (in case localStorage was wiped on mobile)
    // then get the session
    restoreSessionFromIDB().then(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        setIsLoading(false)
      })
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        else setProfile(null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data as Profile)
  }

  // Public method to refresh profile data
  const refreshProfile = fetchProfile

  async function signInWithGithub() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/app` },
    })
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app` },
    })
  }

  async function signInWithEmail(email: string) {
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        signInWithGithub,
        signInWithGoogle,
        signInWithEmail,
        signOut,
        hasActiveSubscription,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
