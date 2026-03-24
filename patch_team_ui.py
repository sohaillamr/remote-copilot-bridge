import re

with open('web/src/pages/app/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'Users' not in content:
    content = content.replace('User, CreditCard', 'User, Users, CreditCard')

data_privacy_idx = content.find('{/* Data & Privacy */}')

team_ui = """
      {/* Team Management */}
      {profile?.plan_tier === 'team' && (
        <FadeIn delay={0.32}>
          <div className="glass-card rounded-xl p-5 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-synapse-400" />
                <h2 className="font-semibold text-sm">Team Management</h2>
              </div>
              <span className="text-xs bg-synapse-500/10 text-synapse-400 px-2.5 py-1 rounded-full border border-synapse-500/20">
                Team Tier
              </span>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                You are on the Team (Beta) tier. You can now invite members up to your licensed seat limit.
              </p>
              
              <div className="p-4 bg-white/[0.03] border border-white/[0.05] rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white mb-1">Invite Members</h4>
                  <p className="text-xs text-gray-500">Generate a magic join link for your developers.</p>
                </div>
                <button 
                  onClick={() => alert('Invites will be fully enabled soon! For now, ask your team to sign up and contact support with their emails to sync the roster.')}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Generate Link
                </button>
              </div>
            </div>
          </div>
        </FadeIn>
      )}
"""

if data_privacy_idx != -1:
    content = content[:data_privacy_idx] + team_ui.strip() + '\n\n      ' + content[data_privacy_idx:]
    with open('web/src/pages/app/Settings.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
