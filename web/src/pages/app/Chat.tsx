import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { useRelay } from '../../contexts/AgentRelayContext'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { supabase } from '../../lib/supabase'
import MarkdownMessage from '../../components/MarkdownMessage'
import {
  Send, StopCircle, ChevronDown, Terminal, Mic, MicOff,
  GitBranch, Zap, Copy, Check, Plus, Clock, PanelLeftClose, PanelLeftOpen,
  Pencil, Trash2,
} from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tool?: string
  timestamp: Date
}

interface ConversationMeta {
  id: string
  title: string
  tool: string | null
  created_at: string
  updated_at: string
}

export default function Chat() {
  const { id: conversationId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    isConnected,
    agentReachable,
    outputLines,
    lastResult,
    isWaiting,
    sendPrompt,
    sendCancel,
    sendGit,
    detectedTools,
    modelChoices,
    clearOutput,
  } = useRelay()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [selectedTool, setSelectedTool] = useState('copilot')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [showGitPanel, setShowGitPanel] = useState(false)
  const [commitMsg, setCommitMsg] = useState('')
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('')

  // Conversation sidebar
  const [conversations, setConversations] = useState<ConversationMeta[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)
  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isSendingRef = useRef(false)

  // Build tools list: dynamic from agent + fallback
  const toolsList = detectedTools.length > 0
    ? detectedTools.map(t => t.name)
    : ['copilot', 'claude', 'gemini', 'codex', 'aider']

  // If selectedTool isn't in the list, reset to first
  useEffect(() => {
    if (toolsList.length > 0 && !toolsList.includes(selectedTool)) {
      setSelectedTool(toolsList[0])
    }
  }, [toolsList, selectedTool])

  // Reset selected model when tool changes
  useEffect(() => {
    setSelectedModel('')
  }, [selectedTool])

  // Get model choices for the currently selected tool
  const currentModels = modelChoices[selectedTool] || []

  const {
    isSupported: voiceSupported,
    isListening,
    transcript,
    toggleListening,
    stopListening,
    clearTranscript,
  } = useVoiceInput({
    continuous: true,
    lang: 'en-US',
    onResult: (text) => {
      setInput(prev => {
        const trimmed = prev.trim()
        return trimmed ? trimmed + ' ' + text : text
      })
    },
    onError: (err) => {
      setVoiceError(err)
      setTimeout(() => setVoiceError(null), 4000)
    },
  })

  const streamingText = outputLines.map(l => l.line).join('\n')

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Load history when conversationId changes
  useEffect(() => {
    if (conversationId) {
      // If we're in the middle of sending the first message,
      // don't clear output — the prompt is already in-flight
      if (!isSendingRef.current) {
        loadHistory(conversationId)
        clearOutput()
      }
    } else {
      setMessages([])
      clearOutput()
    }
  }, [conversationId, clearOutput])

  // Load conversations list
  useEffect(() => {
    if (user) loadConversations()
  }, [user])

  // Streaming → messages + persist assistant response to DB
  useEffect(() => {
    if (lastResult) {
      const content = lastResult.stdout || lastResult.stderr || 'No output.'
      const msgId = crypto.randomUUID()
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'streaming')
        return [
          ...filtered,
          {
            id: msgId,
            role: 'assistant',
            content,
            tool: lastResult.tool || selectedTool,
            timestamp: new Date(),
          },
        ]
      })
      // Persist assistant message to DB
      const convId = conversationId || lastResult.conversation_id
      if (convId && user) {
        supabase.from('messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content,
          tool_name: lastResult.tool || selectedTool,
          metadata: {
            exit_code: lastResult.exit_code,
            duration: lastResult.duration,
            timed_out: lastResult.timed_out,
          },
        }).then(({ error }) => {
          if (error) console.error('Failed to save assistant message:', error)
        })
      }
    }
  }, [lastResult])

  useEffect(() => {
    if (streamingText && isWaiting) {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'streaming')
        return [
          ...filtered,
          {
            id: 'streaming',
            role: 'assistant',
            content: streamingText,
            tool: selectedTool,
            timestamp: new Date(),
          },
        ]
      })
    }
  }, [streamingText, isWaiting])

  // Sync interim voice transcript
  useEffect(() => {
    if (isListening && transcript) {
      setInput(transcript)
    }
  }, [transcript, isListening])

  async function loadHistory(convId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    if (data) {
      setMessages(
        data.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          tool: m.tool_name,
          timestamp: new Date(m.created_at),
        }))
      )
    }
  }

  async function loadConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('id, title, tool, created_at, updated_at')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })
      .limit(50)
    setConversations((data as ConversationMeta[]) || [])
  }

  async function deleteConversation(convId: string) {
    await supabase.from('conversations').delete().eq('id', convId)
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (convId === conversationId) {
      navigate('/app/chat')
      setMessages([])
      clearOutput()
    }
  }

  async function renameConversation(convId: string, newTitle: string) {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    await supabase.from('conversations').update({ title: trimmed }).eq('id', convId)
    setConversations(prev =>
      prev.map(c => (c.id === convId ? { ...c, title: trimmed } : c))
    )
  }

  function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
  }

  const handleCopyMessage = useCallback((content: string, msgId: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMsgId(msgId)
    setTimeout(() => setCopiedMsgId(null), 2000)
  }, [])

  const handleNewChat = useCallback(() => {
    navigate('/app/chat')
    setMessages([])
    clearOutput()
  }, [navigate, clearOutput])

  const handleSend = useCallback(async () => {
    if (isListening) {
      stopListening()
      clearTranscript()
    }

    const prompt = input.trim()
    if (!prompt || !isConnected || isWaiting) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    let convId = conversationId

    // Create conversation in DB if needed (new chat)
    if (user && !convId) {
      try {
        const { data } = await supabase
          .from('conversations')
          .insert({ user_id: user.id, title: prompt.slice(0, 100), tool: selectedTool })
          .select()
          .single()
        convId = data?.id
      } catch (err) {
        console.error('DB error creating conversation:', err)
      }
    }

    const finalConvId = convId || crypto.randomUUID()

    // Navigate FIRST (if new conversation) so the URL updates without remounting
    if (user && convId && !conversationId) {
      isSendingRef.current = true
      navigate(`/app/chat/${convId}`, { replace: true })
      loadConversations()
    }

    // Send prompt (fire-and-forget — don't await so UI stays responsive)
    sendPrompt(selectedTool, prompt, finalConvId, undefined, selectedModel || undefined)
      .finally(() => { isSendingRef.current = false })

    // Persist to DB in background
    if (user && convId) {
      supabase.from('messages').insert({
        conversation_id: convId,
        role: 'user',
        content: prompt,
      }).then(({ error }) => {
        if (error) console.error('Failed to save user message:', error)
      })
      if (conversationId) {
        supabase.from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', convId)
          .then(() => loadConversations())
      }
    }
  }, [input, isConnected, isWaiting, user, conversationId, selectedTool, selectedModel, sendPrompt, isListening, stopListening, clearTranscript, navigate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const runGit = useCallback(async (args: string) => {
    if (!isConnected || isWaiting) return
    const label = `git ${args}`
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: label,
      tool: 'git',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    sendGit(args, crypto.randomUUID())
  }, [isConnected, isWaiting, sendGit])

  const handleCommit = useCallback(async () => {
    const msg = commitMsg.trim().replace(/["`$\\]/g, '') // sanitize
    if (!msg || !isConnected || isWaiting) return
    setCommitMsg('')
    setShowGitPanel(false)
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `git add -A && git commit -m "${msg}"`,
      tool: 'git',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    // Send as two sequential git commands
    await sendGit('add -A', crypto.randomUUID())
    // Wait for add to finish before committing
    await new Promise(resolve => setTimeout(resolve, 1000))
    await sendGit(`commit -m "${msg}"`, crypto.randomUUID())
  }, [commitMsg, isConnected, isWaiting, sendGit])

  return (
    <div className="flex h-full">
      {/* ─── Conversation Sidebar ─── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
          {/* Mobile overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          />
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed md:relative top-0 left-0 bottom-0 z-50 md:z-auto border-r border-white/[0.06] bg-[#0c0c0f]/95 md:bg-[#0c0c0f]/60 backdrop-blur-xl md:backdrop-blur-sm flex flex-col overflow-hidden shrink-0"
          >
            <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 tracking-wide uppercase">History</span>
              <button onClick={handleNewChat} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors" title="New chat">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {conversations.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-6">No conversations yet</p>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => { if (editingConvId !== conv.id) { navigate(`/app/chat/${conv.id}`); if (window.innerWidth < 768) setSidebarOpen(false) } }}
                    className={`group/item w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer relative ${
                      conv.id === conversationId
                        ? 'bg-synapse-600/15 text-synapse-300'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                    }`}
                  >
                    {editingConvId === conv.id ? (
                      <input
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onBlur={() => { renameConversation(conv.id, editingTitle); setEditingConvId(null) }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { renameConversation(conv.id, editingTitle); setEditingConvId(null) }
                          if (e.key === 'Escape') setEditingConvId(null)
                        }}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                        className="bg-transparent border border-synapse-500/30 rounded px-1 py-0.5 outline-none text-gray-300 w-full text-xs"
                      />
                    ) : (
                      <span className="block truncate pr-10">{conv.title || 'Untitled'}</span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] text-gray-700 mt-0.5">
                      <Clock size={9} />
                      {relativeTime(conv.updated_at || conv.created_at)}
                    </span>
                    {editingConvId !== conv.id && (
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); setEditingConvId(conv.id); setEditingTitle(conv.title || '') }}
                          className="p-1 rounded hover:bg-white/[0.08] text-gray-600 hover:text-gray-300 transition-colors"
                          title="Rename"
                        >
                          <Pencil size={10} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); if (confirm('Delete this conversation?')) deleteConversation(conv.id) }}
                          className="p-1 rounded hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Main Chat ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-b border-white/[0.06]"
        >
          {/* Top row: sidebar toggle, status, git */}
          <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSidebarOpen(v => !v)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors"
                title="Toggle history"
              >
                {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
              </button>
              <h1 className="font-semibold text-sm hidden sm:block">Chat</h1>
              <div className={`flex items-center gap-1.5 text-[11px] px-2 sm:px-2.5 py-1 rounded-full ${
                agentReachable
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : isConnected
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-red-500/10 text-red-400'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  agentReachable ? 'bg-emerald-400 animate-pulse' : isConnected ? 'bg-amber-400' : 'bg-red-400'
                }`} />
                <span className="hidden sm:inline">{agentReachable ? 'Agent Online' : isConnected ? 'Channel Only' : 'Offline'}</span>
                <span className="sm:hidden">{agentReachable ? 'Online' : isConnected ? 'Channel' : 'Off'}</span>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowGitPanel(v => !v)}
              disabled={!isConnected}
              className={`flex items-center gap-1 text-xs px-2 sm:px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-30 ${
                showGitPanel ? 'bg-orange-500/15 text-orange-400' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
              }`}
              title="Git operations"
            >
              <GitBranch size={13} />
              <span className="hidden sm:inline">Git</span>
            </motion.button>
          </div>
          {/* Bottom row: tool + model selectors (scrollable on mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 pb-2.5 sm:pb-3 overflow-x-auto scrollbar-hide">
            {/* Tool selector */}
            <div className="relative shrink-0">
              <select
                value={selectedTool}
                onChange={(e) => setSelectedTool(e.target.value)}
                className="input text-xs pr-7 appearance-none cursor-pointer py-1.5 px-2 sm:px-3 bg-[#141420] text-gray-200"
              >
                {toolsList.map(t => (
                  <option key={t} value={t} className="bg-[#141420] text-gray-200">{t}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            </div>
            {/* Model selector (shows when models available for the selected tool) */}
            {currentModels.length > 0 && (
              <div className="relative shrink-0">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="input text-xs pr-7 appearance-none cursor-pointer py-1.5 px-2 sm:px-3 max-w-[180px] sm:max-w-[200px] bg-[#141420] text-gray-200"
                  title="Select model"
                >
                  <option value="" className="bg-[#141420] text-gray-200">Default Model</option>
                  {currentModels.map(m => (
                    <option key={m} value={m} className="bg-[#141420] text-gray-200">{m}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Git Quick Actions Panel */}
        <AnimatePresence>
          {showGitPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-white/[0.06]"
            >
              <div className="px-3 sm:px-5 py-3 space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Status', cmd: 'status' },
                    { label: 'Log', cmd: 'log --oneline -10' },
                    { label: 'Diff', cmd: 'diff --stat' },
                    { label: 'Pull', cmd: 'pull' },
                    { label: 'Push', cmd: 'push' },
                    { label: 'Branch', cmd: 'branch -a' },
                    { label: 'Stash', cmd: 'stash' },
                    { label: 'Stash Pop', cmd: 'stash pop' },
                  ].map(({ label, cmd }) => (
                    <motion.button
                      key={cmd}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => runGit(cmd)}
                      disabled={isWaiting}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.06] transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-mono"
                    >
                      {label}
                    </motion.button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCommit() }}
                    placeholder="Commit message..."
                    className="input flex-1 text-xs py-1.5"
                    disabled={isWaiting}
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCommit}
                    disabled={!commitMsg.trim() || isWaiting}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                  >
                    Commit All
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 sm:py-6 space-y-3">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center py-10 sm:py-24"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-synapse-500/10 flex items-center justify-center mx-auto mb-4 sm:mb-5">
                <Terminal className="text-synapse-400" size={22} />
              </div>
              <p className="text-sm sm:text-base text-gray-400">Send a prompt to <span className="text-white font-medium">{selectedTool}</span></p>
              <p className="text-xs text-gray-600 mt-2">Make sure your agent is running on your machine</p>
              {detectedTools.length > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  Detected: {detectedTools.map(t => t.name).join(', ')}
                </p>
              )}
              {voiceSupported && (
                <p className="text-xs text-gray-600 mt-1 flex items-center justify-center gap-1">
                  <Mic size={11} /> Voice input available — tap the mic to speak
                </p>
              )}
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`relative group max-w-[88vw] sm:max-w-2xl rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${
                  msg.role === 'user'
                    ? 'bg-synapse-600/20 border border-synapse-500/10'
                    : 'glass-card'
                }`}>
                  {msg.tool && (
                    <p className="text-[10px] text-gray-600 mb-1 font-mono">{msg.tool}</p>
                  )}

                  {/* Render markdown for assistant, plain for user */}
                  {msg.role === 'assistant' ? (
                    <MarkdownMessage content={msg.content} />
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm break-words text-gray-300 leading-relaxed">
                      {msg.content}
                    </pre>
                  )}

                  {msg.id === 'streaming' && (
                    <span className="inline-block w-1.5 h-4 bg-synapse-400 animate-pulse rounded-sm ml-0.5" />
                  )}

                  {/* Copy button on assistant messages */}
                  {msg.role === 'assistant' && msg.id !== 'streaming' && (
                    <button
                      onClick={() => handleCopyMessage(msg.content, msg.id)}
                      className="absolute top-2 right-2 p-1 rounded-md bg-white/[0.04] text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all"
                      title="Copy response"
                    >
                      {copiedMsgId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Thinking animation */}
          <AnimatePresence>
            {isWaiting && !streamingText && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex justify-start"
              >
                <div className="glass-card rounded-2xl px-5 py-4 flex items-center gap-3">
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-synapse-500/20"
                      animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-synapse-400/10"
                      animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                    />
                    <motion.div
                      className="relative z-10"
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Zap size={18} className="text-synapse-400 fill-synapse-400/30" />
                    </motion.div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Thinking</span>
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        className="w-1 h-1 rounded-full bg-synapse-400"
                        animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Voice error toast */}
        <AnimatePresence>
          {voiceError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/20 text-red-300 text-xs backdrop-blur-sm max-w-[90vw] text-center"
            >
              {voiceError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="border-t border-white/[0.06] p-3 sm:p-4 pb-safe"
        >
          {/* Listening indicator */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-center gap-2 pb-2 sm:pb-3 max-w-4xl mx-auto"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-0.5 h-4">
                    {[0, 1, 2, 3, 4].map(i => (
                      <motion.div
                        key={i}
                        className="w-0.5 bg-red-400 rounded-full"
                        animate={{ height: ['4px', '16px', '4px'] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-red-300 font-medium">Listening...</span>
                  <span className="text-[10px] text-red-400/60 hidden sm:inline">Tap mic or press Enter to send</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-1.5 sm:gap-2 max-w-4xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? 'Listening\u2026 speak now'
                  : isConnected
                    ? `Ask ${selectedTool}...`
                    : 'Agent is offline'
              }
              disabled={!isConnected}
              rows={1}
              className={`input flex-1 resize-none min-h-[42px] max-h-40 transition-all text-base sm:text-sm ${
                isListening ? 'border-red-500/30 ring-1 ring-red-500/20' : ''
              }`}
            />

            {voiceSupported && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={toggleListening}
                disabled={!isConnected || isWaiting}
                title={isListening ? 'Stop recording' : 'Voice input'}
                className={`relative p-2.5 sm:p-2.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed min-w-[42px] min-h-[42px] flex items-center justify-center ${
                  isListening
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {isListening && (
                  <motion.span
                    className="absolute inset-0 rounded-xl border-2 border-red-400/40"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </motion.button>
            )}

            {isWaiting ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={sendCancel}
                className="p-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors min-w-[42px] min-h-[42px] flex items-center justify-center"
                title="Cancel"
              >
                <StopCircle size={18} />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={!input.trim() || !isConnected}
                className="p-2.5 rounded-xl bg-synapse-600 hover:bg-synapse-700 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-w-[42px] min-h-[42px] flex items-center justify-center"
              >
                <Send size={18} />
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
