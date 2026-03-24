import { Link } from 'react-router-dom'
import { ArrowLeft, Zap } from 'lucide-react'
import GridBackground from '../components/GridBackground'

export default function Privacy() {
  return (
    <div className="relative min-h-screen">
      <GridBackground />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 nav-blur">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-4xl mx-auto">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <Zap className="text-synapse-400 transition-transform group-hover:scale-110" size={22} />
              <div className="absolute inset-0 bg-synapse-500/30 blur-lg rounded-full" />
            </div>
            <span className="text-lg font-bold tracking-tight">Synapse</span>
          </Link>
          <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-sm group">
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">Privacy Policy</h1>

        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 text-sm text-gray-400 leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-base mb-2">1. Overview</h2>
            <p>
              Synapse is designed with privacy at its core. Your AI tools run locally on your
              machine &mdash; we act as a relay, not a processor. This policy explains what data
              we collect and how we use it.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">2. What We Collect</h2>
            <ul className="space-y-2">
              <li>
                <strong className="text-gray-300">Account info:</strong> Email address, display
                name, and OAuth profile data (GitHub/Google).
              </li>
              <li>
                <strong className="text-gray-300">Usage metadata:</strong> Prompt counts, tool
                usage, session duration, error rates &mdash; no prompt content.
              </li>
              <li>
                <strong className="text-gray-300">Device info:</strong> Browser fingerprint for
                QR pairing persistence. Agent hostname and OS for device management.
              </li>
              <li>
                <strong className="text-gray-300">Payment info:</strong> Processed securely. We
                store transaction IDs but never credit card numbers.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">3. What We Do NOT Collect</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Your source code or project files</li>
              <li>The content of your AI prompts or responses</li>
              <li>Your API keys or tokens for third-party AI tools</li>
              <li>File contents accessed through the file browser</li>
            </ul>
            <p className="mt-2">
              Prompts and responses are relayed in real-time via Supabase Realtime (WebSocket) and
              are not stored on our servers. Conversation history is stored in your Supabase
              account and is only accessible by you.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">4. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>To authenticate you and manage your account</li>
              <li>To process payments and manage subscriptions</li>
              <li>To display usage analytics in your dashboard</li>
              <li>To improve the Service and fix bugs</li>
              <li>To send transactional emails (login links, receipts)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">5. Data Storage &amp; Security</h2>
            <p>
              Your data is stored in Supabase (hosted on AWS) with row-level security (RLS)
              policies ensuring users can only access their own data. Auth tokens are stored
              locally on your device with IndexedDB as a durable backup. The Synapse Agent stores
              credentials in{' '}
              <code className="text-synapse-300 bg-white/[0.04] px-1.5 py-0.5 rounded text-xs">
                ~/.synapse/config.yaml
              </code>{' '}
              with restricted file permissions (0600).
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">6. Third-Party Services</h2>
            <ul className="space-y-2">
              <li>
                <strong className="text-gray-300">Supabase:</strong> Authentication, database,
                and real-time relay.
              </li>
              <li>
                <strong className="text-gray-300">Instapay:</strong> Payment processing for
                subscriptions.
              </li>
              <li>
                <strong className="text-gray-300">Vercel:</strong> Web application hosting.
              </li>
              <li>
                <strong className="text-gray-300">LogSnag:</strong> Business event tracking
                (optional, no user data).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">7. Data Retention</h2>
            <p>
              Account data is retained while your account is active. Conversation history can be
              deleted by you at any time. Upon account deletion, all associated data is
              permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Access your personal data</li>
              <li>Request deletion of your account and data</li>
              <li>Export your conversation history</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">9. Changes</h2>
            <p>
              We may update this policy. Material changes will be communicated via email. Continued
              use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">10. Contact</h2>
            <p>
              For privacy inquiries, email{' '}
              <a href="mailto:hello@synapse.dev" className="text-synapse-400 hover:text-synapse-300 transition-colors">
                hello@synapse.dev
              </a>.
            </p>
          </section>

          <p className="text-xs text-gray-600 pt-4 border-t border-white/[0.06]">
            Last updated: March 2026
          </p>
        </div>
      </div>
    </div>
  )
}
