import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useRelay } from '../contexts/AgentRelayContext'

const icons = {
  info: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
}

const colors = {
  info: 'border-synapse-500/20 bg-synapse-500/10 text-synapse-300',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  error: 'border-red-500/20 bg-red-500/10 text-red-300',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useRelay()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const Icon = icons[toast.type]
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-xl text-sm ${colors[toast.type]}`}
            >
              <Icon size={15} className="shrink-0" />
              <span className="flex-1 text-xs">{toast.message}</span>
              <button
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              >
                <X size={13} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
