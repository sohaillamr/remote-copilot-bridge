import re

with open('src/pages/Pair.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r"const pairUrl = pairToken != null \? \$\{window\.location\.origin\}/pair\?token=\$\{pairToken\} : ''\n\s*\? \$\{pairToken\.slice\(0, 4\)\}-\$\{pairToken\.slice\(4, 8\)\}-\$\{pairToken\.slice\(8, 12\)\}\n\s*: ''"
text = re.sub(pattern, "const pairUrl = ''", text)

with open('src/pages/Pair.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
