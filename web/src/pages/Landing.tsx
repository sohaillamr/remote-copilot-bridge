import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, ArrowRight, Check, Sparkles,
  Lock, Copy, CheckCheck,
  Monitor,
  Cpu, Users,
  Server, CreditCard, Activity, HardDrive, Github, Network, Shield, ShieldCheck, Code2
} from 'lucide-react'
import GridBackground from '../components/GridBackground'
import { GlowCard, MagneticButton } from '../components/Animations'

// ── Data ─────────────────────────────────────────────────────────────────

const features = [
  {
    icon: HardDrive,
    title: 'Local Access',
    desc: 'Browse, edit, and run scripts on your machine\'s physical drive. No cloud cloning required.',
  },
  {
    icon: Github,
    title: 'GitHub Integration',
    desc: 'Pull, branch, and push directly through your laptop\'s authenticated Git environment.',
  },
  {
    icon: Cpu,
    title: 'AI Agnostic',
    desc: 'Whether you use Claude-Code, Copilot CLI, or Aider, Synapse handles the relay.',
  },
]

const teamFeatures = [
  {
    icon: Server,
    title: 'Shared Nodes',
    desc: 'Allow senior devs to access a high-performance "Command Node" (like a Mac Studio or a GPU Server) from their phones.',
  },
  {
    icon: CreditCard,
    title: 'Centralized Billing',
    desc: 'Manage your entire team\'s subscription in one place with InstaPay Corporate or Paymob.',
  },
  {
    icon: Activity,
    title: 'Audit Transparency',
    desc: '(Coming Soon) See a log of who triggered which AI agent and when.',
  },
]

const scenarios = [
  {
    persona: 'The Lead Dev',
    crisis: 'Production crash during a family dinner.',
    fix: 'Pull out phone → Browse Repo → Run aider --fix → Deployed.',
    icon: Zap,
    color: 'text-amber-400'
  },
  {
    persona: 'The CS Student',
    crisis: 'Left the heavy laptop at home to save back pain.',
    fix: 'Open Synapse → Access Documents/Project → Run Tests → Done.',
    icon: Code2,
    color: 'text-blue-400'
  },
  {
    persona: 'The Team Manager',
    crisis: 'Junior dev is stuck on a local config error.',
    fix: 'Log into the Team Node → Check the terminal output → Fixed.',
    icon: Users,
    color: 'text-emerald-400'
  },
]

const faqs = [
  {
    q: 'How does the Team Beta work?',
    a: 'You\'ll get an Admin Dashboard to invite your developers. They install the bridge on their machines, and you manage the seats centrally.'
  },
  {
    q: 'Can I use this on a slow 3G connection?',
    a: 'Yes. Synapse sends text-based prompts and streams terminal text, meaning it works even when the internet is struggling.'
  },
  {
    q: 'Does it support Claude 3.5 Sonnet?',
    a: 'If your local CLI (like Claude-Code or Aider) supports it, Synapse supports it.'
  }
]

// ── Components ───────────────────────────────────────────────────────────

function PipCopyBlock() {
  const [copied, setCopied] = useState(false)
  const cmd = 'pip install synapse-bridge && synapse login'

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }, [])

  return (
    <div
      onClick={handleCopy}
      className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-synapse-500/30 hover:bg-white/[0.06] transition-all cursor-pointer group shadow-2xl backdrop-blur-sm"
    >
      <span className="text-emerald-400 font-mono text-sm">➜</span>
      <code className="text-sm font-mono text-gray-300 select-all">{cmd}</code>
      <button className="p-1 rounded-md hover:bg-white/[0.08] text-gray-500 group-hover:text-synapse-400 transition-colors">
        {copied ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
      </button>
    </div>
  )
}

