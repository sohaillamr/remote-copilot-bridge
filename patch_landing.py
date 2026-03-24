import os

file_path = 'src/pages/Landing.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("{yearly ? '$19' : '$24'}", "{yearly ? '$10' : '$12'}")
content = content.replace("{yearly ? 'Billed annually ($228/seat) • save $60' : 'Cancel anytime'}", "{yearly ? 'Billed annually ($120/seat) • save $24' : 'Cancel anytime'}")

old_p = 'Ship faster at your desk, and triage critical production issues from your phone—even during dinner. Connect securely to your local VS Code environment, run CLI commands, and chat with your codebase. The dream tool for elite developers and agile teams.'
new_p = 'Full-fidelity remote development environments streamed directly to your pocket. Zero latency, total access.'

if old_p in content:
    content = content.replace(old_p, new_p)
    print("Hero updated")
else:
    print("Could not find hero paragraph text")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Pricing updated")
