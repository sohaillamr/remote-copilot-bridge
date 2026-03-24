import os
import re

settings_path = r'src\pages\app\Settings.tsx'
with open(settings_path, 'r', encoding='utf-8') as f:
    settings = f.read()

# Add the UI block right under `<div className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">`
ui_block = """
      <FadeIn delay={0.1}>
        <div className="glass-card rounded-xl p-5 sm:p-6 border-l-[3px] border-[#3fb950]">
          <div className="flex items-center gap-2 mb-2">
            <Github size={17} className="text-[#3fb950]" />
            <h2 className="font-semibold text-sm">GitHub Integration</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">Add your Personal Access Token to browse repositories and allow your agents to manage your git workflows remotely.</p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-600 block mb-1.5">Personal Access Token</label>
              <input 
                type="password" 
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" 
                className="input w-full font-mono text-sm" 
              />
            </div>
            <button onClick={saveGithubToken} className="btn-primary text-sm px-5 py-2 flex items-center gap-2 bg-[#3fb950] hover:bg-[#2ea043]">
              <Lock size={14} /> Save GitHub Token
            </button>
          </div>
        </div>
      </FadeIn>
"""

if "GitHub Integration" not in settings:
    settings = settings.replace('<div className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">', 
                                '<div className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">\n' + ui_block)
    
if "Globe" in settings:
    settings = settings.replace("import { Github, Globe, Lock } from 'lucide-react'\n", "import { Github, Lock } from 'lucide-react'\n")

with open(settings_path, 'w', encoding='utf-8') as f:
    f.write(settings)

print("Settings fully patched with UI!")
