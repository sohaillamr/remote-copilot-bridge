import re

with open('web/src/pages/app/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_state_vars = """  // Plan & Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'team'>('pro')
  const [seatCount, setSeatCount] = useState<number>(1)
"""

content = re.sub(r"  const \[showPaymentModal, setShowPaymentModal\] = useState\(false\)[^\n]*\n(?:  const \[paymentPlan[^\n]*\n)?", new_state_vars, content)

new_calc = """
  // Pricing Calculation
  const getPricePerSeat = (seats: number) => {
    if (seats >= 10) return 8;
    if (seats >= 5) return 10;
    return 12; // Base price dropped from 24 to 12
  }
  
  const totalPrice = selectedPlan === 'pro' ? 12 : getPricePerSeat(seatCount) * seatCount;
"""

content = content.replace('  // Instapay state', new_calc + '\n  // Instapay state')

trigger_btn = """
              {profile?.subscription_status === 'active' ? (
                <button disabled className="btn-secondary w-full text-center block text-sm py-2.5 opacity-50 cursor-not-allowed">
                  Subscription Active
                </button>
              ) : (
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => { setSelectedPlan('pro'); setShowPaymentModal(true) }}
                    className="btn-secondary w-full py-2.5 text-sm flex items-center justify-center gap-2"
                  >
                    <User size={14} /> Upgrade to Pro
                  </button>
                  <button
                    onClick={() => { setSelectedPlan('team'); setShowPaymentModal(true) }}
                    className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
                  >
                    <CreditCard size={14} /> Upgrade to Team (Beta)
                  </button>
                </div>
              )}
"""

content = re.sub(r'\{profile\?\.subscription_status === \'active\' \? \([\s\S]*?<\/[dD]iv>\s*\)}', trigger_btn.strip(), content)

# update handleInstapaySubmit to include plan and seats
instapay_insert_re = r"currency: paymentPlan === 'usd' \? 'USD' : 'EGP',"
instapay_insert = r"currency: 'USD',\n        plan: selectedPlan,\n        seats: selectedPlan === 'team' ? seatCount : 1,"
content = re.sub(instapay_insert_re, instapay_insert, content)

modal_start = content.find('<AnimatePresence>')
new_modal = """
      <AnimatePresence>
        {showPaymentModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPaymentModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="glass-card rounded-2xl p-6 sm:p-8 max-w-sm w-full relative border border-white/[0.08] max-h-[90vh] overflow-y-auto">
                <button onClick={() => setShowPaymentModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
                
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-synapse-500/10 flex items-center justify-center mx-auto mb-4">
                    {selectedPlan === 'team' ? <CreditCard className="text-synapse-400" size={22} /> : <User className="text-synapse-400" size={22} />}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {selectedPlan === 'team' ? 'Synapse Team (Beta)' : 'Synapse Pro'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {selectedPlan === 'team' ? 'The ultimate context engine for your entire dev team.' : 'Unlimited prompts and comprehensive features for solo developers.'}
                  </p>
                </div>

                {selectedPlan === 'team' && (
                  <div className="mb-6 space-y-4">
                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.05]">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium">Number of Seats</span>
                        <span className="text-xs bg-synapse-500/20 text-synapse-400 px-2 py-1 rounded-full">
                          ${getPricePerSeat(seatCount)}/seat
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={seatCount}
                          onChange={(e) => setSeatCount(parseInt(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-synapse-500"
                        />
                        <input 
                          type="number" 
                          min="1" 
                          max="50" 
                          value={seatCount} 
                          onChange={(e) => setSeatCount(parseInt(e.target.value) || 1)}
                          className="input w-16 text-center text-sm py-1"
                        />
                      </div>
                      <div className="mt-3 flex justify-between text-xs text-gray-500">
                        <span>1-4: $12</span>
                        <span>5-9: $10</span>
                        <span>10+: $8</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-white mb-1">${totalPrice}<span className="text-sm font-normal text-gray-500">/mo</span></div>
                  <p className="text-[10px] text-gray-500">Please transfer equivalent in your local currency if applicable.</p>
                </div>

                <div className="space-y-4 mb-6 text-sm text-gray-400">
                  <div className="bg-synapse-500/10 p-4 rounded-xl border border-synapse-500/20 text-center">
                    <p className="text-xs text-gray-400 mb-2">Transfer via Instapay to:</p>
                    <p className="font-mono text-lg font-bold text-synapse-400 select-all">+201063022623</p>
                    <p className="text-xs text-gray-500 mt-1">Name: Sohail Amr Anwar Mohamed</p>
                  </div>

                  {instapaySuccess ? (
                    <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-xl text-center border border-emerald-500/20 text-xs">
                      Payment submitted! We will activate your {selectedPlan} subscription shortly.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Total Amount Transferred</label>
                        <input
                          type="text"
                          className="input w-full text-sm"
                          placeholder="e.g., $12 or 600 EGP"
                          value={instapayAmount}
                          onChange={(e) => setInstapayAmount(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Payment Screenshot</label>
                        <input
                          type="file"
                          accept="image/*"
                          className="input w-full text-xs"
                          onChange={(e) => setInstapayReceipt(e.target.files?.[0] || null)}
                        />
                      </div>
                      {instapayError && (
                        <p className="text-xs text-red-400">{instapayError}</p>
                      )}
                      <motion.button
                        onClick={handleInstapaySubmit}
                        disabled={!instapayAmount || !instapayReceipt || instapayUploading}
                        whileTap={{ scale: 0.98 }}
                        className="btn-primary w-full py-2.5 flex justify-center items-center gap-2 mt-4"
                      >
                        {instapayUploading ? <Loader2 size={16} className="animate-spin" /> : 'Submit Payment Info'}
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
"""

content = content[:modal_start] + new_modal.strip() + '\n\n    </div>\n  )\n}'

with open('web/src/pages/app/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
