/**
 * Hybrid persistent storage adapter for Supabase auth.
 *
 * Mobile Safari aggressively clears localStorage (especially after 7 days
 * of inactivity, or in PWA/bookmark mode). This adapter writes to BOTH
 * localStorage AND IndexedDB, and reads from whichever still has data.
 *
 * Also stores a stable device fingerprint so the backend can recognize
 * returning devices and restore sessions even if all browser storage is wiped.
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
  // Combine stable browser properties for a semi-unique device fingerprint
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

  // Simple hash
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

  // Try to read a previously stored device ID first (stable across sessions)
  const stored = localStorage.getItem('synapse-device-id')
  if (stored) {
    _deviceId = stored
    return stored
  }

  // Generate new one and persist
  const id = generateDeviceId()
  localStorage.setItem('synapse-device-id', id)
  // Also store in IndexedDB for extra durability
  idbSet('synapse-device-id', id)
  _deviceId = id
  return id
}

// Restore device ID from IndexedDB if localStorage was cleared
export async function restoreDeviceId(): Promise<string> {
  const fromLS = localStorage.getItem('synapse-device-id')
  if (fromLS) {
    _deviceId = fromLS
    return fromLS
  }

  const fromIDB = await idbGet('synapse-device-id')
  if (fromIDB) {
    localStorage.setItem('synapse-device-id', fromIDB)
    _deviceId = fromIDB
    return fromIDB
  }

  return getDeviceId()
}

// ── Hybrid storage for Supabase ────────────────────────────

export const persistentStorage = {
  getItem: (key: string): string | null => {
    // Try localStorage first (synchronous, fast)
    const fromLS = localStorage.getItem(key)
    if (fromLS) return fromLS

    // If localStorage is empty, schedule an async IndexedDB recovery
    // but return null for now (Supabase will call getSession later)
    idbGet(key).then((val) => {
      if (val && !localStorage.getItem(key)) {
        // Restore to localStorage for future sync reads
        localStorage.setItem(key, val)
        // Force a page reload to pick up the restored session
        // (only once per recovery)
        const recoveryKey = `${key}_recovered`
        if (!sessionStorage.getItem(recoveryKey)) {
          sessionStorage.setItem(recoveryKey, '1')
          window.location.reload()
        }
      }
    })

    return null
  },

  setItem: (key: string, value: string): void => {
    localStorage.setItem(key, value)
    // Mirror to IndexedDB as a durable backup
    idbSet(key, value)
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key)
    idbRemove(key)
  },
}
