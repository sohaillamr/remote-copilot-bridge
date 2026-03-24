import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Terminal, Globe, Shield, ArrowRight, Check, Sparkles,
  Lock, Mic, Copy, CheckCheck,
  Smartphone, Monitor, Wifi, 
  Cpu, Radio, ScanSearch, MonitorSmartphone, Code2, FolderLock, Users, 
} from 'lucide-react'
import GridBackground from '../components/GridBackground'
import { FadeIn, StaggerContainer, StaggerItem, GlowCard, MagneticButton } from '../components/Animations'

// â”€â”€ Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const tools = [
  { name: 'GitHub Copilot', color: 'from-blue-500 to-cyan-400' },
  { name: 'Claude Code', color: 'from-orange-400 to-amber-300' },
  { name: 'Gemini CLI', color: 'from-blue-400 to-indigo-500' },
  { name: 'OpenAI Codex', color: 'from-green-400 to-emerald-500' },
  { name: 'Aider', color: 'from-purple-400 to-pink-400' },
]

const capabilities = [
  {
    icon: Cpu,
    title: 'Switch Models on the Fly',
    desc: 'Run Copilot, Claude, Gemini, Codex, or Aider — all from one interface. Switch models per prompt.',
  },
  {
    icon: Radio,
    title: 'Terminal Streaming',
    desc: 'See your code execute line-by-line in real-time on your mobile browser. No delay, no polling.',
  },
  {
    icon: ScanSearch,
    title: 'Auto-Detection',
    desc: 'Run synapse start — it finds every AI CLI installed on your machine automatically.',
  },
  {
    icon: Mic,
    title: 'Voice Input',
    desc: 'Tap the mic and speak your prompt. Transcribed in real-time and sent directly to your AI tool.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Command Your Machine Remotely',
    desc: 'Browse your project files, read code, and run shell commands — all from your phone.',
  },
  {
    icon: Code2,
    title: 'Conversation History',
    desc: 'Every prompt and response saved. Pick up where you left off across any device.',
  },
]

const steps = [
  {
    icon: Terminal,
    title: 'Install the Agent',
    desc: 'One pip install on your machine. It auto-detects Copilot, Claude, Gemini, and every AI CLI.',
    gradient: 'from-synapse-500/20 to-purple-500/20',
    code: '$ pip install synapse-agent',
  },
  {
    icon: Globe,
    title: 'Open the Portal',
    desc: 'Log in from any device — phone, tablet, or another PC. Pick your tool and start prompting.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    code: 'synapse-green.vercel.app/app/chat',
  },
  {
    icon: Shield,
    title: 'AI Runs Locally',
    desc: 'Your prompts relay to your machine. AI runs with your files, your API keys, your context.',
    gradient: 'from-emerald-500/20 to-green-500/20',
    code: 'TLS-encrypted relay via Supabase',
  },
]

const useCases = [
  {
    title: 'Code from the Commute',
    desc: 'Review PRs, test API endpoints, or spin up a dev server directly from your phone while on the train. Eliminate idle hours and ship faster.',
  },
  {
    title: 'Zero Downtime Dinners',
    desc: 'Server goes down during dinner? Pull out your phone, access your secure workspace, and ask your AI agent to debug the logs instantly.',
  },
  {
    title: 'Team Context Engine (Beta)',
    desc: 'Share codebase context across your entire squad. Stop answering "where is the auth webhook?" and let Synapse onboard junior developers instantly.',
  },
]

const perks = [
  'Unlimited prompts',
  'All AI CLI tools',
  'Voice-to-text input',
  'Multiple agents',
  'Streaming responses',
  'File browser & shell',
  'Conversation history',
  'Priority support',
]

// â”€â”€ Pip Install Copy Block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PipCopyBlock() {
  const [copied, setCopied] = useState(false)
  const cmd = 'pip install synapse-agent'

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }, [])

  return (
    <div
      onClick={handleCopy}
      className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-synapse-500/30 hover:bg-white/[0.06] transition-all cursor-pointer group"
    >
      <span className="text-emerald-400 font-mono text-sm">$</span>
      <code className="text-sm font-mono text-gray-300 select-all">{cmd}</code>
      <button className="p-1 rounded-md hover:bg-white/[0.08] text-gray-500 group-hover:text-synapse-400 transition-colors">
        {copied ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
      </button>
    </div>
  )
}

