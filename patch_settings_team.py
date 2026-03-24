import re

with open('web/src/pages/app/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add the import
if "import TeamSettings from './TeamSettings'" not in content:
    content = content.replace("import { useAuth } from '../../hooks/useAuth'", "import { useAuth } from '../../hooks/useAuth'\nimport TeamSettings from './TeamSettings'")

content = re.sub(
    r'(\s*\{\/\*\s*Subscription\s*\*\/\})',
    r'\n        {/* Team Settings (If Team Plan) */}\n        {profile?.plan_tier === "team" && (\n          <TeamSettings />\n        )}\n\1',
    content
)

with open('web/src/pages/app/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Settings patched with TeamSettings!")
