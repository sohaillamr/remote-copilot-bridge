import os
import re

app_layout_path = r'web\src\layouts\AppLayout.tsx'
with open(app_layout_path, 'r', encoding='utf-8') as f:
    layout = f.read()

layout = layout.replace("\\'lucide-react\\'", "'lucide-react'")

with open(app_layout_path, 'w', encoding='utf-8') as f:
    f.write(layout)
