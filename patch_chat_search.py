import re

with open('web/src/pages/app/Chat.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add searchTerm state
if 'const [searchTerm, setSearchTerm] = useState("")' not in content:
    content = content.replace("const [conversations, setConversations] = useState<ConversationMeta[]>([])", "const [conversations, setConversations] = useState<ConversationMeta[]>([])\n  const [searchTerm, setSearchTerm] = useState('')")

# Filter conversations
if 'const filteredConversations = conversations' not in content:
    content = content.replace("const loadConversations = useCallback(async () => {", "const filteredConversations = conversations.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))\n\n  const loadConversations = useCallback(async () => {")

# Add Search UI before conversations
search_ui = """            <div className="flex-1 overflow-y-auto min-h-0 py-2 space-y-0.5 custom-scrollbar">"""
replacement_ui = """            <div className="px-3 pb-2 pt-2">
              <input 
                id="conversation-search"
                type="text" 
                placeholder="Search chats... (Cmd+K)" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input w-full text-xs py-1.5"
              />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 py-2 space-y-0.5 custom-scrollbar">"""

if search_ui in content:
    content = content.replace(search_ui, replacement_ui)

# Update map over conversations to ilteredConversations
content = content.replace("conversations.map((conv)", "filteredConversations.map((conv)")

with open('web/src/pages/app/Chat.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Chat search added!")
