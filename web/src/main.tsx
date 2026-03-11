import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { restoreSessionFromIDB } from './lib/persistentStorage'

/**
 * Boot barrier: recover IDB-backed auth data into localStorage
 * BEFORE React renders and BEFORE Supabase's createClient reads storage.
 * This prevents the race condition where Supabase sees an empty localStorage
 * because the async IDB recovery hasn't finished yet.
 */
async function boot() {
  await restoreSessionFromIDB()

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
}

boot()