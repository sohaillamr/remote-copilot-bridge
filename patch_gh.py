import os

fp_settings = r'web\src\pages\app\Settings.tsx'
with open(fp_settings, 'r', encoding='utf-8') as f:
    t = f.read()

t = t.replace("import { Trash2,", "import { Trash2, Globe, Lock,")

gh_block = """          {/* GitHub Integration */}
          <div className="glass-card p-6 rounded-2xl border-l-[3px] border-[#3fb950] mb-6">
            <div className="flex flex-col md:flex-row gap-6 relative">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">GitHub Integration</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Connect your GitHub account to allow agents to clone, modify, and push to your repositories directly.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                      Personal Access Token (classic or fine-grained)
                    </label>
                    <input
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="input w-full focus:ring-2 focus:ring-[#3fb950]/50 transition-all font-mono text-sm placeholder:text-gray-600"
                    />
                  </div>
                  
                  <button className="btn-primary py-2 px-6 text-sm flex items-center gap-2 bg-[#3fb950] hover:bg-[#2ea043]">
                    <Lock size={16} /> Save Token
                  </button>
                </div>
              </div>
            </div>
          </div>
"""

if 'GitHub Integration' not in t:
    t = t.replace('{/* General Actions */}', gh_block + '\n          {/* General Actions */}')

with open(fp_settings, 'w', encoding='utf-8') as f:
    f.write(t)


fp_team = r'web\src\pages\app\TeamDashboard.tsx'
with open(fp_team, 'r', encoding='utf-8') as f:
    tt = f.read()

tt = tt.replace("import { Users", "import { Users, Lock, Globe")

gh_team_block = """
              {/* GitHub Integration */}
              <div className="glass-card p-6 rounded-2xl border-l-[3px] border-[#3fb950] mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Team GitHub Integration</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Connect a GitHub account to provide all team members access to remote repositories via the agents.
                    </p>
                  </div>
                </div>
                <div className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                      Personal Access Token
                    </label>
                    <input
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="input w-full focus:ring-2 focus:ring-[#3fb950]/50 transition-all font-mono text-sm placeholder:text-gray-600"
                    />
                  </div>
                  <button className="btn-primary py-2 px-6 text-sm flex items-center gap-2 bg-[#3fb950] hover:bg-[#2ea043]">
                    <Lock size={16} /> Save Team Token
                  </button>
                </div>
              </div>
"""

if 'Team GitHub Integration' not in tt:
    tt = tt.replace('          <div className="grid grid-cols-1 gap-6">', gh_team_block + '\n          <div className="grid grid-cols-1 gap-6">')

with open(fp_team, 'w', encoding='utf-8') as f:
    f.write(tt)

print("Settings patched")
