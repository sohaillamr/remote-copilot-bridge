/**
 * Lightweight error tracking for Synapse.
 *
 * In development: logs to console.
 * In production: logs to Supabase `error_logs` table (if available)
 * and/or a custom VITE_ERROR_TRACKING_URL endpoint.
 */

import { supabase } from './supabase'

interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  url: string
  timestamp: string
  userAgent: string
  version: string
}

const ERROR_QUEUE: ErrorReport[] = []
const MAX_QUEUE = 50
const VERSION = '0.1.0'

function createReport(error: Error | string, componentStack?: string): ErrorReport {
  const err = typeof error === 'string' ? new Error(error) : error
  return {
    message: err.message,
    stack: err.stack?.slice(0, 2000),
    componentStack: componentStack?.slice(0, 1000),
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    version: VERSION,
  }
}

/** Debounce: don't send the same error message more than once per 30s */
const _recentErrors = new Map<string, number>()
const DEBOUNCE_MS = 30_000

export function reportError(error: Error | string, componentStack?: string): void {
  const report = createReport(error, componentStack)

  // Dedupe: skip if we reported the same message recently
  const now = Date.now()
  const lastSent = _recentErrors.get(report.message)
  if (lastSent && now - lastSent < DEBOUNCE_MS) return
  _recentErrors.set(report.message, now)

  // Store in queue (viewable in console for debugging)
  ERROR_QUEUE.push(report)
  if (ERROR_QUEUE.length > MAX_QUEUE) ERROR_QUEUE.shift()

  // Log to console in development
  if (import.meta.env.DEV) {
    console.group('[Synapse Error Tracker]')
    console.error(report.message)
    if (report.stack) console.debug(report.stack)
    console.groupEnd()
    return
  }

  // In production: log to Supabase error_logs table
  _logToSupabase(report)

  // Also send to custom endpoint if configured
  const endpoint = import.meta.env.VITE_ERROR_TRACKING_URL
  if (endpoint) {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    }).catch(() => {})
  }
}

async function _logToSupabase(report: ErrorReport): Promise<void> {
  try {
    await supabase.from('error_logs').insert({
      message: report.message,
      stack: report.stack,
      url: report.url,
      user_agent: report.userAgent,
      version: report.version,
    })
  } catch {
    // Silently fail — don't cause more errors from error tracking
  }
}

export function getErrorQueue(): readonly ErrorReport[] {
  return ERROR_QUEUE
}

/**
 * Initialize global error handlers.
 * Call this once in main.tsx.
 */
export function initErrorTracking(): void {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason))
    reportError(error)
  })

  // Uncaught errors
  window.addEventListener('error', (event) => {
    if (event.error) {
      reportError(event.error)
    }
  })

  if (import.meta.env.DEV) {
    console.info('[Synapse] Error tracking initialized (dev mode — logging only)')
  }
}