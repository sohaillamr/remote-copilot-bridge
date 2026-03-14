import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Ghost, ArrowLeft, Home, Sparkles } from 'lucide-react'
import GridBackground from '../components/GridBackground'

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-[#09090b] flex items-center justify-center overflow-hidden">
      <GridBackground />

      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-synapse-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center px-6 max-w-lg">
        {/* 404 number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-8"
        >
          <h1 className="text-[120px] sm:text-[160px] font-black leading-none tracking-tight bg-gradient-to-b from-white/20 to-white/[0.03] bg-clip-text text-transparent select-none">
            404
          </h1>
        </motion.div>

        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-synapse-500/10 border border-synapse-500/20 flex items-center justify-center">
              <Ghost className="text-synapse-400" size={28} />
            </div>
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="text-synapse-400/60" size={14} />
            </motion.div>
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            Page not found
          </h2>
          <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex items-center justify-center gap-3"
        >
          <Link
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-synapse-600 hover:bg-synapse-700 text-white text-sm font-medium transition-colors"
          >
            <Home size={15} />
            Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-sm transition-colors"
          >
            <ArrowLeft size={15} />
            Go Back
          </button>
        </motion.div>
      </div>
    </div>
  )
}
