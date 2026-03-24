import re

with open('web/src/hooks/useKeyboardShortcuts.ts', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Esc: Unfocus inputs
      if (e.key === 'Escape') {
        if (isInput) target.blur()
        return
      }

      if (!mod) return

      // Ctrl+1-4: Quick navigation
      if (e.key === '1') { e.preventDefault(); navigate('/app') }
      if (e.key === '2') { e.preventDefault(); navigate('/app/chat') }
      if (e.key === '3') { e.preventDefault(); navigate('/app/files') }
      if (e.key === '4') { e.preventDefault(); navigate('/app/settings') }

      // Ctrl+K: Focus search input in chat
      if (e.key === 'k') {
        e.preventDefault()
        if (!location.pathname.startsWith('/app/chat')) {
          navigate('/app/chat')
        }
        setTimeout(() => {
          const searchInput = document.getElementById('conversation-search') as HTMLInputElement
          if (searchInput) {
            searchInput.focus()
          } else {
             const textarea = document.querySelector('textarea[placeholder*=\"Ask\"]') as HTMLTextAreaElement
             textarea?.focus()
          }
        }, 100)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, location])
}"""

content = re.sub(r'export function useKeyboardShortcuts\(\).*$', replacement, content, flags=re.DOTALL)

with open('web/src/hooks/useKeyboardShortcuts.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Shortcuts updated!")
