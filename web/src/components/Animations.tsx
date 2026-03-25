import { motion, type Variants } from 'framer-motion'
import { type ReactNode } from 'react'

// ── Fade in from below ────────────────────────────────────
export function FadeIn({
  children,
  delay = 0,
  duration = 0.6,
  className = '',
  y = 30,
}: {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
  y?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Fade in from left / right ────────────────────────────
export function SlideIn({
  children,
  delay = 0,
  direction = 'left',
  className = '',
}: {
  children: ReactNode
  delay?: number
  direction?: 'left' | 'right'
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: direction === 'left' ? -40 : 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Scale in ──────────────────────────────────────────────
export function ScaleIn({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Stagger children (container) ─────────────────────────
const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export function StaggerContainer({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  )
}

// ── Magnetic button wrapper ──────────────────────────────
export function MagneticButton({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Glow card wrapper ────────────────────────────────────
export function GlowCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.3 } }}
      className={`group relative ${className}`}
    >
      {/* Glow effect on hover */}
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-synapse-500/20 via-purple-500/20 to-synapse-500/20 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500" />
      <div className="relative glass-card rounded-2xl p-6 h-full flex flex-col">
        {children}
      </div>
    </motion.div>
  )
}

// ── Animated counter ─────────────────────────────────────
export function AnimatedNumber({ value, className = '' }: { value: number; className?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className={className}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {value}
      </motion.span>
    </motion.span>
  )
}
