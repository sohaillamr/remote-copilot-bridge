import re

with open('web/src/pages/app/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"(\s+useEffect\(\(\) => \{ loadAgents\(\); loadStats\(\) \}, \[\]\))"

replacement = r'''\1

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('dashboard-agents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents', filter: user_id=eq. }, payload => {
        loadAgents()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])'''

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content, count=1)
    with open('web/src/pages/app/Dashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Dashboard realtime agents patch applied!")
else:
    print("Failed to find Dashboard pattern")
