
import re
with open('web/src/pages/app/Chat.tsx', 'r', encoding='utf-8') as f: code = f.read()
p = r'const \[sidebarOpen, setSidebarOpen\] = useState\(\(\) => window\.innerWidth >= 1024\s*\)'
r = '''const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('synapse_chat_sidebar')
    if (saved !== null) return saved === 'true'
    return window.innerWidth >= 1024
  })

  useEffect(() => {
    localStorage.setItem('synapse_chat_sidebar', String(sidebarOpen))
  }, [sidebarOpen])'''
code = re.sub(p, r, code)
with open('web/src/pages/app/Chat.tsx', 'w', encoding='utf-8') as f: f.write(code)

