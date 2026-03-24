import re

with open('src/pages/Pair.tsx', 'r', encoding='utf-8') as f:
    p = f.read()

# Just delete those two lines since they are likely dead code 
# or wrap them correctly
p = re.sub(r'const pairUrl = .*?\n\s+\? \$\{pairToken\.slice\(0, 4\)\}-\$\{pairToken\.slice\(4, 8\)\}-\$\{pairToken\.slice\(8, 12\)\}\n\s+: \'\'', '', p)

with open('src/pages/Pair.tsx', 'w', encoding='utf-8') as f:
    f.write(p)
