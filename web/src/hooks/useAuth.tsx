import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, type Profile } from '../lib/supabase'
import {
  restoreSessionFromIDB,
  saveDeviceRefreshToken,
  getDeviceRefreshToken,
  clearDeviceRefreshToken,
} from '../lib/persistentStorage'
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
    let mounted = true

    async function initAuth() {
      // 1. Ensure IDB → localStorage recovery is complete
      await restoreSessionFromIDB()

      // 2. Try to get existing session from storage
      const { data: { session: existingSession } } = await supabase.auth.getSession()

      if (existingSession) {
        if (mounted) {
          setSession(existingSession)
          setUser(existingSession.user)
          fetchProfile(existingSession.user.id)
          // Keep device refresh token in sync (token rotation)
          if (existingSession.refresh_token) {
            saveDeviceRefreshToken(existingSession.refresh_token)
          }
          setIsLoading(false)
        }
        return
      }

      // 3. No session found — try silent re-auth via device refresh token
      //    This is the "permanent QR pairing" fallback: even if Supabase's
      //    main session storage was evicted, we can re-authenticate using
      //    the separately stored refresh token.
      const deviceRefresh = await getDeviceRefreshToken()
      if (deviceRefresh) {
        try {
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: deviceRefresh,
          })
          if (!error && data?.session) {
            if (mounted) {
              setSession(data.session)
              setUser(data.session.user)
              fetchProfile(data.session.user.id)
              // Update stored token (rotation gives us a new one)
              if (data.session.refresh_token) {
                saveDeviceRefreshToken(data.session.refresh_token)
              }
            }
          } else {
            // Device refresh token is expired/revoked — clear it
            // User will need to re-pair or login normally
            await clearDeviceRefreshToken()
          }
        } catch {
          // Failed to re-auth, clear stale token
          await clearDeviceRefreshToken()
        }
      }

      if (mounted) setIsLoading(false)
    }

    initAuth()

    // 4. Listen for auth state changes (auto-refresh, sign-in, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id)
          // Keep device refresh token updated on every token rotation
          if (session.refresh_token) {
            saveDeviceRefreshToken(session.refresh_token)
          }
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data as Profile)
  }

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
    // Clear the device refresh token so this device is unpaired
    await clearDeviceRefreshToken()
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, isAdmin, isLoading,
        signInWithGithub, signInWithGoogle, signInWithEmail, signOut,
        hasActiveSubscription, refreshProfile,
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