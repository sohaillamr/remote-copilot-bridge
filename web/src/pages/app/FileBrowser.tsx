import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useRelay } from '../../contexts/AgentRelayContext'
import {
  Folder, File, ArrowLeft, RefreshCw, Home, ChevronRight,
  FileText, AlertCircle, FolderOpen, Zap, Check,
} from 'lucide-react'

interface FileEntry {
  name: string
  is_dir: boolean
  size?: number
}

export default function FileBrowser() {
  const { isConnected, sendListFiles, sendReadFile, sendSetWorkdir } = useRelay()
  const navigate = useNavigate()

  const [currentPath, setCurrentPath] = useState('.')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [viewingFile, setViewingFile] = useState<{ name: string; content: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingWorkdir, setSettingWorkdir] = useState(false)
  const [workdirSet, setWorkdirSet] = useState(false)

  // Request tracking
  const requestIdRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Parse breadcrumbs from currentPath
  const breadcrumbs = currentPath === '.'
    ? []
    : currentPath.replace(/\\/g, '/').split('/').filter(Boolean)

  // Event listeners
  useEffect(() => {
    function handleFilesResult(e: Event) {
      const detail = (e as CustomEvent).detail
      if (!detail) return
      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      if (detail.error) {
        setError(detail.error)
        setFiles([])
        setLoading(false)
        return
      }

      const items = detail.items || detail.files || (Array.isArray(detail) ? detail : [])
      setFiles(items)
      if (detail.path) setCurrentPath(detail.path)
      setError(null)
      setLoading(false)
    }

    function handleReadResult(e: Event) {
      const detail = (e as CustomEvent).detail
      if (!detail) return
      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      if (detail.error) {
        setError(detail.error)
        setLoading(false)
        return
      }

      setViewingFile({
        name: detail?.filename || detail?.name || detail?.path || 'Unknown',
        content: detail?.content || 'No content',
      })
      setError(null)
      setLoading(false)
    }

    function handleWorkdirChanged(e: Event) {
      const detail = (e as CustomEvent).detail
      setSettingWorkdir(false)
      if (detail?.new) {
        setWorkdirSet(true)
        setTimeout(() => {
          setWorkdirSet(false)
          navigate('/app/chat')
        }, 600)
      }
    }

    window.addEventListener('synapse:files_result', handleFilesResult)
    window.addEventListener('synapse:read_result', handleReadResult)
    window.addEventListener('synapse:workdir_changed', handleWorkdirChanged)
    return () => {
      window.removeEventListener('synapse:files_result', handleFilesResult)
      window.removeEventListener('synapse:read_result', handleReadResult)
      window.removeEventListener('synapse:workdir_changed', handleWorkdirChanged)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [navigate])

  // Load on connect
  useEffect(() => {
    if (isConnected) browse('.')
  }, [isConnected])

  // Navigation
  const browse = useCallback((path: string) => {
    setLoading(true)
    setViewingFile(null)
    setError(null)
    setCurrentPath(path)
    requestIdRef.current++
    sendListFiles(path)

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          setError('Request timed out. Click Refresh to retry.')
          return false
        }
        return prev
      })
    }, 10_000)
  }, [sendListFiles])

  const openFile = useCallback((entry: FileEntry) => {
    if (entry.is_dir) {
      const sep = currentPath.includes('\\') ? '\\' : '/'
      const newPath = currentPath === '.' ? entry.name : `${currentPath}${sep}${entry.name}`
      browse(newPath)
    } else {
      setLoading(true)
      setError(null)
      const sep = currentPath.includes('\\') ? '\\' : '/'
      const filePath = currentPath === '.' ? entry.name : `${currentPath}${sep}${entry.name}`
      sendReadFile(filePath)

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setLoading(prev => {
          if (prev) {
            setError('File read timed out. Try again.')
            return false
          }
          return prev
        })
      }, 10_000)
    }
  }, [currentPath, browse, sendReadFile])

  const goUp = useCallback(() => {
    if (currentPath === '.') return
    const parts = currentPath.replace(/\\/g, '/').split('/')
    parts.pop()
    browse(parts.length === 0 ? '.' : parts.join('/'))
  }, [currentPath, browse])

  const goToBreadcrumb = useCallback((index: number) => {
    const path = breadcrumbs.slice(0, index + 1).join('/')
    browse(path)
  }, [breadcrumbs, browse])

  const handleSetWorkdir = useCallback(() => {
    if (currentPath === '.') return
    setSettingWorkdir(true)
    sendSetWorkdir(currentPath)
    setTimeout(() => setSettingWorkdir(false), 8000)
  }, [currentPath, sendSetWorkdir])

  function formatSize(bytes?: number) {
    if (bytes == null) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const sortedFiles = [...files].sort((a, b) => {
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Folder className="text-gray-600" size={24} />
          </div>
          <p className="text-gray-400 text-sm">Agent is offline</p>
          <p className="text-xs text-gray-600 mt-1">Start your agent to browse files</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <FolderOpen size={18} className="text-synapse-400" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Files</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSetWorkdir}
            disabled={currentPath === '.' || settingWorkdir}
            className="btn-secondary text-xs px-2 sm:px-3 py-1.5 hidden sm:inline-flex items-center gap-1.5 disabled:opacity-30"
          >
            {workdirSet ? (
              <><Check size={12} className="text-emerald-400" /> Done</>
            ) : settingWorkdir ? (
              <><Zap size={12} className="animate-pulse" /> Setting...</>
            ) : (
              <>Set as Workdir</>
            )}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => browse(currentPath)}
            disabled={loading}
            className="btn-secondary text-xs p-1.5 disabled:opacity-30"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </motion.button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-gray-500 overflow-x-auto font-mono pb-1 scrollbar-hide">
        <button onClick={() => browse('.')} className="hover:text-white transition-colors shrink-0" title="Agent root">
          <Home size={13} />
        </button>
        {breadcrumbs.map((crumb, i) => (
          <div key={i} className="flex items-center gap-1 shrink-0">
            <ChevronRight size={10} className="text-gray-700" />
            <button
              onClick={() => goToBreadcrumb(i)}
              className="hover:text-white transition-colors truncate max-w-[150px]"
              title={crumb}
            >
              {crumb}
            </button>
          </div>
        ))}
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/10 text-red-400 text-xs"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={() => { setError(null); browse(currentPath) }}
              className="shrink-0 px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors text-[11px] font-medium"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File view or directory listing */}
      {viewingFile ? (
        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setViewingFile(null); setError(null) }}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <ArrowLeft size={13} /> Back
          </motion.button>
          <div className="glass-card rounded-xl p-3 sm:p-5">
            <div className="flex items-center gap-2 mb-4 text-gray-500">
              <FileText size={15} />
              <span className="font-mono text-xs truncate">{viewingFile.name}</span>
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto text-gray-400 max-h-[65vh] overflow-y-auto leading-relaxed">
              {viewingFile.content}
            </pre>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          {currentPath !== '.' && (
            <button
              onClick={goUp}
              className="w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 hover:bg-white/[0.03] border-b border-white/[0.04] text-gray-500 transition-colors"
            >
              <ArrowLeft size={14} />
              <span className="text-xs">..</span>
            </button>
          )}

          {loading ? (
            <div className="divide-y divide-white/[0.04]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 sm:px-4 py-2.5">
                  <div className="w-4 h-4 rounded bg-white/[0.04] animate-pulse" />
                  <div className="h-3.5 rounded bg-white/[0.04] animate-pulse" style={{ width: `${80 + Math.random() * 120}px` }} />
                  <div className="ml-auto h-3 w-10 rounded bg-white/[0.04] animate-pulse" />
                </div>
              ))}
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-xs">Empty directory</div>
          ) : (
            sortedFiles.map((entry) => (
              <button
                key={entry.name}
                onClick={() => openFile(entry)}
                className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 hover:bg-white/[0.03] border-b border-white/[0.04] last:border-0 text-left transition-colors group"
              >
                {entry.is_dir ? (
                  <Folder className="text-blue-400/70 shrink-0 group-hover:text-blue-400" size={15} />
                ) : (
                  <File className="text-gray-600 shrink-0 group-hover:text-gray-400" size={15} />
                )}
                <span className="flex-1 truncate text-xs sm:text-sm text-gray-300 group-hover:text-white transition-colors">
                  {entry.name}
                </span>
                {!entry.is_dir && (
                  <span className="text-[10px] text-gray-700 font-mono shrink-0">{formatSize(entry.size)}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}