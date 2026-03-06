import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './hooks/useAuth'
import CustomCursor from './components/CustomCursor'
import LandingPage from './pages/Landing'
import LoginPage from './pages/Login'
import AppLayout from './layouts/AppLayout'
import AdminLayout from './layouts/AdminLayout'
import { Loader2 } from 'lucide-react'

// Lazy-load page components for code splitting
const Dashboard = lazy(() => import('./pages/app/Dashboard'))
const Chat = lazy(() => import('./pages/app/Chat'))
const FileBrowser = lazy(() => import('./pages/app/FileBrowser'))
const Settings = lazy(() => import('./pages/app/Settings'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminRevenue = lazy(() => import('./pages/admin/AdminRevenue'))
const AdminUsage = lazy(() => import('./pages/admin/AdminUsage'))
const AdminSystem = lazy(() => import('./pages/admin/AdminSystem'))

const Loader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="animate-spin text-synapse-400" size={28} />
  </div>
)

const FullScreenLoader = () => (
  <div className="flex items-center justify-center h-screen bg-[#09090b]">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="animate-spin text-synapse-400" size={32} />
      <span className="text-xs text-gray-600 font-mono">Loading...</span>
    </div>
  </div>
)

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth()
  if (isLoading) return <FullScreenLoader />
  if (!isAdmin) return <Navigate to="/app" />
  return <>{children}</>
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <Suspense fallback={<Loader />}>
          <Routes location={location}>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* User App */}
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="chat" element={<Chat />} />
              <Route path="chat/:id" element={<Chat />} />
              <Route path="files" element={<FileBrowser />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminLayout /></AdminRoute></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="revenue" element={<AdminRevenue />} />
              <Route path="usage" element={<AdminUsage />} />
              <Route path="system" element={<AdminSystem />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CustomCursor />
      <AnimatedRoutes />
    </AuthProvider>
  )
}
