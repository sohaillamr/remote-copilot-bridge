import os
import re

settings_path = r'src\pages\app\Settings.tsx'
with open(settings_path, 'r', encoding='utf-8') as f:
    settings = f.read()

state_injection = """
  const [githubToken, setGithubToken] = useState(localStorage.getItem('github_pat') || '')
  
  const saveGithubToken = () => {
    if (!githubToken) {
      localStorage.removeItem('github_pat')
    } else {
      localStorage.setItem('github_pat', githubToken)
    }
    alert('GitHub Token Saved!')
  }
"""

if "const saveGithubToken" not in settings:
    settings = settings.replace("const [copied, setCopied] = useState(false)", "const [copied, setCopied] = useState(false)\n" + state_injection)

with open(settings_path, 'w', encoding='utf-8') as f:
    f.write(settings)

print("State added")
