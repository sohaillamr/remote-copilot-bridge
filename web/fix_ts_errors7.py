with open('src/pages/Pair.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if line.strip().startswith('const pairUrl =') or line.strip().startswith('? ${pairToken') or line.strip() == ": ''" and i < 25:
        if i > 15 and i < 22:
            continue
    new_lines.append(line)

with open('src/pages/Pair.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
