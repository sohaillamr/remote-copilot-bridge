import { FadeIn } from '../components/Animations'
import { Terminal, Target, Smartphone, Shield, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Guide() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-300 py-16 px-4 sm:px-6 lg:px-8 font-sans selection:bg-synapse-500/30">
      <div className="max-w-3xl mx-auto space-y-12">
        <FadeIn>
          <div className="text-center mb-16">
            <Link to="/" className="inline-flex items-center gap-2 text-synapse-400 hover:text-synapse-300 font-medium text-sm mb-6 transition-colors">
              &larr; Back to Home
            </Link>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
              How to Setup Synapse
            </h1>
            <p className="text-lg text-gray-400">
              A complete step-by-step guide to installing Synapse on your machine and connecting it to your mobile phone.
            </p>
          </div>
        </FadeIn>

        <div className="space-y-10">
          {/* Step 1 */}
          <FadeIn delay={0.1}>
            <div className="glass-card rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-synapse-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-synapse-500/10 text-synapse-400 font-bold text-xl border border-synapse-500/20">
                1
              </div>
              <div className="space-y-4 flex-1">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Terminal size={20} className="text-synapse-400" />
                  Install the Agent on your Desktop/Laptop
                </h2>
                <p className="text-gray-400 text-sm">
                  First, ensure you have Python automatically set up on your machine. Open up your favorite terminal (Command Prompt, PowerShell, or macOS/Linux Terminal) and run the following command to download and install the Synapse Agent.
                </p>
                <div className="terminal mt-4">
                  <div className="terminal-header">
                    <div className="terminal-dot bg-red-500/80" />
                    <div className="terminal-dot bg-yellow-500/80" />
                    <div className="terminal-dot bg-green-500/80" />
                  </div>
                  <div className="terminal-body space-y-1">
                    <p><span className="text-emerald-400">$</span> <span className="text-gray-300">pip install synapse-agent</span></p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Step 2 */}
          <FadeIn delay={0.2}>
            <div className="glass-card rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-xl border border-emerald-500/20">
                2
              </div>
              <div className="space-y-4 flex-1">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Shield size={20} className="text-emerald-400" />
                  Login and Authenticate
                </h2>
                <p className="text-gray-400 text-sm">
                  Once installed, you need to securely tie the agent to your account. Run the login command and it will send a Magic Link to your email. Click it to verify yourself.
                </p>
                <div className="terminal mt-4">
                  <div className="terminal-header">
                    <div className="terminal-dot bg-red-500/80" />
                    <div className="terminal-dot bg-yellow-500/80" />
                    <div className="terminal-dot bg-green-500/80" />
                  </div>
                  <div className="terminal-body space-y-1">
                    <p><span className="text-emerald-400">$</span> <span className="text-gray-300">synapse login</span></p>
                    <p className="text-gray-500">Email: <span className="text-gray-300">your-email@example.com</span></p>
                    <p className="text-emerald-400/80">Magic link sent! Check your inbox.</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Step 3 */}
          <FadeIn delay={0.3}>
            <div className="glass-card rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 font-bold text-xl border border-blue-500/20">
                3
              </div>
              <div className="space-y-4 flex-1">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Target size={20} className="text-blue-400" />
                  Start the Relay Agent
                </h2>
                <p className="text-gray-400 text-sm">
                  After authentication, you can now boot up the agent. It will listen in the background, bridging your computer to the cloud, discovering AIs you have installed (like Copilot, Claude CLI, or Gemini).
                </p>
                <div className="terminal mt-4">
                  <div className="terminal-header">
                    <div className="terminal-dot bg-red-500/80" />
                    <div className="terminal-dot bg-yellow-500/80" />
                    <div className="terminal-dot bg-green-500/80" />
                  </div>
                  <div className="terminal-body space-y-1">
                    <p><span className="text-emerald-400">$</span> <span className="text-gray-300">synapse start</span></p>
                    <p className="text-cyan-400/80">âš¡ Synapse Agent connected and relaying to cloud</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Step 4 */}
          <FadeIn delay={0.4}>
            <div className="glass-card rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 font-bold text-xl border border-amber-500/20">
                4
              </div>
              <div className="space-y-4 flex-1">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Smartphone size={20} className="text-amber-400" />
                  Pair with your Mobile Phone
                </h2>
                <p className="text-gray-400 text-sm">
                  Now that your PC is ready, you can seamlessly connect your phone without typing passwords.
                  Open Synapse on your Desktop Dashboard, head over to <strong>Settings</strong>, and click <strong>Generate Pairing Code</strong>.
                </p>
                <ul className="text-sm text-gray-400 space-y-2 mt-2 list-disc list-inside ml-2">
                  <li>Scan the <strong>QR Code</strong> directly with your mobile camera.</li>
                  <li>Or go to <code className="text-synapse-400 bg-synapse-500/10 px-1.5 py-0.5 rounded">synapse.com/pair</code> on your phone and type the 12-letter code to instantly login!</li>
                </ul>
                <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/5 flex items-center gap-4">
                  <div className="w-10 h-10 shrink-0 bg-white p-1 rounded-lg">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=example`} className="w-full h-full opacity-50" alt="QR Demo" />
                  </div>
                  <p className="text-xs text-gray-500">Scan QR or enter pairing code</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.5}>
          <div className="text-center mt-12 bg-synapse-500/10 p-8 rounded-2xl border border-synapse-500/20">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to go?</h2>
            <p className="text-gray-400 mb-6 text-sm">Experience the power of native desktop AI right from your browser or mobile phone.</p>
            <Link to="/app" className="inline-flex items-center gap-2 btn-primary px-8 py-3">
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}