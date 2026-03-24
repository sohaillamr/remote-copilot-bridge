import re

with open('audit_report.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('- **Team Seat & Member Management:**', '- ? **Team Seat & Member Management (Implemented):** ')
content = content.replace('- **Agent Lifecycle Interactivity:**', '- ? **Agent Lifecycle Interactivity (Implemented):** ')

with open('audit_report.md', 'w', encoding='utf-8') as f:
    f.write(content)
