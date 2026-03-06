import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Terminal, Globe, Shield, ArrowRight, Check, Sparkles, Cpu, Lock, Mic } from 'lucide-react'
import GridBackground from '../components/GridBackground'
import { FadeIn, StaggerContainer, StaggerItem, GlowCard, MagneticButton } from '../components/Animations'

const tools = [
  { name: 'GitHub Copilot', color: 'from-blue-500 to-cyan-400' },
  { name: 'Claude', color: 'from-orange-400 to-amber-300' },
  { name: 'Gemini', color: 'from-blue-400 to-indigo-500' },
  { name: 'Codex', color: 'from-green-400 to-emerald-500' },
  { name: 'Aider', color: 'from-purple-400 to-pink-400' },
]

const features = [
  {
    icon: Terminal,
    title: 'Install the Agent',
    desc: 'One command installs the Synapse agent. It auto-detects every AI CLI on your machine.',
    gradient: 'from-synapse-500/20 to-purple-500/20',
  },
  {
    icon: Globe,
    title: 'Open the Portal',
    desc: 'Log in from any device. Pick your tool and start prompting instantly.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    icon: Shield,
    title: 'Your Machine, Your Data',
    desc: 'Prompts relay to your machine. AI runs locally with your files, keys, and context.',
    gradient: 'from-emerald-500/20 to-green-500/20',
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

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <GridBackground />

      {/* ── Navbar ──────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 nav-blur"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <Zap className="text-synapse-400 transition-transform group-hover:scale-110" size={22} />
              <div className="absolute inset-0 bg-synapse-500/30 blur-lg rounded-full" />
            </div>
            <span className="text-lg font-bold tracking-tight">Synapse</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm hidden sm:inline">
              Log in
            </Link>
            <MagneticButton>
              <Link to="/login" className="btn-primary text-sm px-4 sm:px-5 py-2">
                Get Started
              </Link>
            </MagneticButton>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-20 sm:pb-32 text-center">
        <FadeIn delay={0.1}>
          <div className="badge-synapse mb-6 sm:mb-8 mx-auto">
            <Sparkles size={12} />
            Access your AI tools from anywhere
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-6 sm:mb-8 text-balance">
            Your AI.{' '}
            <span className="gradient-text">
              Your Machine.
            </span>
            <br />
            <span className="text-white/90">Any Device.</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.35}>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed text-balance px-2">
            Connect Copilot, Claude, Gemini & more to a web portal.
            Send prompts from your phone, tablet, or any browser {'—'}
            the AI runs on <span className="text-white font-medium">your machine</span>.
          </p>
        </FadeIn>

        <FadeIn delay={0.5}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <MagneticButton>
              <Link to="/login" className="btn-primary text-base px-8 py-3.5 flex items-center gap-2.5 w-full sm:w-auto justify-center">
                Start Free Trial
                <ArrowRight size={16} />
              </Link>
            </MagneticButton>
            <MagneticButton>
              <a href="#pricing" className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto text-center">
                See Pricing
              </a>
            </MagneticButton>
          </div>
        </FadeIn>

        {/* Terminal mockup */}
        <FadeIn delay={0.65} y={50}>
          <div className="mt-12 sm:mt-20 max-w-xl mx-auto">
            <div className="terminal shadow-glow-xl">
              <div className="terminal-header">
                <div className="terminal-dot bg-red-500/80" />
                <div className="terminal-dot bg-yellow-500/80" />
                <div className="terminal-dot bg-green-500/80" />
                <span className="text-xs text-gray-500 ml-2 font-mono">terminal</span>
              </div>
              <div className="terminal-body space-y-2 text-left text-xs sm:text-sm">
                <p><span className="text-emerald-400">$</span> <span className="text-gray-300">pip install synapse-agent</span></p>
                <p><span className="text-emerald-400">$</span> <span className="text-gray-300">synapse login</span></p>
                <p><span className="text-emerald-400">$</span> <span className="text-gray-300">synapse start</span></p>
                <p className="text-synapse-400 pt-2">{'  '}<Zap className="inline" size={14} /> Synapse Agent is running</p>
                <p className="text-gray-500">{'  '}Detected tools: copilot, claude</p>
                <p className="text-gray-500">{'  '}Listening for prompts...</p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Radial glow behind hero */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-synapse-600/[0.07] rounded-full blur-[120px] pointer-events-none" />
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* ── Supported Tools ────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <FadeIn>
          <p className="text-center text-xs sm:text-sm text-gray-500 uppercase tracking-widest mb-8 sm:mb-10">Works with your favorite AI CLI tools</p>
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

      {/* ── How it Works ────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <FadeIn>
          <div className="text-center mb-10 sm:mb-16">
            <p className="text-sm text-synapse-400 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight">Three steps to freedom</h2>
          </div>
        </FadeIn>
        <StaggerContainer className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {features.map((f, i) => (
            <StaggerItem key={f.title}>
              <GlowCard>
                <div className="flex flex-col items-center text-center gap-3 sm:gap-4">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center`}>
                    <f.icon className="text-white" size={22} />
                  </div>
                  <div className="text-xs text-gray-500 font-mono">0{i + 1}</div>
                  <h3 className="text-base sm:text-lg font-semibold">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* ── Voice Feature Highlight ──────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <FadeIn>
            <div>
              <div className="badge-synapse mb-4">
                <Mic size={12} />
                New Feature
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 sm:mb-6">
                Speak your prompts with <span className="gradient-text">Voice Input</span>
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6 sm:mb-8 text-sm sm:text-base">
                No keyboard? No problem. Tap the mic and speak your prompt naturally.
                Your voice is transcribed in real-time and sent to your AI tool.
                Perfect for mobile, tablet, or when you just want to think out loud.
              </p>
              <div className="space-y-3 sm:space-y-4">
                {[
                  { text: 'Real-time transcription as you speak' },
                  { text: 'Works on any Chromium browser or IDE' },
                  { text: 'One-tap toggle — no extra apps needed' },
                  { text: 'Supports all languages via Web Speech API' },
                ].map(({ text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-synapse-500/10 flex items-center justify-center shrink-0">
                      <Check className="text-synapse-400" size={12} />
                    </div>
                    <span className="text-gray-300">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-inner-glow">
              {/* Voice input demo mockup */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  Voice Input Demo
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-sm text-gray-300 font-mono">"Refactor the handleSubmit function to use async/await and add proper error handling..."</p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1 h-8">
                    {[0, 1, 2, 3, 4, 5, 6].map(i => (
                      <motion.div
                        key={i}
                        className="w-1 bg-gradient-to-t from-synapse-600 to-synapse-400 rounded-full"
                        animate={{
                          height: ['6px', `${12 + Math.random() * 20}px`, '6px'],
                        }}
                        transition={{
                          duration: 0.5 + Math.random() * 0.4,
                          repeat: Infinity,
                          delay: i * 0.08,
                          ease: 'easeInOut',
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-synapse-400 font-medium">Listening...</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                  <span className="text-[10px] text-gray-600 font-mono">Web Speech API</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600">Chrome</span>
                    <span className="text-[10px] text-gray-600">Edge</span>
                    <span className="text-[10px] text-gray-600">VS Code</span>
                    <span className="text-[10px] text-gray-600">Cursor</span>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* ── Why Synapse ────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <FadeIn>
            <div>
              <p className="text-sm text-synapse-400 uppercase tracking-widest mb-3">Why Synapse</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 sm:mb-6">
                Your AI stays on <span className="gradient-text">your machine</span>
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6 sm:mb-8 text-sm sm:text-base">
                Unlike cloud-only solutions, Synapse keeps everything local.
                Your API keys, your codebase, your file system {'—'} nothing leaves your machine.
                We just relay prompts.
              </p>
              <div className="space-y-3 sm:space-y-4">
                {[
                  { icon: Lock, text: 'Zero data leaves your machine' },
                  { icon: Cpu, text: 'Uses your existing API keys & config' },
                  { icon: Zap, text: 'Sub-second relay latency' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-synapse-600/10 flex items-center justify-center shrink-0">
                      <Icon className="text-synapse-400" size={16} />
                    </div>
                    <span className="text-gray-300">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-inner-glow">
              <div className="space-y-4 font-mono text-sm">
                <div className="flex items-center gap-2 text-gray-500 mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Architecture
                </div>
                <div className="space-y-2 text-gray-400">
                  <p className="text-xs sm:text-sm break-all sm:break-normal"><span className="text-synapse-400">Browser</span> {'->'}  Supabase Realtime  {'->'}  <span className="text-emerald-400">Your Machine</span></p>
                  <p className="text-gray-600 text-xs pt-2">End-to-end encrypted relay. No prompt storage.</p>
                  <div className="border-t border-white/5 pt-3 mt-3 space-y-1">
                    <p className="text-xs text-gray-600">{'// your prompt never touches our servers'}</p>
                    <p className="text-xs text-gray-600">{'// AI runs with YOUR api keys'}</p>
                    <p className="text-xs text-gray-600">{'// YOUR files, YOUR context'}</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* ── Pricing ────────────────────────────── */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <FadeIn>
          <div className="text-center mb-10 sm:mb-16">
            <p className="text-sm text-synapse-400 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-400 text-sm sm:text-base">7-day free trial. No credit card required.</p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="max-w-md mx-auto">
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="relative group"
            >
              {/* Glow border */}
              <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-synapse-500/30 via-synapse-500/10 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative glass-card rounded-3xl p-6 sm:p-8 md:p-10">
                <div className="text-center mb-6 sm:mb-8">
                  <div className="badge-synapse mb-4 mx-auto">Most Popular</div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-1">Synapse Pro</h3>
                  <div className="flex items-baseline justify-center gap-1 mt-4">
                    <span className="text-4xl sm:text-5xl font-extrabold">$5</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">or 250 EGP/month</p>
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
                  <Link to="/login" className="btn-primary w-full text-center block py-3.5 text-base">
                    Start 7-Day Free Trial
                  </Link>
                </MagneticButton>
              </div>
            </motion.div>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ────────────────────────────── */}
      <div className="section-divider" />
      <footer className="relative z-10 py-8 sm:py-10 text-center px-4">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Zap className="text-synapse-500" size={16} />
          <span className="text-sm font-semibold text-gray-400">Synapse</span>
        </div>
        <p className="text-xs text-gray-600">&copy; 2026 Synapse. Built for developers who want AI everywhere.</p>
      </footer>
    </div>
  )
}
