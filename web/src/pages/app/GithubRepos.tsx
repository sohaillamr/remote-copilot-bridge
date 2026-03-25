import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Github, Folder, ExternalLink, RefreshCw, X } from 'lucide-react'
import { FadeIn } from '../../components/Animations'

export default function GithubRepos() {
  const navigate = useNavigate()
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
              <button
                onClick={() => navigate(`/app/chat?init_repo=${encodeURIComponent(repo.clone_url)}&repo_name=${encodeURIComponent(repo.name)}`)}
                className="mt-4 w-full py-2 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs rounded-lg flex items-center justify-center gap-2 transition-colors border border-white/[0.04] group-hover:border-synapse-500/20"
              >
                <Folder size={14} className="text-synapse-400" /> Start Working
              </button>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  )
}
