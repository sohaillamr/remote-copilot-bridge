with open('src/pages/Pair.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip().startswith('? ${pairToken.slice'):
        continue
    new_lines.append(line)

with open('src/pages/Pair.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
