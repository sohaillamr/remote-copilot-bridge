import sys
content = open('C:/Users/dell/Desktop/synapse/web/src/pages/app/Chat.tsx', 'r', encoding='utf-8').read()

old_block_1 = """    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    let convId = conversationId"""

new_block_1 = """    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    }

    // Embed recent conversation history safely
    const recentMessages = messages.slice(-6)
    let contextualPrompt = prompt
    if (recentMessages.length > 0) {
      const historyText = recentMessages
        .map(m => {
          const text = (m.content || "").length > 2000 ? m.content.slice(0, 2000) + "\\n...[truncated]" : m.content;
          return `${m.role === 'user' ? 'User' : 'Assistant'}:\\n${text}`;
        })
        .join('\\n\\n')
      contextualPrompt = `--- Conversation History ---\\n${historyText}\\n\\n--- Current Request ---\\n${prompt}`
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')

    let convId = conversationId"""

content = content.replace(old_block_1, new_block_1)

old_block_2 = "sendPrompt(selectedTool, prompt, finalConvId, undefined, selectedModel || undefined)"
new_block_2 = "sendPrompt(selectedTool, contextualPrompt, finalConvId, undefined, selectedModel || undefined)"

content = content.replace(old_block_2, new_block_2)

open('C:/Users/dell/Desktop/synapse/web/src/pages/app/Chat.tsx', 'w', encoding='utf-8').write(content)
print("done")
