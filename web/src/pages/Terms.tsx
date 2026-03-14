import { Link } from 'react-router-dom'
import { ArrowLeft, Zap } from 'lucide-react'
import GridBackground from '../components/GridBackground'

export default function Terms() {
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
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">Terms of Service</h1>

        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 text-sm text-gray-400 leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-base mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Synapse (&quot;the Service&quot;), you agree to be bound by these Terms
              of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">2. Description of Service</h2>
            <p>
              Synapse provides a web-based interface to remotely access AI CLI tools (such as GitHub
              Copilot, Claude, Gemini, and others) running on your local machine. The Service acts
              as a relay &mdash; your code and data are processed locally on your own hardware.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">3. Account &amp; Authentication</h2>
            <p>
              You must provide a valid email to create an account. You are responsible for
              maintaining the security of your account credentials and pairing codes. Sharing
              account access is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">4. Subscription &amp; Billing</h2>
            <p>
              Synapse offers a 7-day free trial. After the trial period, a paid subscription is
              required to continue using the Service. Payments are processed through our payment
              provider (Paymob). You may cancel at any time &mdash; access continues until the end
              of your billing period.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Use the Service for illegal activities</li>
              <li>Attempt to circumvent rate limits or subscription enforcement</li>
              <li>Execute dangerous system commands through the agent</li>
              <li>Reverse engineer or interfere with the Service infrastructure</li>
              <li>Share, resell, or redistribute access to the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">6. Data &amp; Privacy</h2>
            <p>
              Synapse relays prompts between your browser and your local machine via encrypted
              channels. We do not store, read, or process your code. See our{' '}
              <Link to="/privacy" className="text-synapse-400 hover:text-synapse-300 transition-colors">
                Privacy Policy
              </Link>{' '}
              for details.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">7. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; without warranty of any kind. We do not
              guarantee uninterrupted availability, and are not responsible for the output of
              third-party AI tools running on your machine.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">8. Limitation of Liability</h2>
            <p>
              Synapse shall not be liable for any indirect, incidental, or consequential damages
              arising from your use of the Service, including but not limited to data loss, system
              damage, or errors in AI-generated output.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">9. Changes to Terms</h2>
            <p>
              We may update these terms at any time. Continued use of the Service after changes
              constitutes acceptance of the updated terms. We will notify users of material
              changes via email.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">10. Contact</h2>
            <p>
              For questions about these terms, contact us at{' '}
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
