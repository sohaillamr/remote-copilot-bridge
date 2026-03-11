/**
 * Hybrid persistent storage adapter for Supabase auth.
 *
 * Mobile Safari aggressively clears localStorage (especially after 7 days
 * of inactivity, or in PWA/bookmark mode). This adapter writes to BOTH
 * localStorage AND IndexedDB, and reads from whichever still has data.
 *
 * Also stores a stable device fingerprint so the backend can recognize
 * returning devices and restore sessions even if all browser storage is wiped.
 *
 * === Device Refresh Token ===
 * After QR pairing, the mobile device stores its own independent refresh_token
 * in a separate key ('synapse-device-refresh'). If the main Supabase session
 * is lost (localStorage evicted, etc.), useAuth can silently re-authenticate
 * using this token — no QR re-scan needed.
 */

const DB_NAME = 'synapse-auth-db'
const STORE_NAME = 'auth'
const DB_VERSION = 1

// ── IndexedDB helpers ──────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
  } catch {
    // Silently fail — localStorage is the primary store
  }
}

async function idbRemove(key: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
  } catch {
    // Silently fail
  }
}

// ── Device fingerprint ─────────────────────────────────────

function generateDeviceId(): string {
  const canvas = (() => {
    try {
      const c = document.createElement('canvas')
      const ctx = c.getContext('2d')
      if (!ctx) return ''
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('synapse-fp', 2, 2)
      return c.toDataURL().slice(-50)
    } catch {
      return ''
    }
  })()

  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth?.toString() ?? '',
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency?.toString() ?? '',
    canvas,
  ]

  let hash = 0
  const str = parts.join('|')
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return 'dev_' + Math.abs(hash).toString(36) + '_' + (navigator.userAgent.includes('Mobile') ? 'm' : 'd')
}

let _deviceId: string | null = null

export function getDeviceId(): string {
  if (_deviceId) return _deviceId
  const stored = localStorage.getItem('synapse-device-id')
  if (stored) { _deviceId = stored; return stored }
  const id = generateDeviceId()
  localStorage.setItem('synapse-device-id', id)
  idbSet('synapse-device-id', id)
  _deviceId = id
  return id
}

export async function restoreDeviceId(): Promise<string> {
  const fromLS = localStorage.getItem('synapse-device-id')
  if (fromLS) { _deviceId = fromLS; return fromLS }
  const fromIDB = await idbGet('synapse-device-id')
  if (fromIDB) {
    localStorage.setItem('synapse-device-id', fromIDB)
    _deviceId = fromIDB
    return fromIDB
  }
  return getDeviceId()
}

// ── Device refresh token (permanent QR pairing) ────────────

const DEVICE_REFRESH_KEY = 'synapse-device-refresh'

/**
 * Save the device's own independent refresh_token.
 * Called after QR pairing succeeds and after every token rotation.
 */
export async function saveDeviceRefreshToken(refreshToken: string): Promise<void> {
  try {
    localStorage.setItem(DEVICE_REFRESH_KEY, refreshToken)
    await idbSet(DEVICE_REFRESH_KEY, refreshToken)
  } catch {
    // Best effort
  }
}

/**
 * Retrieve the device refresh token from localStorage or IndexedDB.
 * Used on startup to silently re-authenticate if the main session is gone.
 */
export async function getDeviceRefreshToken(): Promise<string | null> {
  const fromLS = localStorage.getItem(DEVICE_REFRESH_KEY)
  if (fromLS) return fromLS
  const fromIDB = await idbGet(DEVICE_REFRESH_KEY)
  if (fromIDB) {
    localStorage.setItem(DEVICE_REFRESH_KEY, fromIDB)
    return fromIDB
  }
  return null
}

/**
 * Clear the device refresh token (on explicit sign-out).
 */
export async function clearDeviceRefreshToken(): Promise<void> {
  try {
    localStorage.removeItem(DEVICE_REFRESH_KEY)
    await idbRemove(DEVICE_REFRESH_KEY)
  } catch {
    // Best effort
  }
}

// ── Hybrid storage for Supabase ────────────────────────────

let _idbRecoveryDone = false
let _idbRecoveryPromise: Promise<void> | null = null

export function restoreSessionFromIDB(): Promise<void> {
  if (_idbRecoveryDone) return Promise.resolve()
  if (_idbRecoveryPromise) return _idbRecoveryPromise

  _idbRecoveryPromise = (async () => {
    try {
      // Recover main auth session
      const authKey = 'synapse-auth'
      const fromLS = localStorage.getItem(authKey)
      if (!fromLS) {
        const fromIDB = await idbGet(authKey)
        if (fromIDB) {
          localStorage.setItem(authKey, fromIDB)
        }
      }
      // Also recover device refresh token
      const refreshLS = localStorage.getItem(DEVICE_REFRESH_KEY)
      if (!refreshLS) {
        const refreshIDB = await idbGet(DEVICE_REFRESH_KEY)
        if (refreshIDB) {
          localStorage.setItem(DEVICE_REFRESH_KEY, refreshIDB)
        }
      }
      // Also recover device ID
      await restoreDeviceId()
    } catch {
      // Silently fail
    } finally {
      _idbRecoveryDone = true
    }
  })()

  return _idbRecoveryPromise
}

export const persistentStorage = {
  getItem: (key: string): string | null => {
    return localStorage.getItem(key)
  },

  setItem: (key: string, value: string): void => {
    localStorage.setItem(key, value)
    idbSet(key, value)  // Mirror to IndexedDB as durable backup
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key)
    idbRemove(key)
  },
}