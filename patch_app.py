import os

file_path = r'web\src\App.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("const Settings = lazy(() => import('./pages/app/Settings'))",
                    "const Settings = lazy(() => import('./pages/app/Settings'))\nconst TeamDashboard = lazy(() => import('./pages/app/TeamDashboard'))")

text = text.replace('<Route path="settings" element={<Settings />} />',
                    '<Route path="settings" element={<Settings />} />\n              <Route path="team" element={<TeamDashboard />} />')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("App.tsx patched successfully!")
