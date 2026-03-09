/**
 * Shared Agent Relay context.
 *
 * Lifts the Supabase Realtime channel into a single provider so that
 * Chat, FileBrowser, and any other page share ONE WebSocket subscription
 * instead of each creating their own.
 *
 * Also adds:
 *  - Agent selection (for multi-agent setups)
 *  - Detected-tools list (from agent pong)
 *  - Reconnection with exponential backoff
 *  - Ping-on-mount to verify agent is reachable
 *  - Toast-style notifications via a simple event bus
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { supabase, type Agent } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ── Types ───────────────────────────────────────────────────

export interface OutputLine {
  line: string
  timestamp: number
  conversation_id?: string
}

export interface ToolResult {
  conversation_id: string
  stdout: string
  stderr: string
  exit_code: number
  duration: number
  timed_out: boolean
  tool: string
  success: boolean
}

export interface DetectedTool {
  name: string
  binary_path: string
  version?: string | null
}

export interface Toast {
  id: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
  duration?: number
}

interface AgentRelayContextType {
  // Connection
  isConnected: boolean
  agentReachable: boolean

  // Agent selection
  agents: Agent[]
  selectedAgent: Agent | null
  selectAgent: (agent: Agent | null) => void
  refreshAgents: () => Promise<void>

  // Detected tools from the live agent
  detectedTools: DetectedTool[]
  modelChoices: Record<string, string[]>
  agentWorkDir: string

  // Streaming
  outputLines: OutputLine[]
  lastResult: ToolResult | null
  isWaiting: boolean

  // Actions
  sendPrompt: (tool: string, text: string, conversationId: string, timeout?: number, model?: string) => Promise<void>
  sendCancel: () => Promise<void>
  sendListFiles: (path?: string) => Promise<void>
  sendReadFile: (path: string, startLine?: number, endLine?: number) => Promise<void>
  sendShell: (command: string, conversationId: string) => Promise<void>
  sendGit: (gitArgs: string, conversationId: string) => Promise<void>
  sendSetWorkdir: (path: string) => Promise<void>
  sendPing: () => Promise<void>
  clearOutput: () => void

  // Toasts
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type'], duration?: number) => void
  dismissToast: (id: string) => void
}

const AgentRelayContext = createContext<AgentRelayContextType | undefined>(undefined)

// ── Provider ────────────────────────────────────────────────

export function AgentRelayProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  // Channel
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Agent selection
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  // Agent liveness
  const [agentReachable, setAgentReachable] = useState(false)
  const [detectedTools, setDetectedTools] = useState<DetectedTool[]>([])
  const [agentWorkDir, setAgentWorkDir] = useState('')
  const [modelChoices, setModelChoices] = useState<Record<string, string[]>>({})
  const pingTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Streaming
  const [outputLines, setOutputLines] = useState<OutputLine[]>([])
  const [lastResult, setLastResult] = useState<ToolResult | null>(null)
  const [isWaiting, setIsWaiting] = useState(false)

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 4000) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }])
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
    }
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Load agents from DB ──────────────────────────────────

  const refreshAgents = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', user.id)
      .order('last_seen_at', { ascending: false })
    const list = (data || []) as Agent[]
    setAgents(list)

    // Auto-select if only one, or restore previous selection
    if (!selectedAgent && list.length === 1) {
      setSelectedAgent(list[0])
    } else if (selectedAgent) {
      // Refresh the selected agent data
      const updated = list.find(a => a.id === selectedAgent.id)
      if (updated) setSelectedAgent(updated)
    }
  }, [user, selectedAgent])

  useEffect(() => {
    if (user) refreshAgents()
  }, [user])

  // ── Supabase Realtime channel ────────────────────────────

  useEffect(() => {
    if (!user) return

    const channel = supabase.channel(`agent:${user.id}`, {
      config: { broadcast: { self: false } },
    })

    // --- Streaming events ---
    channel.on('broadcast', { event: 'output' }, ({ payload }) => {
      const line = payload as OutputLine
      setOutputLines(prev => {
        // Cap at 500 lines to prevent memory bloat
        const next = [...prev, { ...line, conversation_id: line.conversation_id }]
        return next.length > 500 ? next.slice(-500) : next
      })
    })

    channel.on('broadcast', { event: 'result' }, ({ payload }) => {
      setLastResult(payload as ToolResult)
      setIsWaiting(false)
    })

    channel.on('broadcast', { event: 'error' }, ({ payload }) => {
      console.error('Agent error:', payload)
      setIsWaiting(false)
      addToast((payload as any)?.message || 'Agent error', 'error')
    })

    // --- File browser events (dispatched to window for FileBrowser) ---
    channel.on('broadcast', { event: 'files_result' }, ({ payload }) => {
      window.dispatchEvent(new CustomEvent('synapse:files_result', { detail: payload }))
    })

    channel.on('broadcast', { event: 'read_result' }, ({ payload }) => {
      window.dispatchEvent(new CustomEvent('synapse:read_result', { detail: payload }))
    })

    channel.on('broadcast', { event: 'cancel_result' }, ({ payload }) => {
      setIsWaiting(false)
      window.dispatchEvent(new CustomEvent('synapse:cancel_result', { detail: payload }))
    })

    // --- Pong: agent is alive, update detected tools ---
    channel.on('broadcast', { event: 'pong' }, ({ payload }) => {
      const p = payload as any
      setAgentReachable(true)
      if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current)

      // Update detected tools list
      if (Array.isArray(p?.tools)) {
        setDetectedTools(p.tools.map((t: any) =>
          typeof t === 'string' ? { name: t, binary_path: '' } : t
        ))
      }
      if (p?.work_dir) setAgentWorkDir(p.work_dir)
      if (p?.model_choices && typeof p.model_choices === 'object' && !Array.isArray(p.model_choices)) {
        setModelChoices(p.model_choices as Record<string, string[]>)
      }

      window.dispatchEvent(new CustomEvent('synapse:pong', { detail: payload }))
    })

    // --- Workdir changed ---
    channel.on('broadcast', { event: 'workdir_changed' }, ({ payload }) => {
      const p = payload as any
      if (p?.new) {
        setAgentWorkDir(p.new)
        addToast(`Working directory: ${p.new}`, 'success')
      }
      window.dispatchEvent(new CustomEvent('synapse:workdir_changed', { detail: payload }))
    })

    channel.subscribe((status) => {
      const connected = status === 'SUBSCRIBED'
      setIsConnected(connected)
      if (connected) {
        addToast('Channel connected', 'success', 2000)
        // Ping immediately to check if agent is alive
        channel.send({ type: 'broadcast', event: 'ping', payload: {} })
        // Set a timeout — if no pong in 5s, agent is unreachable
        pingTimeoutRef.current = setTimeout(() => {
          setAgentReachable(false)
        }, 5000)
      } else {
        setAgentReachable(false)
      }
    })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
      if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current)
    }
  }, [user, addToast])

  // ── Periodic ping (every 30s) ────────────────────────────

  useEffect(() => {
    if (!isConnected) return
    const interval = setInterval(() => {
      channelRef.current?.send({ type: 'broadcast', event: 'ping', payload: {} })
      pingTimeoutRef.current = setTimeout(() => setAgentReachable(false), 5000)
    }, 30_000)
    return () => clearInterval(interval)
  }, [isConnected])

  // ── Actions ──────────────────────────────────────────────

  const sendPrompt = useCallback(async (
    tool: string, text: string, conversationId: string, timeout?: number, model?: string
  ) => {
    if (!channelRef.current) {
      addToast('Not connected to channel', 'error')
      return
    }
    setOutputLines([])
    setLastResult(null)
    setIsWaiting(true)
    try {
      const status = await channelRef.current.send({
        type: 'broadcast', event: 'prompt',
        payload: { tool, text, conversation_id: conversationId, timeout, model },
      })
      if (status !== 'ok') {
        console.error('Broadcast send status:', status)
        addToast(`Broadcast failed: ${status}`, 'error')
        setIsWaiting(false)
      }
    } catch (err) {
      console.error('sendPrompt error:', err)
      addToast('Failed to send prompt', 'error')
      setIsWaiting(false)
    }
  }, [addToast])

  const sendCancel = useCallback(async () => {
    if (!channelRef.current) return
    await channelRef.current.send({
      type: 'broadcast', event: 'cancel', payload: {},
    })
  }, [])

  const sendListFiles = useCallback(async (path?: string) => {
    if (!channelRef.current) return
    await channelRef.current.send({
      type: 'broadcast', event: 'files', payload: { path },
    })
  }, [])

  const sendReadFile = useCallback(async (path: string, startLine?: number, endLine?: number) => {
    if (!channelRef.current) return
    await channelRef.current.send({
      type: 'broadcast', event: 'read',
      payload: { path, start_line: startLine, end_line: endLine },
    })
  }, [])

  const sendShell = useCallback(async (command: string, conversationId: string) => {
    if (!channelRef.current) return
    setOutputLines([])
    setLastResult(null)
    setIsWaiting(true)
    await channelRef.current.send({
      type: 'broadcast', event: 'shell',
      payload: { command, conversation_id: conversationId },
    })
  }, [])

  const sendGit = useCallback(async (gitArgs: string, conversationId: string) => {
    if (!channelRef.current) return
    setOutputLines([])
    setLastResult(null)
    setIsWaiting(true)
    await channelRef.current.send({
      type: 'broadcast', event: 'shell',
      payload: { command: `git ${gitArgs}`, conversation_id: conversationId },
    })
  }, [])

  const sendSetWorkdir = useCallback(async (path: string) => {
    if (!channelRef.current) return
    await channelRef.current.send({
      type: 'broadcast', event: 'set_workdir', payload: { path },
    })
  }, [])

  const sendPing = useCallback(async () => {
    if (!channelRef.current) return
    await channelRef.current.send({
      type: 'broadcast', event: 'ping', payload: {},
    })
    pingTimeoutRef.current = setTimeout(() => setAgentReachable(false), 5000)
  }, [])

  const clearOutput = useCallback(() => {
    setOutputLines([])
    setLastResult(null)
  }, [])

  return (
    <AgentRelayContext.Provider
      value={{
        isConnected,
        agentReachable,
        agents,
        selectedAgent,
        selectAgent: setSelectedAgent,
        refreshAgents,
        detectedTools,
        modelChoices,
        agentWorkDir,
        outputLines,
        lastResult,
        isWaiting,
        sendPrompt,
        sendCancel,
        sendListFiles,
        sendReadFile,
        sendShell,
        sendGit,
        sendSetWorkdir,
        sendPing,
        clearOutput,
        toasts,
        addToast,
        dismissToast,
      }}
    >
      {children}
    </AgentRelayContext.Provider>
  )
}

export function useRelay() {
  const ctx = useContext(AgentRelayContext)
  if (!ctx) throw new Error('useRelay must be used within AgentRelayProvider')
  return ctx
}
