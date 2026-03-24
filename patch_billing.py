import os

fp = r'web\src\pages\app\Settings.tsx'
with open(fp, 'r', encoding='utf-8') as f:
    text = f.read()

old_block = """            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Status</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                statusColors[profile?.subscription_status || 'inactive']
              }`}>
                {profile?.subscription_status || 'inactive'}
              </span>
            </div>
            {profile?.subscription_status === 'trial' && profile.trial_ends_at && ("""

new_block = """            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Status</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                statusColors[profile?.subscription_status || 'inactive']
              }`}>
                {profile?.subscription_status || 'inactive'}
              </span>
            </div>
            
            {/* Always show tier and price if active */}
            {profile?.subscription_status === 'active' && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm">Current Plan</span>
                <span className="text-sm font-medium text-white">
                  {profile?.plan_tier === 'team' ? 'Team ($12/seat/mo)' : 'Pro ($12.00/mo)'}
                </span>
              </div>
            )}
            
            {profile?.subscription_status === 'trial' && profile.trial_ends_at && ("""

if old_block in text:
    text = text.replace(old_block, new_block)
    
    # Let's also provide a fallback for Valid Until just in case date is null
    old_valid = """            {profile?.subscription_status === 'active' && profile.subscription_ends_at && ("""
    new_valid = """            {profile?.subscription_status === 'active' && ("""
    
    text = text.replace(old_valid, new_valid)
    
    old_dates = """              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Subscribed On</span>
                  <span className="text-sm font-mono text-gray-400">
                    {new Date(new Date(profile.subscription_ends_at).getTime() - 30*24*60*60*1000).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Valid Until</span>
                  <span className="text-sm font-mono text-gray-400">{new Date(profile.subscription_ends_at).toLocaleDateString()}</span>
                </div>
              </>"""
              
    new_dates = """              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Estimated Renewal</span>
                  <span className="text-sm font-mono text-gray-400">
                    {profile.subscription_ends_at 
                      ? new Date(profile.subscription_ends_at).toLocaleDateString() 
                      : new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}
                  </span>
                </div>
              </>"""
              
    text = text.replace(old_dates, new_dates)

    with open(fp, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Injected UI billing information")
else:
    print("Failed to replace")
