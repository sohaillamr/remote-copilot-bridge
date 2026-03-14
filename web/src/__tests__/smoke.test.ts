import { describe, it, expect } from 'vitest'

describe('App smoke tests', () => {
  it('environment variables are defined', () => {
    // These must be set for Supabase to work
    expect(typeof import.meta.env.VITE_SUPABASE_URL).toBe('string')
    expect(typeof import.meta.env.VITE_SUPABASE_ANON_KEY).toBe('string')
  })

  it('basic utility: error report creation', async () => {
    const { reportError, getErrorQueue } = await import('../lib/errorTracking')
    const before = getErrorQueue().length
    reportError(new Error('test error'))
    expect(getErrorQueue().length).toBe(before + 1)
    const last = getErrorQueue()[getErrorQueue().length - 1]
    expect(last.message).toBe('test error')
    expect(last.version).toBe('0.1.0')
  })
})