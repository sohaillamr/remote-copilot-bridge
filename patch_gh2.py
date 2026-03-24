import os
import re

# 1. Update AppLayout.tsx
app_layout_path = r'web\src\layouts\AppLayout.tsx'
with open(app_layout_path, 'r', encoding='utf-8') as f:
    layout = f.read()

if 'GithubRepos' not in layout:
    layout = layout.replace("import { Home, FolderGit2, Settings, MessageSquare, Terminal, Menu, X, Users, Code2, Plus }", 
                            "import { Home, FolderGit2, Settings, MessageSquare, Terminal, Menu, X, Users, Code2, Plus, Github }")
    layout = layout.replace("import { Home, FolderGit2, Settings as SettingsIcon, MessageSquare, Terminal, Menu, X, Users, Code2, Plus }", 
                            "import { Home, FolderGit2, Settings as SettingsIcon, MessageSquare, Terminal, Menu, X, Users, Code2, Plus, Github }")
    layout = layout.replace("import { Home, FolderGit2, Settings as SettingsIcon, MessageSquare, Menu, X, Users, Code2, Plus }", 
                            "import { Home, FolderGit2, Settings as SettingsIcon, MessageSquare, Menu, X, Users, Code2, Plus, Github }")
    
    # Try generic lucide import append
    if "Github" not in layout:
        layout = re.sub(r'(import {[^}]+) } from \'lucide-react\'', r'\1, Github } from \'lucide-react\'', layout)
    
    # Add Github tab before settings
    nav_items_regex = r"(const navItems = \[[\s\S]*?)({\s*to:\s*'/app/settings'.*?\])"
    layout = re.sub(nav_items_regex, r"\1{ to: '/app/github', icon: Github, label: 'GitHub', end: false },\n  \2", layout)
    
    with open(app_layout_path, 'w', encoding='utf-8') as f:
        f.write(layout)

# 2. Update App.tsx
app_path = r'web\src\App.tsx'
with open(app_path, 'r', encoding='utf-8') as f:
    app_tsx = f.read()

if 'GithubRepos' not in app_tsx:
    app_tsx = app_tsx.replace("const Settings = lazy(()", "const GithubRepos = lazy(() => import('./pages/app/GithubRepos'))\nconst Settings = lazy(()")
    app_tsx = app_tsx.replace('<Route path="settings" element={<Settings />} />', 
                              '<Route path="github" element={<GithubRepos />} />\n              <Route path="settings" element={<Settings />} />')
    with open(app_path, 'w', encoding='utf-8') as f:
        f.write(app_tsx)

# 3. Create GithubRepos.tsx
github_repos_path = r'web\src\pages\app\GithubRepos.tsx'
if not os.path.exists(github_repos_path):
    with open(github_repos_path, 'w', encoding='utf-8') as f:
        f.write("""import { useState, useEffect } from 'react'
import { Github, Folder, ExternalLink, RefreshCw, X } from 'lucide-react'
import { FadeIn } from '../../components/Animations'

export default function GithubRepos() {
  const [repos, setRepos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')

  useEffect(() => {
    const t = localStorage.getItem('github_pat')
    if (t) setToken(t)
    fetchRepos(t || '')
  }, [])

  const fetchRepos = async (t: string) => {
    if (!t) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
        headers: { Authorization: `Bearer ${t}`, Accept: 'application/vnd.github.v3+json' }
      })
      if (!res.ok) throw new Error('Failed to fetch repositories')
      const data = await res.json()
      setRepos(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center">
        <Github size={48} className="text-gray-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">Connect GitHub</h2>
        <p className="text-gray-400 mb-6 max-w-md">You need to add a Personal Access Token in your Settings to view and access your remote repositories here.</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Github className="text-synapse-400" /> Remote Repositories
          </h1>
          <p className="text-sm text-gray-400 mt-1">Access and act on your GitHub repositories directly</p>
        </div>
        <button onClick={() => fetchRepos(token)} className="btn-secondary p-2">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={16}/></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {repos.map((repo, i) => (
          <FadeIn key={repo.id} delay={0.05 * i}>
            <div className="glass-card p-5 rounded-2xl hover:border-synapse-500/30 transition-all group flex flex-col h-full">
              <div className="flex items-start justify-between mb-3">
                <a href={repo.html_url} target="_blank" rel="noreferrer" className="font-semibold text-white group-hover:text-synapse-400 transition-colors flex items-center gap-2 truncate">
                  <Folder size={18} className="text-gray-400" />
                  <span className="truncate">{repo.name}</span>
                </a>
                <ExternalLink size={14} className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-grow">{repo.description || 'No description provided.'}</p>
              <div className="flex items-center text-xs text-gray-500 gap-4 mt-auto">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-synapse-500"></div> {repo.language || 'Mixed'}</span>
                <span>{new Date(repo.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  )
}
""")

# 4. Patch Settings.tsx
settings_path = r'web\src\pages\app\Settings.tsx'
with open(settings_path, 'r', encoding='utf-8') as f:
    settings = f.read()

if 'github_pat' not in settings:
    # We will inject the state and save binding immediately after `<div className="space-y-6">`
    settings = settings.replace("import { FadeIn } from '../../components/Animations'", 
                                "import { FadeIn } from '../../components/Animations'\nimport { Github, Globe, Lock } from 'lucide-react'")
    
    state_injection = """  const [githubToken, setGithubToken] = useState(localStorage.getItem('github_pat') || '')
  
  const saveGithubToken = () => {
    localStorage.setItem('github_pat', githubToken)
    alert('GitHub Token Saved')
  }
"""
    settings = re.sub(r'(const \[copied.*?;\n)', r'\1' + state_injection, settings)
    
    ui_block = """
          {/* GitHub Integration */}
          <div className="glass-card p-6 rounded-2xl mb-6 border-l-[3px] border-[#3fb950]">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Github size={20} className="text-[#3fb950]"/> GitHub Integration
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Add a Personal Access Token to explore your repos and grant agents remote control.
            </p>
            <div className="space-y-3">
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                className="input w-full font-mono text-sm"
              />
              <button onClick={saveGithubToken} className="btn-primary flex items-center gap-2 bg-[#3fb950] hover:bg-[#2ea043]">
                <Lock size={16}/> Save Token
              </button>
            </div>
          </div>
"""
    settings = re.sub(r'(<div className="max-w-3xl mx-auto space-y-6">)', r'\1\n' + ui_block, settings)
    with open(settings_path, 'w', encoding='utf-8') as f:
        f.write(settings)

print("All GitHub integrations UI patched successfully.")