// â”€â”€ Demo Animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DemoAnimation() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 max-w-3xl mx-auto">
      {/* Phone side */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone size={14} className="text-synapse-400" />
          <span className="text-[11px] text-gray-500 font-mono">Your Phone</span>
        </div>
        <div className="space-y-2.5">
          <div className="bg-synapse-600/10 border border-synapse-500/10 rounded-xl px-3 py-2">
            <p className="text-xs text-gray-300 font-mono">"How many lines of code in this project?"</p>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2"
          >
            <p className="text-xs text-gray-400 font-mono">
              <span className="text-emerald-400">✓</span> Total: 2,847 lines across 23 files
            </p>
          </motion.div>
        </div>
        <motion.div
          className="absolute bottom-2 right-3 flex items-center gap-1"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Wifi size={10} className="text-emerald-400" />
          <span className="text-[9px] text-emerald-400/70">Connected</span>
        </motion.div>
      </div>

      {/* Laptop side */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <Monitor size={14} className="text-emerald-400" />
          <span className="text-[11px] text-gray-500 font-mono">Your Laptop (Home)</span>
        </div>
        <div className="space-y-1 font-mono text-xs">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-500"
          >
            <span className="text-synapse-400">⚡</span> Synapse Agent running...
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-gray-500"
          >
            <span className="text-cyan-400">â†’</span> Prompt received
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-gray-400"
          >
            <span className="text-yellow-400">$</span> copilot -p "count lines..."
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-emerald-400"
          >
            ✓ Result sent to phone
          </motion.p>
        </div>
      </div>
    </div>
  )
}

