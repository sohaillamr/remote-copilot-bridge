import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { useAgentRelay } from '../../hooks/useAgentRelay'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { supabase } from '../../lib/supabase'
import { Send, StopCircle, ChevronDown, Terminal, MessageSquare, Mic, MicOff } from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tool?: string
  timestamp: Date
}

export default function Chat() {
  const { id: conversationId } = useParams()
  const { user } = useAuth()
  const {
    isConnected,
    outputLines,
    lastResult,
    isWaiting,
    sendPrompt,
    sendCancel,
  } = useAgentRelay()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [selectedTool, setSelectedTool] = useState('copilot')
  const [tools] = useState(['copilot', 'claude', 'gemini', 'codex', 'aider'])
  const [voiceError, setVoiceError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const _inputRef = useRef<HTMLTextAreaElement>(null)

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
        if (trimmed) {
          return trimmed + ' ' + text
        }
        return text
      })
    },
    onError: (err) => {
      setVoiceError(err)
      setTimeout(() => setVoiceError(null), 4000)
    },
  })

  const streamingText = outputLines.map(l => l.line).join('\n')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  useEffect(() => {
    if (conversationId) loadHistory(conversationId)
  }, [conversationId])

  useEffect(() => {
    if (lastResult) {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'streaming')
        return [
          ...filtered,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: lastResult.stdout || lastResult.stderr || 'No output.',
            tool: selectedTool,
            timestamp: new Date(),
          },
        ]
      })
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

  // Sync interim voice transcript to input field live
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
    if (user) {
      if (!convId) {
        const { data } = await supabase
          .from('conversations')
          .insert({ user_id: user.id, title: prompt.slice(0, 100), tool: selectedTool })
          .select()
          .single()
        convId = data?.id
      }
      if (convId) {
        await supabase.from('messages').insert({
          conversation_id: convId,
          role: 'user',
          content: prompt,
        })
      }
    }
    sendPrompt(selectedTool, prompt, convId || crypto.randomUUID())
  }, [input, isConnected, isWaiting, user, conversationId, selectedTool, sendPrompt, isListening, stopListening, clearTranscript])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-white/[0.06]"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <MessageSquare size={17} className="text-synapse-400 hidden sm:block" />
          <h1 className="font-semibold text-sm">Chat</h1>
          <div className={`flex items-center gap-1.5 text-[11px] px-2 sm:px-2.5 py-1 rounded-full ${
            isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {isConnected ? 'Online' : 'Offline'}
          </div>
        </div>
        <div className="relative">
          <select
            value={selectedTool}
            onChange={(e) => setSelectedTool(e.target.value)}
            className="input text-xs pr-7 appearance-none cursor-pointer py-1.5 px-2 sm:px-3"
          >
            {tools.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 sm:py-6 space-y-3">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center py-16 sm:py-24"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-synapse-500/10 flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <Terminal className="text-synapse-400" size={22} />
            </div>
            <p className="text-sm sm:text-base text-gray-400">Send a prompt to <span className="text-white font-medium">{selectedTool}</span></p>
            <p className="text-xs text-gray-600 mt-2">Make sure your agent is running on your machine</p>
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
              <div className={`max-w-[85vw] sm:max-w-2xl rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${
                msg.role === 'user'
                  ? 'bg-synapse-600/20 border border-synapse-500/10'
                  : 'glass-card'
              }`}>
                {msg.tool && (
                  <p className="text-[10px] text-gray-600 mb-1 font-mono">{msg.tool}</p>
                )}
                <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm break-words text-gray-300 leading-relaxed">
                  {msg.content}
                </pre>
                {msg.id === 'streaming' && (
                  <span className="inline-block w-1.5 h-4 bg-synapse-400 animate-pulse rounded-sm ml-0.5" />
                )}
              </div>
            </motion.div>
          ))}
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
        className="border-t border-white/[0.06] p-3 sm:p-4"
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
                      animate={{
                        height: ['4px', '16px', '4px'],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: 'easeInOut',
                      }}
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
            ref={_inputRef}
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
  )
}
