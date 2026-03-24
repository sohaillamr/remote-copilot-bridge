import re

with open('src/pages/app/Chat.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
# Add filtered conversations properly
c = re.sub(
    r'const loadConversations = useCallback\(async \(\) => \{', 
    r'''const filteredConversations = conversations.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))

  const loadConversations = useCallback(async () => {''', 
    c
)
# Update UI to use filteredConversations
c = c.replace('conversations.map((conv)', 'filteredConversations.map((conv)')
# Fix input usage
search_ui = "value={searchTerm}\n                onChange={e => setSearchTerm(e.target.value)}"
if search_ui not in c:
    c = c.replace(
        'placeholder="Search chats... (Cmd+K)"', 
        'placeholder="Search chats... (Cmd+K)"\n                value={searchTerm}\n                onChange={e => setSearchTerm(e.target.value)}'
    )
with open('src/pages/app/Chat.tsx', 'w', encoding='utf-8') as f:
    f.write(c)


with open('src/pages/app/Settings.tsx', 'r', encoding='utf-8') as f:
    s = f.read()
s = s.replace('const { user, profile, signOut, refreshProfile } = useAuth()', 'const { user, profile, signOut } = useAuth()')
with open('src/pages/app/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(s)


with open('src/pages/Pair.tsx', 'r', encoding='utf-8') as f:
    p = f.read()
# Replace bad ternary in Pair.tsx 
p = re.sub(r'\? \$\{pairToken\.slice\(0, 4\)\}-\$\{pairToken\.slice\(4, 8\)\}-\$\{pairToken\.slice\(8, 12\)\}', r'''? ${pairToken?.slice(0, 4)}--''', p)
with open('src/pages/Pair.tsx', 'w', encoding='utf-8') as f:
    f.write(p)

print("done")