function CommandCenterPreview() {
  return (
    <div className="relative mx-auto max-w-4xl mt-12 perspective-1000">
      <motion.div
        initial={{ rotateX: 10, opacity: 0, y: 50 }}
        animate={{ rotateX: 0, opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/5"
      >
        {/* Fake Browser Chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b border-white/[0.06]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
          </div>
          <div className="flex-1 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-black/40 text-[10px] text-gray-400 font-mono border border-white/5">
              <Lock size={8} /> synapse-green.vercel.app
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Local PC */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 flex flex-col gap-3">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Monitor size={16} /> <span className="text-sm font-bold">Local PC</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             </div>
             <div className="space-y-2">
                <div className="h-1.5 bg-white/10 rounded-full w-3/4" />
                <div className="h-1.5 bg-white/10 rounded-full w-1/2" />
             </div>
             <div className="mt-auto pt-2 border-t border-white/5 flex gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-300">Default</span>
             </div>
          </div>

          {/* Card 2: GitHub Props */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 flex flex-col gap-3">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Github size={16} /> <span className="text-sm font-bold">GitHub Repos</span>
                </div>
             </div>
             <div className="space-y-2">
                <div className="h-1.5 bg-white/10 rounded-full w-full" />
                <div className="h-1.5 bg-white/10 rounded-full w-2/3" />
             </div>
             <div className="mt-auto pt-2 border-t border-white/5 flex gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">Connected</span>
             </div>
          </div>

          {/* Card 3: Team Nodes */}
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-lg p-4 flex flex-col gap-3 relative overflow-hidden">
             <div className="absolute top-0 right-0 px-2 py-0.5 bg-indigo-500 text-[9px] font-bold text-white rounded-bl-lg">BETA</div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-300">
                  <Network size={16} /> <span className="text-sm font-bold">Team Node</span>
                </div>
             </div>
             <div className="space-y-2">
                <div className="h-1.5 bg-indigo-500/20 rounded-full w-4/5" />
                <div className="h-1.5 bg-indigo-500/20 rounded-full w-3/5" />
             </div>
             <div className="mt-auto pt-2 border-t border-indigo-500/20 flex gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">Shared Resource</span>
             </div>
          </div>
          
          {/* Terminal Area */}
          <div className="md:col-span-3 bg-black/50 border border-white/10 rounded-lg p-4 font-mono text-xs text-gray-400 h-32 overflow-hidden relative">
            <div className="absolute top-2 right-3 text-[10px] text-gray-600">Terminal Output</div>
            <p className="text-emerald-400">$ synapse connect team-node-01</p>
            <p className="mt-1">Creating secure tunnel to 192.168.1.45:22...</p>
            <p className="mt-1">Connected. Type 'exit' to disconnect.</p>
            <p className="mt-1 text-white">user@team-node:~/production-api$ <span className="animate-pulse">_</span></p>
          </div>
        </div>
      </motion.div>
      
      {/* Decorative glows */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-synapse-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
    </div>
  )
}


// ── Main Page ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-synapse-500/30 overflow-x-hidden font-sans">
      <GridBackground />

      <main className="relative pt-20 pb-16 sm:pb-24">
        
        {/* 1. Hero Section: Unified Command */}
        <section className="px-4 sm:px-6 mb-24 md:mb-32">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-400">
                Your Infrastructure,<br className="hidden md:block" /> Controlled from Your Pocket.
              </h1>
              <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
                The first remote orchestration bridge for AI-native developers. Access local machines and GitHub repositories from any device. Now introducing <span className="text-indigo-400 font-semibold">Synapse for Teams</span>.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <MagneticButton className="w-full sm:w-auto">
                  <Link to="/login" className="btn-primary px-8 py-3.5 text-base w-full min-w-[160px] text-center shadow-lg shadow-synapse-500/20 hover:shadow-synapse-500/40 transition-all">
                    Start Free Trial
                  </Link>
                </MagneticButton>
                <a href="#teams" className="px-8 py-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition-all w-full sm:w-auto min-w-[160px] text-center font-medium flex items-center justify-center gap-2">
                  <Sparkles size={16} /> Join Teams Beta
                </a>
              </div>
            </motion.div>

            <CommandCenterPreview />
          </div>
        </section>

        {/* 2. The "Hybrid Context" Engine */}
        <section className="px-4 sm:px-6 mb-32 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-emerald-400 uppercase tracking-widest">Secret Sauce</span>
            <h2 className="text-3xl md:text-5xl font-bold mt-2 mb-4">Total Context. Zero Latency.</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Why settle for Cloud AI that doesn't know your environment? Synapse bridges your mobile device to your laptop’s hardware and your organization’s GitHub history simultaneously.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <GlowCard key={i} className="h-full">
                <div className="w-12 h-12 rounded-xl bg-gray-800/50 flex items-center justify-center mb-6 text-emerald-400">
                  <f.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">{f.desc}</p>
              </GlowCard>
            ))}
          </div>
        </section>

        {/* 3. NEW: Synapse for Teams (Beta) */}
        <section id="teams" className="relative px-4 sm:px-6 mb-32 py-20 bg-gradient-to-b from-indigo-950/20 to-transparent border-y border-indigo-500/10">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative z-10 max-w-7xl mx-auto">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
               <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-6">
                    <Sparkles size={12} /> ENTERPRISE READY
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold mb-6">Scale Your Engineering Velocity.</h2>
                  <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                    Stop waiting for developers to get back to their desks. Empower your team to respond to incidents and ship code from anywhere with centralized orchestration.
                  </p>
                  
                  <ul className="space-y-6 mb-10">
                    {teamFeatures.map((f,i) => (
                      <li key={i} className="flex gap-4">
                        <div className="mt-1 w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                          <f.icon size={16} />
                        </div>
                        <div>
                          <h4 className="font-bold text-indigo-100">{f.title}</h4>
                          <p className="text-sm text-gray-400">{f.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <button className="btn-primary bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl shadow-lg shadow-indigo-500/20">
                     Join the Beta & Lock Founder's Pricing
                  </button>
               </div>
               
               {/* Team Graphic */}
               <div className="relative aspect-square md:aspect-video lg:aspect-square bg-black/40 rounded-2xl border border-indigo-500/30 p-8 flex flex-col justify-center">
                  <div className="relative z-10 space-y-4">
                     {/* Team Member 1 */}
                     <div className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-xl border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">JD</div>
                        <div className="flex-1">
                           <div className="h-2 bg-gray-700 rounded w-24 mb-2" />
                           <div className="h-1.5 bg-gray-700/50 rounded w-16" />
                        </div>
                        <div className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] rounded">Online</div>
                     </div>
                     {/* Team Member 2 */}
                     <div className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-xl border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">AS</div>
                        <div className="flex-1">
                           <div className="h-2 bg-gray-700 rounded w-32 mb-2" />
                           <div className="h-1.5 bg-gray-700/50 rounded w-20" />
                        </div>
                        <div className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-[10px] rounded">Busy</div>
                     </div>
                      {/* Shared Agent */}
                     <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20 mt-4 text-center">
                        <p className="text-xs text-indigo-300 font-mono mb-2">Shared Agent Queue</p>
                        <div className="h-1.5 w-full bg-indigo-900/50 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-500 w-2/3 animate-pulse" />
                        </div>
                     </div>
                  </div>
                  
                  {/* Grid effect behind */}
                  <div className="absolute inset-0 bg-[linear_gradient(rgba(99,102,241,0.1)_1px,transparent_1px),linear_gradient(90deg,rgba(99,102,241,0.1)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />
               </div>
             </div>
          </div>
        </section>

        {/* 4. The "Pip" Installation */}
        <section className="px-4 sm:px-6 mb-32 max-w-7xl mx-auto text-center">
           <h2 className="text-2xl sm:text-3xl font-bold mb-2">Up and running in 60 seconds.</h2>
           <p className="text-gray-400 mb-8 max-w-lg mx-auto">No complex SSH keys. No port forwarding. Just a secure WebSocket tunnel that "just works".</p>
           <PipCopyBlock />
        </section>

        {/* 5. Security: The "Hardened" Bridge */}
        <section className="px-4 sm:px-6 mb-32 max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl p-8 sm:p-12 text-center md:text-left">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="order-2 md:order-1">
                   <Shield size={48} className="text-gray-600 mb-6 mx-auto md:mx-0" />
                   <h2 className="text-3xl font-bold mb-6">Your Code Never Leaves Your Sight.</h2>
                   <div className="space-y-6">
                      <div className="flex gap-4">
                         <Lock className="text-emerald-400 shrink-0" size={20} />
                         <div>
                            <h3 className="font-bold text-white">E2E Encryption</h3>
                            <p className="text-sm text-gray-400 mt-1">Prompts are encrypted from your phone to your PC. We are the pipe, not the viewer.</p>
                         </div>
                      </div>
                      <div className="flex gap-4">
                         <Github className="text-emerald-400 shrink-0" size={20} />
                         <div>
                            <h3 className="font-bold text-white">Scoped GitHub Apps</h3>
                            <p className="text-sm text-gray-400 mt-1">We only see the repos you specifically authorize.</p>
                         </div>
                      </div>
                      <div className="flex gap-4">
                         <HardDrive className="text-emerald-400 shrink-0" size={20} />
                         <div>
                            <h3 className="font-bold text-white">Local Execution</h3>
                            <p className="text-sm text-gray-400 mt-1">The AI logic runs on your hardware. Your .env files and API keys stay on your disk.</p>
                         </div>
                      </div>
                   </div>
                </div>
                <div className="order-1 md:order-2 flex justify-center">
                   <div className="relative w-64 h-64">
                       <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
                       <ShieldCheck className="relative z-10 w-64 h-64 text-emerald-500/80 drop-shadow-[0_0_50px_rgba(16,185,129,0.5)]" />
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* 6. Real-World Scenarios */}
        <section className="px-4 sm:px-6 mb-32 max-w-7xl mx-auto">
           <h2 className="text-3xl font-bold text-center mb-12">Real-World Scenarios</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {scenarios.map((s, i) => (
                 <div key={i} className="bg-white/[0.03] border border-white/[0.06] p-6 rounded-2xl hover:bg-white/[0.05] transition-colors">
                    <div className={`w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center mb-4 ${s.color}`}>
                       <s.icon size={20} />
                    </div>
                    <div className="text-lg font-bold mb-2">{s.persona}</div>
                    <div className="text-sm text-red-300 mb-2 font-mono bg-red-500/10 p-2 rounded border border-red-500/20">
                       <span className="font-bold">Crisis:</span> {s.crisis}
                    </div>
                    <div className="text-sm text-emerald-300 font-mono bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                       <span className="font-bold">Fix:</span> {s.fix}
                    </div>
                 </div>
              ))}
           </div>
        </section>

        {/* 7. Pricing Matrix */}
        <section className="px-4 sm:px-6 mb-32 max-w-7xl mx-auto">
           <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Pricing</h2>
              <p className="text-gray-400">Simple plans for solo devs and scaling teams.</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Individual */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 flex flex-col">
                 <h3 className="text-xl font-bold mb-2">Individual</h3>
                 <div className="text-3xl font-bold mb-4">250 EGP <span className="text-sm font-normal text-gray-500">/ month</span></div>
                 <p className="text-sm text-gray-400 mb-8 border-b border-white/5 pb-6">Perfect for the cafe coder.</p>
                 
                 <ul className="space-y-4 mb-auto">
                    <li className="flex items-center gap-3 text-sm text-gray-300"><Check size={16} className="text-emerald-400" /> 1 PC + GitHub Integration</li>
                    <li className="flex items-center gap-3 text-sm text-gray-300"><Check size={16} className="text-emerald-400" /> All CLI Tools supported</li>
                    <li className="flex items-center gap-3 text-sm text-gray-300"><Check size={16} className="text-emerald-400" /> Payments via InstaPay / Vodafone Cash</li>
                 </ul>
                 
                 <Link to="/login" className="btn-secondary w-full text-center mt-8 py-3">Start 7-Day Free Trial</Link>
              </div>

              {/* Teams */}
              <div className="bg-gradient-to-b from-indigo-500/10 to-transparent border border-indigo-500/30 rounded-2xl p-8 flex flex-col relative overflow-hidden">
                 <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">BETA</div>
                 <h3 className="text-xl font-bold mb-2 text-indigo-300">Teams</h3>
                 <div className="text-3xl font-bold mb-4">Contact <span className="text-sm font-normal text-gray-500">for pricing</span></div>
                 <p className="text-sm text-gray-400 mb-8 border-b border-indigo-500/20 pb-6">For software houses scaling up.</p>
                 
                 <ul className="space-y-4 mb-auto">
                    <li className="flex items-center gap-3 text-sm text-gray-300"><Check size={16} className="text-indigo-400" /> Unlimited Team Nodes</li>
                    <li className="flex items-center gap-3 text-sm text-gray-300"><Check size={16} className="text-indigo-400" /> Shared Agent Contexts</li>
                    <li className="flex items-center gap-3 text-sm text-gray-300"><Check size={16} className="text-indigo-400" /> Priority Slack/WhatsApp Support</li>
                    <li className="flex items-center gap-3 text-sm text-gray-300"><Check size={16} className="text-indigo-400" /> Corporate Invoicing</li>
                 </ul>
                 
                 <button className="btn-primary bg-indigo-600 hover:bg-indigo-500 w-full text-center mt-8 py-3">Join Teams Beta</button>
              </div>
           </div>
        </section>

        {/* 8. Egypt Tech Pride */}
        <section className="px-4 sm:px-6 mb-32 max-w-7xl mx-auto text-center">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="flex gap-2 text-4xl grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                🇪🇬
              </div>
              <h2 className="text-2xl font-bold text-white">Built in Egypt. Designed for the Global Dev.</h2>
              <p className="text-gray-400 max-w-2xl">
                Born out of the need for faster workflows at the <span className="text-white">Sadat Academy for Management Sciences</span>. Synapse is optimized for local networks and local payment methods.
              </p>
            </div>
        </section>

        {/* 9. FAQ */}
        <section className="px-4 sm:px-6 mb-20 max-w-3xl mx-auto">
           <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
           <div className="space-y-4">
              {faqs.map((f, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                   <button 
                      onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                      className="w-full text-left p-4 flex items-center justify-between font-medium hover:bg-white/[0.03] transition-colors"
                   >
                      {f.q}
                      <ArrowRight size={16} className={`transform transition-transform ${activeFaq === i ? 'rotate-90' : ''}`} />
                   </button>
                   <AnimatePresence>
                      {activeFaq === i && (
                         <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                         >
                            <div className="p-4 pt-0 text-sm text-gray-400 leading-relaxed border-t border-white/[0.06]">
                               {f.a}
                            </div>
                         </motion.div>
                      )}
                   </AnimatePresence>
                </div>
              ))}
           </div>
        </section>
        
        {/* Footer */}
        <footer className="border-t border-white/[0.06] pt-12 text-center text-sm text-gray-600 pb-12">
           <p>© 2026 Synapse Bridge. All rights reserved.</p>
           <div className="flex justify-center gap-6 mt-4">
              <Link to="/privacy" className="hover:text-gray-400">Privacy</Link>
              <Link to="/terms" className="hover:text-gray-400">Terms</Link>
           </div>
        </footer>

      </main>
    </div>
  )
}

