import re

with open('audit_report.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('- **Keyboard Shortcuts:**', '- ? **Keyboard Shortcuts (Implemented):** ')

with open('audit_report.md', 'w', encoding='utf-8') as f:
    f.write(content)
