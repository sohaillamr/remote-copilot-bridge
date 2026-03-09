"""Patch the web-side context and Chat.tsx for model selection + error handling."""

# ── 1. Patch AgentRelayContext.tsx ──

path = r"C:\Users\dell\Desktop\synapse\web\src\contexts\AgentRelayContext.tsx"
with open(path, "r", encoding="utf-8") as f:
    ctx = f.read()

# 1a. Add modelChoices to context type
ctx = ctx.replace(
    "  detectedTools: DetectedTool[]\n  agentWorkDir: string",
    "  detectedTools: DetectedTool[]\n  modelChoices: string[]\n  agentWorkDir: string",
)

# 1b. Update sendPrompt signature to include model
ctx = ctx.replace(
    "  sendPrompt: (tool: string, text: string, conversationId: string, timeout?: number) => Promise<void>",
    "  sendPrompt: (tool: string, text: string, conversationId: string, timeout?: number, model?: string) => Promise<void>",
)

# 1c. Add modelChoices state
ctx = ctx.replace(
    "  const [agentWorkDir, setAgentWorkDir] = useState('')",
    "  const [agentWorkDir, setAgentWorkDir] = useState('')\n  const [modelChoices, setModelChoices] = useState<string[]>([])",
)

# 1d. Capture model_choices from pong
ctx = ctx.replace(
    "      if (p?.work_dir) setAgentWorkDir(p.work_dir)",
    "      if (p?.work_dir) setAgentWorkDir(p.work_dir)\n      if (Array.isArray(p?.model_choices)) setModelChoices(p.model_choices)",
)

# 1e. Update sendPrompt implementation with model param + error handling
ctx = ctx.replace(
    """  const sendPrompt = useCallback(async (
    tool: string, text: string, conversationId: string, timeout?: number
  ) => {
    if (!channelRef.current) return
    setOutputLines([])
    setLastResult(null)
    setIsWaiting(true)
    await channelRef.current.send({
      type: 'broadcast', event: 'prompt',
      payload: { tool, text, conversation_id: conversationId, timeout },
    })
  }, [])""",
    """  const sendPrompt = useCallback(async (
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
  }, [addToast])""",
)

# 1f. Add modelChoices to provider value
ctx = ctx.replace(
    "        detectedTools,\n        agentWorkDir,",
    "        detectedTools,\n        modelChoices,\n        agentWorkDir,",
)

with open(path, "w", encoding="utf-8") as f:
    f.write(ctx)
print("AgentRelayContext.tsx patched")


# ── 2. Patch Chat.tsx ──

path = r"C:\Users\dell\Desktop\synapse\web\src\pages\app\Chat.tsx"
with open(path, "r", encoding="utf-8") as f:
    chat = f.read()

# 2a. Add modelChoices + selectedModel to the useRelay destructure
chat = chat.replace(
    """    sendGit,
    detectedTools,
    clearOutput,
  } = useRelay()""",
    """    sendGit,
    detectedTools,
    modelChoices,
    clearOutput,
  } = useRelay()""",
)

# 2b. Add selectedModel state after copiedMsgId
chat = chat.replace(
    "  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)",
    "  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)\n  const [selectedModel, setSelectedModel] = useState<string>('')",
)

# 2c. Update sendPrompt call to include model
chat = chat.replace(
    "    sendPrompt(selectedTool, prompt, convId || crypto.randomUUID())",
    "    sendPrompt(selectedTool, prompt, convId || crypto.randomUUID(), undefined, selectedModel || undefined)",
)

# 2d. Add try-catch around the supabase insert in handleSend
chat = chat.replace(
    """    let convId = conversationId
    if (user) {
      if (!convId) {
        const { data } = await supabase
          .from('conversations')
          .insert({ user_id: user.id, title: prompt.slice(0, 100), tool: selectedTool })
          .select()
          .single()
        convId = data?.id
        if (convId) {
          navigate(`/app/chat/${convId}`, { replace: true })
          loadConversations()
        }
      }
      if (convId) {
        await supabase.from('messages').insert({
          conversation_id: convId,
          role: 'user',
          content: prompt,
        })
      }
    }""",
    """    let convId = conversationId
    if (user) {
      try {
        if (!convId) {
          const { data } = await supabase
            .from('conversations')
            .insert({ user_id: user.id, title: prompt.slice(0, 100), tool: selectedTool })
            .select()
            .single()
          convId = data?.id
          if (convId) {
            navigate(`/app/chat/${convId}`, { replace: true })
            loadConversations()
          }
        }
        if (convId) {
          await supabase.from('messages').insert({
            conversation_id: convId,
            role: 'user',
            content: prompt,
          })
        }
      } catch (err) {
        console.error('DB error:', err)
      }
    }""",
)

with open(path, "w", encoding="utf-8") as f:
    f.write(chat)
print("Chat.tsx patched")
