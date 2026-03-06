import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAgentRelay } from '../../hooks/useAgentRelay'
import { Folder, File, ArrowLeft, RefreshCw, Home, ChevronRight, FileText } from 'lucide-react'
import { FadeIn } from '../../components/Animations'

interface FileEntry {
  name: string
  is_dir: boolean
  size?: number
  modified?: string
}

export default function FileBrowser() {
  const { isConnected, sendListFiles, sendReadFile, sendSetWorkdir } = useAgentRelay()

  const [currentPath, setCurrentPath] = useState('.')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [viewingFile, setViewingFile] = useState<{ name: string; content: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([])

  useEffect(() => {
    function handleFilesResult(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.files) setFiles(detail.files)
      else if (Array.isArray(detail)) setFiles(detail)
      setLoading(false)
    }
    function handleReadResult(e: Event) {
      const detail = (e as CustomEvent).detail
      setViewingFile(detail)
      setLoading(false)
    }
    window.addEventListener('synapse:files_result', handleFilesResult)
    window.addEventListener('synapse:read_result', handleReadResult)
    return () => {
      window.removeEventListener('synapse:files_result', handleFilesResult)
      window.removeEventListener('synapse:read_result', handleReadResult)
    }
  }, [])

  useEffect(() => {
    if (isConnected) browse('.')
  }, [isConnected])

  function browse(path: string) {
    setLoading(true)
    setViewingFile(null)
    setCurrentPath(path)
    if (path === '.') setBreadcrumbs([])
    else setBreadcrumbs(path.replace(/\\/g, '/').split('/').filter(Boolean))
    sendListFiles(path)
  }

  function openFile(entry: FileEntry) {
    if (entry.is_dir) {
      const newPath = currentPath === '.' ? entry.name : `${currentPath}/${entry.name}`
      browse(newPath)
    } else {
      setLoading(true)
      const filePath = currentPath === '.' ? entry.name : `${currentPath}/${entry.name}`
      sendReadFile(filePath)
    }
  }

  function goUp() {
    if (currentPath === '.') return
    const parts = currentPath.replace(/\\/g, '/').split('/')
    parts.pop()
    browse(parts.length === 0 ? '.' : parts.join('/'))
  }

  function goToBreadcrumb(index: number) {
    const path = breadcrumbs.slice(0, index + 1).join('/')
    browse(path)
  }

  function formatSize(bytes?: number) {
    if (bytes == null) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <FadeIn>
          <div className="text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Folder className="text-gray-600" size={24} />
            </div>
            <p className="text-gray-400 text-sm">Agent is offline</p>
            <p className="text-xs text-gray-600 mt-1">Start your agent to browse files</p>
          </div>
        </FadeIn>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 max-w-5xl">
      <FadeIn>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">File Browser</h1>
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => sendSetWorkdir(currentPath)}
              className="btn-secondary text-xs px-2 sm:px-3 py-1.5 hidden sm:inline-flex"
            >
              Set as Workdir
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => browse(currentPath)}
              className="btn-secondary text-xs p-1.5"
            >
              <RefreshCw size={13} />
            </motion.button>
          </div>
        </div>
      </FadeIn>

      {/* Breadcrumb */}
      <FadeIn delay={0.05}>
        <div className="flex items-center gap-1 text-xs text-gray-500 overflow-x-auto font-mono pb-1 scrollbar-hide">
          <button onClick={() => browse('.')} className="hover:text-white transition-colors shrink-0">
            <Home size={13} />
          </button>
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-1 shrink-0">
              <ChevronRight size={10} className="text-gray-700" />
              <button onClick={() => goToBreadcrumb(i)} className="hover:text-white transition-colors truncate max-w-[120px]">
                {crumb}
              </button>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* File view or directory listing */}
      {viewingFile ? (
        <FadeIn>
          <div className="space-y-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setViewingFile(null)}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <ArrowLeft size={13} /> Back
            </motion.button>
            <div className="glass-card rounded-xl p-3 sm:p-5">
              <div className="flex items-center gap-2 mb-4 text-gray-500">
                <FileText size={15} />
                <span className="font-mono text-xs truncate">{viewingFile.name}</span>
              </div>
              <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto text-gray-400 max-h-[60vh] overflow-y-auto leading-relaxed">
                {viewingFile.content}
              </pre>
            </div>
          </div>
        </FadeIn>
      ) : (
        <FadeIn delay={0.1}>
          <div className="glass-card rounded-xl overflow-hidden">
            {currentPath !== '.' && (
              <button
                onClick={goUp}
                className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-white/[0.02] border-b border-white/[0.04] text-gray-500 transition-colors"
              >
                <ArrowLeft size={14} />
                <span className="text-xs">..</span>
              </button>
            )}
            {loading ? (
              <div className="text-center py-12 text-gray-600 text-xs">Loading...</div>
            ) : files.length === 0 ? (
              <div className="text-center py-12 text-gray-600 text-xs">Empty directory</div>
            ) : (
              files
                .sort((a, b) => {
                  if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1
                  return a.name.localeCompare(b.name)
                })
                .map((entry, i) => (
                  <motion.button
                    key={entry.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => openFile(entry)}
                    className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 hover:bg-white/[0.02] border-b border-white/[0.04] last:border-0 text-left transition-colors"
                  >
                    {entry.is_dir ? (
                      <Folder className="text-blue-400/70 shrink-0" size={15} />
                    ) : (
                      <File className="text-gray-600 shrink-0" size={15} />
                    )}
                    <span className="flex-1 truncate text-xs sm:text-sm text-gray-300">{entry.name}</span>
                    <span className="text-[10px] text-gray-700 font-mono shrink-0">{formatSize(entry.size)}</span>
                  </motion.button>
                ))
            )}
          </div>
        </FadeIn>
      )}
    </div>
  )
}
