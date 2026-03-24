import os
import re

app_layout_path = r'src\layouts\AppLayout.tsx'
with open(app_layout_path, 'r', encoding='utf-8') as f:
    layout = f.read()

nav_items_block = """const navItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/chat', icon: MessageSquare, label: 'Chat', end: false },
  { to: '/app/files', icon: FolderOpen, label: 'Files', end: false },
  { to: '/app/github', icon: Github, label: 'GitHub', end: false },
  { to: '/app/settings', icon: Settings, label: 'Settings', end: false },
]"""

layout = re.sub(r'const navItems = \[.*?\]', nav_items_block, layout, flags=re.DOTALL)

with open(app_layout_path, 'w', encoding='utf-8') as f:
    f.write(layout)


settings_path = r'src\pages\app\Settings.tsx'
with open(settings_path, 'r', encoding='utf-8') as f:
    settings = f.read()

settings = settings.replace("import { Github, Globe, Lock } from 'lucide-react'\n", "")
settings = settings.replace("import { FadeIn } from '../../components/Animations'", 
                                "import { FadeIn } from '../../components/Animations'\nimport { Github, Globe, Lock } from 'lucide-react'")

with open(settings_path, 'w', encoding='utf-8') as f:
    f.write(settings)


team_path = r'src\pages\app\TeamDashboard.tsx'
with open(team_path, 'r', encoding='utf-8') as f:
    team = f.read()

team = team.replace("import { Users, Lock, Globe, UserPlus, Mail, Shield, Zap, X, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react'", 
                    "import { Users, UserPlus, Mail, Shield, Zap, X, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react'")
with open(team_path, 'w', encoding='utf-8') as f:
    f.write(team)

print("Fixed imports")
