import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface OutputLine {
  line: string
  timestamp: number
}

interface ToolResult {
  conversation_id: string
  stdout: string
  stderr: string
  exit_code: number
  duration: number
  timed_out: boolean
  tool: string
  success: boolean
}

export function useAgentRelay() {
  const { user } = useAuth()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [outputLines, setOutputLines] = useState<OutputLine[]>([])
  const [lastResult, setLastResult] = useState<ToolResult | null>(null)
  const [isWaiting, setIsWaiting] = useState(false)

  // Connect to the user's Broadcast channel
  useEffect(() => {
    if (!user) return

    const channel = supabase.channel(`agent:${user.id}`, {
      config: { broadcast: { self: false }, private: true },
    })

    channel.on('broadcast', { event: 'output' }, ({ payload }) => {
      setOutputLines(prev => [...prev, payload as OutputLine])
    })

    channel.on('broadcast', { event: 'result' }, ({ payload }) => {
      setLastResult(payload as ToolResult)
      setIsWaiting(false)
    })

    channel.on('broadcast', { event: 'error' }, ({ payload }) => {
      console.error('Agent error:', payload)
      setIsWaiting(false)
    })

    channel.on('broadcast', { event: 'files_result' }, ({ payload }) => {
      // Dispatch custom event for the file browser component
      window.dispatchEvent(new CustomEvent('synapse:files_result', { detail: payload }))
    })

    channel.on('broadcast', { event: 'read_result' }, ({ payload }) => {
      window.dispatchEvent(new CustomEvent('synapse:read_result', { detail: payload }))
    })

    channel.on('broadcast', { event: 'cancel_result' }, ({ payload }) => {
      setIsWaiting(false)
      window.dispatchEvent(new CustomEvent('synapse:cancel_result', { detail: payload }))
    })

    channel.on('broadcast', { event: 'pong' }, ({ payload }) => {
      window.dispatchEvent(new CustomEvent('synapse:pong', { detail: payload }))
    })

    channel.on('broadcast', { event: 'workdir_changed' }, ({ payload }) => {
      window.dispatchEvent(new CustomEvent('synapse:workdir_changed', { detail: payload }))
    })

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED')
    })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [user])

  // Send a prompt to the agent
  const sendPrompt = useCallback(async (
    tool: string,
    text: string,
    conversationId: string,
    timeout?: number
  ) => {
    if (!channelRef.current) return
    setOutputLines([])
    setLastResult(null)
    setIsWaiting(true)

    await channelRef.current.send({
      type: 'broadcast',
      event: 'prompt',
      payload: { tool, text, conversation_id: conversationId, timeout },
    })
  }, [])

  // Cancel current operation
  const sendCancel = useCallback(async () => {
    if (!channelRef.current) return
    await channelRef.current.send({
      type: 'broadcast',
      event: 'cancel',
      payload: {},
    })
  }, [])

  // List files
  const sendListFiles = useCallback(async (path?: string) => {
    if (!channelRef.current) return
    await channelRef.current.send({
      type: 'broadcast',
      event: 'files',
      payload: { path },
    })
  }, [])

  // Read file
  const sendReadFile = useCallback(async (path: string, startLine?: number, endLine?: number) => {
    if (!channelRef.current) return
    await channelRef.current.send({
      type: 'broadcast',
      event: 'read',
      payload: { path, start_line: startLine, end_line: endLine },
    })
  }, [])

  // Run shell command
  const sendShell = useCallback(async (command: string, conversationId: string) => {
    if (!channelRef.current) return
    setOutputLines([])
    setLastResult(null)
    setIsWaiting(true)

    await channelRef.current.send({
      type: 'broadcast',
      event: 'shell',
      payload: { command, conversation_id: conversationId },
    })
  }, [])

  // Change working directory
  const sendSetWorkdir = useCallback(async (path: string) => {
    if (!channelRef.current) return
    await channelRef.current.send({
      type: 'broadcast',
      event: 'set_workdir',
      payload: { path },
    })
  }, [])

  // Ping agent
  const sendPing = useCallback(async () => {
    if (!channelRef.current) return
    await channelRef.current.send({
      type: 'broadcast',
      event: 'ping',
      payload: {},
    })
  }, [])

  return {
    isConnected,
    outputLines,
    lastResult,
    isWaiting,
    sendPrompt,
    sendCancel,
    sendListFiles,
    sendReadFile,
    sendShell,
    sendSetWorkdir,
    sendPing,
    clearOutput: () => { setOutputLines([]); setLastResult(null) },
  }
}
