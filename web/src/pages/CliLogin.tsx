import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Loader2, Terminal, CheckCircle, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function CliLogin() {
  const { session, isLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading'|'success'|'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const port = searchParams.get('port') || '7890'

  useEffect(() => {
    if (isLoading) return
    if (!session) {
      // Redirect to login page and save intention
      sessionStorage.setItem('synapse_redirect_after_login', `/cli-login?port=${port}`)
      navigate('/login')
      return
    }

    // Got session! Pass back to CLI
    try {
      const url = `http://127.0.0.1:${port}/callback#access_token=${session.access_token}&refresh_token=${session.refresh_token}&expires_in=3600`
      window.location.href = url
      setStatus('success')
    } catch (e: any) {
      setStatus('error')
      setErrorMsg(e.message)
    }
  }, [isLoading, session, port, navigate])

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 text-white font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#12121a] border border-white/[0.06] rounded-2xl p-8 text-center shadow-xl"
      >
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-synapse-500/10 flex items-center justify-center">
              <Loader2 className="animate-spin text-synapse-400" size={32} />
            </div>
            <h1 className="text-xl font-bold">Authorizing CLI...</h1>
            <p className="text-sm text-gray-500">Please wait while we securely connect your terminal.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="text-emerald-400" size={32} />
            </div>
            <h1 className="text-xl font-bold">Success!</h1>
            <p className="text-sm text-gray-500">You can safely close this page and return to your terminal.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <XCircle className="text-red-400" size={32} />
            </div>
            <h1 className="text-xl font-bold">Authorization Failed</h1>
            <p className="text-sm text-gray-500">{errorMsg}</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
