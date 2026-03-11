import { useState, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { AgentRelayProvider } from '../contexts/AgentRelayContext'
import ToastContainer from '../components/ToastContainer'
import { MessageSquare, FolderOpen, Settings, LayoutDashboard, LogOut, Shield, Zap, Menu, X } from 'lucide-react'

const navItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/chat', icon: MessageSquare, label: 'Chat', end: false },
  { to: '/app/files', icon: FolderOpen, label: 'Files', end: false },
  { to: '/app/settings', icon: Settings, label: 'Settings', end: false },
]

export default function AppLayout() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  const handleSignOut = async () => {
    closeSidebar()
    await signOut()
    navigate('/')
  }

  /* ── Sidebar inner content (plain JSX, NOT a component) ── */
  const sidebarInner = (
    <>
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Zap className="text-synapse-400" size={18} />
              <div className="absolute inset-0 bg-synapse-500/20 blur-md rounded-full" />
            </div>
            <span className="text-base font-bold tracking-tight">Synapse</span>
          </div>
          <button
            onClick={closeSidebar}
            className="md:hidden p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 transition-colors active:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2 truncate font-mono">{profile?.email || user?.email}</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, end }, i) => (
          <motion.div
            key={to}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <NavLink
              to={to}
              end={end}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-synapse-600/15 text-synapse-400 shadow-[inset_0_0_20px_rgba(139,92,246,0.05)]'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/[0.06] space-y-0.5">
        {isAdmin && (
          <NavLink
            to="/admin"
            onClick={closeSidebar}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/[0.06] transition-all duration-200"
          >
            <Shield size={17} />
            Admin Panel
          </NavLink>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-gray-400 hover:bg-white/[0.03] transition-all duration-200 w-full"
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <AgentRelayProvider>
      <div className="flex h-screen bg-[#09090b]">
        {/* Desktop Sidebar — always visible at md+ */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="hidden md:flex w-64 border-r border-white/[0.06] flex-col bg-[#0c0c0f]/80 backdrop-blur-xl"
        >
          {sidebarInner}
        </motion.aside>

        {/* Mobile overlay + drawer — keyed motion elements, no Fragment wrapper */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              key="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeSidebar}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              style={{ touchAction: 'none' }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              key="sidebar-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] max-w-[85vw] border-r border-white/[0.06] flex flex-col bg-[#0c0c0f]/95 backdrop-blur-xl z-50 md:hidden"
              style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
              {sidebarInner}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 overflow-auto flex flex-col">
          {/* Mobile top bar */}
          <div
            className="md:hidden flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06] bg-[#0c0c0f]/80 backdrop-blur-xl sticky top-0 z-30"
            style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-white/[0.06] text-gray-400 transition-colors active:bg-white/10"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Zap className="text-synapse-400" size={16} />
              <span className="text-sm font-bold">Synapse</span>
            </div>
            <div className="w-9" />
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="h-full flex-1"
          >
            <Outlet />
          </motion.div>
        </main>

        <ToastContainer />
      </div>
    </AgentRelayProvider>
  )
}