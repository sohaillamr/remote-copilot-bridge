import re

with open('web/src/pages/app/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_loading = """            {loading ? (
              <div className="glass-card rounded-xl text-center py-10 space-y-3">
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-synapse-500/30 border-t-synapse-400 rounded-full animate-spin" />
                </div>
                <p className="text-gray-600 text-sm">Loading agents...</p>
              </div>"""

new_loading = """            {loading ? (
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                {[1, 2].map(i => (
                  <div key={i} className="glass-card p-4 sm:p-5 rounded-xl border border-white/[0.04]">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 w-24 bg-white/[0.04] rounded animate-pulse" />
                          <div className="h-3 w-16 bg-white/[0.04] rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="w-16 h-6 rounded-full bg-white/[0.04] animate-pulse" />
                    </div>
                    <div className="pt-3 flex gap-2">
                      <div className="w-full h-8 rounded bg-white/[0.04] animate-pulse" />
                      <div className="w-full h-8 rounded bg-white/[0.04] animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>"""

if old_loading in content:
    content = content.replace(old_loading, new_loading)
    with open('web/src/pages/app/Dashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Dashboard skeletons applied!")
else:
    print("Failed to find Dashboard loading string")
