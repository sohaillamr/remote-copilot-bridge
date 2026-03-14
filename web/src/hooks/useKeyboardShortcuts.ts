import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Global keyboard shortcuts for Synapse.
 * 
 * Shortcuts (when not focused on an input):
 * - Ctrl/Cmd + K: Focus chat input
 * - Ctrl/Cmd + /: Toggle sidebar
 * - Ctrl/Cmd + 1-4: Navigate to Dashboard/Chat/Files/Settings
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if (!mod) return

      // Ctrl+1-4: Quick navigation (works even in inputs)
      if (e.key === '1') { e.preventDefault(); navigate('/app') }
      if (e.key === '2') { e.preventDefault(); navigate('/app/chat') }
      if (e.key === '3') { e.preventDefault(); navigate('/app/files') }
      if (e.key === '4') { e.preventDefault(); navigate('/app/settings') }

      // Skip remaining shortcuts if in an input
      if (isInput) return

      // Ctrl+K: Focus chat input
      if (e.key === 'k') {
        e.preventDefault()
        if (!location.pathname.startsWith('/app/chat')) {
          navigate('/app/chat')
        }
        // Focus the textarea after a tick
        setTimeout(() => {
          const textarea = document.querySelector('textarea[aria-label="Prompt input"]') as HTMLTextAreaElement
          textarea?.focus()
        }, 100)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, location])
}
