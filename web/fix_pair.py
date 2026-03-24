with open('src/pages/Pair.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
lines[15] = "  const pairUrl = pairToken ? \\$\{window.location.origin\}/pair?token=\$\{pairToken\}\ : ''\n"
with open('src/pages/Pair.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
