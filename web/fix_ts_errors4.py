import re

with open('src/pages/app/Chat.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace("const [searchTerm, setSearchTerm] = useState('')", "")

with open('src/pages/app/Chat.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

with open('src/pages/Pair.tsx', 'r', encoding='utf-8') as f:
    p = f.read()

# Fix Pair.tsx lines
p = p.replace("const pairUrl = pairToken ?", "const pairUrl = pairToken != null ?")
p = p.replace("? ${pairToken.slice(0, 4)}--", "? ${pairToken?.slice(0, 4)}--")

with open('src/pages/Pair.tsx', 'w', encoding='utf-8') as f:
    f.write(p)
