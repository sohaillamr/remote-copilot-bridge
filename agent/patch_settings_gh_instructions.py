import os

settings_path = r'src\pages\app\Settings.tsx'
if not os.path.exists(settings_path):
    settings_path = r'..\web\src\pages\app\Settings.tsx'

with open(settings_path, 'r', encoding='utf-8') as f:
    text = f.read()

old_block = """          <p className="text-xs text-gray-400 mb-4">Add your Personal Access Token to browse repositories and allow your agents to manage your git workflows remotely.</p>
          <div className="space-y-4">"""

new_block = """          <p className="text-xs text-gray-400 mb-4">Add your Personal Access Token to browse repositories and allow your agents to manage your git workflows remotely.</p>
          
          <div className="mb-4 p-4 bg-white/[0.03] rounded-xl border border-white/[0.05]">
            <h4 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">How to get your token:</h4>
            <ol className="text-[11px] text-gray-400 space-y-2 list-decimal list-inside ml-2">
              <li>Go to your <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-[#3fb950] hover:underline">GitHub Developer Settings</a></li>
              <li>Click <strong>Generate new token (classic)</strong></li>
              <li>Give it a name and select the <strong>repo</strong> scope checkbox</li>
              <li>Click Generate, copy the secret, and paste it here</li>
            </ol>
          </div>

          <div className="space-y-4">"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open(settings_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Injected GitHub instructions in Settings")
else:
    print("Could not find the block to replace in Settings.tsx")
    print(repr(text[:200]))
