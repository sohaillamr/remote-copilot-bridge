import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './hooks/useAuth'
import CustomCursor from './components/CustomCursor'
import ErrorBoundary from './components/ErrorBoundary'

// Helper to auto-reload if a lazy-loaded chunk fails (e.g., after a new deployment)
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        // Return a promise that never resolves so we don't trigger React's error boundary before reload
        return new Promise(() => {});
      }
      throw error;
    }
  });

const LoginPage = lazyWithRetry(() => import('./pages/Login'))
const LandingPage = lazyWithRetry(() => import('./pages/Landing'))
const PairPage = lazyWithRetry(() => import('./pages/Pair'))
const CliLogin = lazyWithRetry(() => import('./pages/CliLogin'))
import AppLayout from './layouts/AppLayout'
import AdminLayout from './layouts/AdminLayout'
import { Loader2 } from 'lucide-react'

// Lazy-load page components for code splitting
const Dashboard = lazyWithRetry(() => import('./pages/app/Dashboard'))
const Chat = lazyWithRetry(() => import('./pages/app/Chat'))
const FileBrowser = lazyWithRetry(() => import('./pages/app/FileBrowser'))
const GithubRepos = lazyWithRetry(() => import('./pages/app/GithubRepos'))
const Settings = lazyWithRetry(() => import('./pages/app/Settings'))
const TeamDashboard = lazyWithRetry(() => import('./pages/app/TeamDashboard'))
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazyWithRetry(() => import('./pages/admin/AdminUsers'))
const AdminRevenue = lazyWithRetry(() => import('./pages/admin/AdminRevenue'))
const AdminUsage = lazyWithRetry(() => import('./pages/admin/AdminUsage'))
const AdminSystem = lazyWithRetry(() => import('./pages/admin/AdminSystem'))
const Guide = lazyWithRetry(() => import('./pages/Guide'))
const Terms = lazyWithRetry(() => import('./pages/Terms'))
const Privacy = lazyWithRetry(() => import('./pages/Privacy'))
const NotFound = lazyWithRetry(() => import('./pages/NotFound'))

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
  const { user, profile, isLoading } = useAuth()
  if (isLoading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" />
  if (profile?.banned_at) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#09090b]">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
            <Loader2 className="text-red-400" size={24} />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Account Suspended</h2>
          <p className="text-sm text-gray-500">Your account has been suspended. Contact support if you believe this is an error.</p>
        </div>
      </div>
    )
  }
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

  // Use a stable key for nested routes — only animate between top-level sections
  // so that navigating /app/chat → /app/chat/:id does NOT unmount/remount Chat
  const routeKey = location.pathname.startsWith('/app')
    ? '/app'
    : location.pathname.startsWith('/admin')
      ? '/admin'
      : location.pathname

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
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
            <Route path="/pair" element={<PairPage />} />
            <Route path="/cli-login" element={<CliLogin />} />

            {/* User App */}
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="chat" element={<Chat />} />
              <Route path="chat/:id" element={<Chat />} />
              <Route path="files" element={<FileBrowser />} />
              <Route path="github" element={<GithubRepos />} />
              <Route path="settings" element={<Settings />} />
              <Route path="team" element={<TeamDashboard />} />
            </Route>

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminLayout /></AdminRoute></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="revenue" element={<AdminRevenue />} />
              <Route path="usage" element={<AdminUsage />} />
              <Route path="system" element={<AdminSystem />} />
            </Route>

            {/* Legal & Guide */}
            <Route path="/guide" element={<Guide />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            <Route path="*" element={<NotFound />} />
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
      <ErrorBoundary>
        <AnimatedRoutes />
      </ErrorBoundary>
    </AuthProvider>
  )
}