// â”€â”€ Pricing Section with Monthly/Yearly Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PricingSection() {
  const [yearly, setYearly] = useState(false)

  return (
    <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <FadeIn>
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-sm text-synapse-400 uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-400 text-sm sm:text-base mb-6">7-day free trial. No credit card required.</p>

          {/* Monthly / Yearly toggle */}
          <div className="inline-flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-full p-1.5">
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                !yearly ? 'bg-synapse-600 text-white shadow-glow' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                yearly ? 'bg-synapse-600 text-white shadow-glow' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Yearly
              <span className="text-[10px] text-emerald-400 font-bold">-20%</span>
            </button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-3xl mx-auto px-2 sm:px-0">
          {/* Pro Plan */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            className="relative group"
          >
            <div className="absolute -inset-[1px] rounded-2xl sm:rounded-3xl bg-gradient-to-b from-synapse-500/30 via-synapse-500/10 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-8">
              <div className="text-center mb-5 sm:mb-8">
                <div className="badge-synapse mb-3 sm:mb-4 mx-auto">Most Popular</div>
                <h3 className="text-lg sm:text-2xl font-bold mb-1">Synapse Pro</h3>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={yearly ? 'y' : 'm'}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4"
                  >
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl sm:text-5xl font-extrabold">
                        {yearly ? '$48' : '$5'}
                      </span>
                      <span className="text-gray-500">/{yearly ? 'year' : 'month'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {yearly ? '2,400 EGP/year • save 600 EGP' : '250 EGP/month'}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
                {perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Check className="text-emerald-400" size={12} />
                    </div>
                    <span className="text-gray-300">{perk}</span>
                  </li>
                ))}
              </ul>

              <MagneticButton className="w-full">
                <Link to="/login" aria-label="Get started with Synapse" className="btn-primary w-full text-center block py-3.5 text-base">
                  Start 7-Day Free Trial
                </Link>
              </MagneticButton>

              {/* Payment methods */}
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <p className="text-[10px] text-gray-600 text-center mb-2">Accepted payments</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {['InstaPay (Egypt)', 'Manual Transfer'].map(m => (
                    <span key={m} className="text-[10px] text-gray-500 bg-white/[0.03] px-2 py-1 rounded-md border border-white/[0.04]">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Team Plan */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            className="relative group"
          >
            <div className="absolute -inset-[1px] rounded-2xl sm:rounded-3xl bg-gradient-to-b from-cyan-500/20 via-transparent to-transparent opacity-40 group-hover:opacity-80 transition-opacity duration-500" />
            <div className="relative glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-8">
              <div className="text-center mb-5 sm:mb-8">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3.5 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/10 mb-3 sm:mb-4">
                  <Users size={12} />
                  Teams
                </div>
                <h3 className="text-lg sm:text-2xl font-bold mb-1 flex items-center justify-center gap-2">
                  Synapse Team
                  <span className="text-[9px] uppercase tracking-wider font-bold bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-md">BETA</span>
                </h3>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={yearly ? 'y' : 'm'}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4"
                  >
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl sm:text-5xl font-extrabold">
                        {yearly ? '$19' : '$24'}
                      </span>
                      <span className="text-gray-500">/{yearly ? 'seat/month' : 'seat/month'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {yearly ? 'Billed annually ($228/seat) • save $60' : 'Cancel anytime'}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Check className="text-cyan-400" size={12} />
                  </div>
                  <span className="text-gray-300">Everything in Pro</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Check className="text-cyan-400" size={12} />
                  </div>
                  <span className="text-gray-300">Shared Repository Context</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Check className="text-cyan-400" size={12} />
                  </div>
                  <span className="text-gray-300">Centralized Billing & Seats</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Check className="text-cyan-400" size={12} />
                  </div>
                  <span className="text-gray-300">Zero Data Retention Privacy</span>
                </li>
              </ul>

              <MagneticButton className="w-full">
                <Link to="/login" className="w-full text-center block py-3.5 text-base rounded-xl border border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-semibold transition-colors">
                  Setup Team
                </Link>
              </MagneticButton>
            </div>
          </motion.div>
        </div>
      </FadeIn>
    </section>
  )
}

// â”€â”€ Main Landing Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <GridBackground />

      {/* â”€â”€â”€ Navbar (simplified — logo + single CTA) â”€â”€â”€ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 nav-blur"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <Zap className="text-synapse-400 transition-transform group-hover:scale-110" size={22} />
              <div className="absolute inset-0 bg-synapse-500/30 blur-lg rounded-full" />
            </div>
            <span className="text-lg font-bold tracking-tight">Synapse</span>
          </Link>
          <MagneticButton>
            <Link to="/login" aria-label="Get started with Synapse" className="btn-primary text-sm px-5 py-2">
              Start Prompting Now <ArrowRight size={14} className="ml-1 inline" />
            </Link>
          </MagneticButton>
        </div>
      </motion.nav>

      {/* â”€â”€â”€ Hero â”€â”€â”€ */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-12 sm:pb-20 text-center">
        <FadeIn delay={0.1}>
          <div className="badge-synapse mb-5 sm:mb-6 mx-auto">
            <Sparkles size={12} />
            Remote AI Agent Access
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-5 sm:mb-6 text-balance">
            Your entire dev environment{' '}
            <br className="hidden sm:block" />
            <span className="gradient-text">in your pocket.</span>
            <br />
            <span className="text-white/80 text-2xl sm:text-4xl md:text-5xl">Zero downtime. Infinite velocity.</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.35}>
          <p className="text-sm sm:text-lg text-gray-400 max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed text-balance px-2">
            Ship faster at your desk, and triage critical production issues from your phone—even during dinner. Connect securely to your local VS Code environment, run CLI commands, and chat with your codebase. The dream tool for elite developers and agile teams.
          </p>
        </FadeIn>

        {/* Pip install copy block */}
        <FadeIn delay={0.45}>
          <div className="mb-6 sm:mb-8">
            <PipCopyBlock />
          </div>
        </FadeIn>

        <FadeIn delay={0.55}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <MagneticButton>
              <Link to="/login" aria-label="Get started with Synapse" className="btn-primary text-base px-8 py-3.5 flex items-center gap-2.5 w-full sm:w-auto justify-center">
                Connect Your First Agent (Free)
                <ArrowRight size={16} />
              </Link>
            </MagneticButton>

          </div>
        </FadeIn>

        {/* Demo animation */}
        <FadeIn delay={0.7} y={40}>
          <div className="mt-10 sm:mt-16">
            <DemoAnimation />
          </div>
        </FadeIn>

        {/* Radial glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-synapse-600/[0.07] rounded-full blur-[120px] pointer-events-none" />
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* â”€â”€â”€ Supported Tools Strip â”€â”€â”€ */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <FadeIn>
          <p className="text-center text-xs sm:text-sm text-gray-500 uppercase tracking-widest mb-6 sm:mb-8">Works with your favorite AI CLI tools</p>
        </FadeIn>
        <StaggerContainer className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {tools.map((tool) => (
            <StaggerItem key={tool.name}>
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="glass-card rounded-xl px-3 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2"
              >
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${tool.color}`} />
                <span className="text-xs sm:text-sm font-medium text-gray-300">{tool.name}</span>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* â”€â”€â”€ How it Works â”€â”€â”€ */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <FadeIn>
          <div className="text-center mb-10 sm:mb-16">
            <p className="text-sm text-synapse-400 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight">Three steps. That's it.</h2>
          </div>
        </FadeIn>
        <StaggerContainer className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {steps.map((s, i) => (
            <StaggerItem key={s.title}>
              <GlowCard>
                <div className="flex flex-col items-center text-center gap-3 sm:gap-4">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center`}>
                    <s.icon className="text-white" size={22} />
                  </div>
                  <div className="text-xs text-gray-500 font-mono">0{i + 1}</div>
                  <h3 className="text-base sm:text-lg font-semibold">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                  <code className="text-[11px] text-synapse-300/70 bg-white/[0.03] px-2.5 py-1 rounded-lg font-mono">{s.code}</code>
                </div>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* â”€â”€â”€ Capabilities Grid â”€â”€â”€ */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <FadeIn>
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-sm text-synapse-400 uppercase tracking-widest mb-3">Capabilities</p>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight">Everything a developer needs</h2>
          </div>
        </FadeIn>
        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {capabilities.map((cap) => (
            <StaggerItem key={cap.title}>
              <div className="glass-card rounded-2xl p-5 sm:p-6 hover:border-white/[0.12] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-synapse-500/10 flex items-center justify-center mb-3">
                  <cap.icon size={20} className="text-synapse-400" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5 text-white">{cap.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{cap.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* â”€â”€â”€ Trust & Security â”€â”€â”€ */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <FadeIn>
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-sm text-synapse-400 uppercase tracking-widest mb-3">Built for Developers, by Developers</p>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight">Security you can trust</h2>
            <p className="text-gray-400 text-sm sm:text-base mt-4 max-w-2xl mx-auto">
              Your code never leaves your machine. We relay prompts — nothing more.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          <StaggerItem>
            <GlowCard>
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Lock className="text-emerald-400" size={22} />
                </div>
                <h3 className="text-base font-semibold">Encrypted in Transit</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Your prompts and code are encrypted in transit via TLS and Supabase Realtime.
                  We relay, not store. Your code stays on your machine.
                </p>
              </div>
            </GlowCard>
          </StaggerItem>

          <StaggerItem>
            <GlowCard>
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-synapse-500/10 flex items-center justify-center">
                  <Cpu className="text-synapse-400" size={22} />
                </div>
                  <h3 className="text-base font-semibold">Keep Your Code Private</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Your AI tools run entirely on your machine. Your code, API keys, and context never leave your device.
                  Zero cloud processing.
                </p>
              </div>
            </GlowCard>
          </StaggerItem>

          <StaggerItem>
            <GlowCard>
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <FolderLock className="text-amber-400" size={22} />
                </div>
                <h3 className="text-base font-semibold">Permission Control</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Synapse only accesses the directory you run it from.
                  Stop the agent anytime with{' '}
                  <code className="text-amber-300/80 bg-white/[0.04] px-1 rounded text-xs">Ctrl+C</code>.
                </p>
              </div>
            </GlowCard>
          </StaggerItem>
        </StaggerContainer>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* â”€â”€â”€ Use Cases â”€â”€â”€ */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <FadeIn>
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-sm text-synapse-400 uppercase tracking-widest mb-3">Use Cases</p>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight">
              How developers use Synapse
            </h2>
          </div>
        </FadeIn>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto">
          {useCases.map((uc) => (
            <StaggerItem key={uc.title}>
              <div className="glass-card rounded-2xl p-5 sm:p-6">
                <h3 className="text-sm font-semibold text-white mb-2">{uc.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{uc.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* â”€â”€â”€ Pricing â”€â”€â”€ */}
      <PricingSection />

      {/* â”€â”€â”€ Final CTA â”€â”€â”€ */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to code from <span className="gradient-text">anywhere</span>?
          </h2>
          <p className="text-gray-400 text-sm sm:text-base mb-8 max-w-xl mx-auto">
            Install the agent on your machine, open the portal on your phone, and start sending prompts in under 60 seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <MagneticButton>
              <Link to="/login" aria-label="Get started with Synapse" className="btn-primary text-base px-8 py-3.5 flex items-center gap-2.5 w-full sm:w-auto justify-center">
                Start Prompting Now →
              </Link>
            </MagneticButton>
            <div className="mt-2 sm:mt-0">
              <PipCopyBlock />
            </div>
          </div>
        </FadeIn>
      </section>

      {/* â”€â”€â”€ Footer â”€â”€â”€ */}
      <div className="section-divider" />
      <footer className="relative z-10 py-8 sm:py-10 px-4" aria-label="Site footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="text-synapse-500" size={16} />
            <span className="text-sm font-semibold text-gray-400">Synapse</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>&copy; 2026 Synapse. All rights reserved.</span>
            <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

