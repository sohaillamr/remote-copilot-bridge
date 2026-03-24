import re
with open('web/src/pages/app/Dashboard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r'\{loading \? \([\s\S]*?Loading agents\.\.\.<\/p>\s*<\/div>'
replacement = r'''{loading ? (
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
              </div>'''

new_text = re.sub(pattern, replacement, text)
print(len(text), len(new_text))
with open('web/src/pages/app/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(new_text)
print('Done!')
