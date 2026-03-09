import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex items-center justify-center h-full min-h-[50vh] bg-[#09090b]">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="text-red-400" size={24} />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-1">
              An unexpected error occurred. This has been logged.
            </p>
            {this.state.error && (
              <pre className="text-xs text-red-400/70 bg-red-500/5 rounded-lg px-3 py-2 mt-3 mb-4 max-h-24 overflow-auto text-left font-mono">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-sm transition-colors"
              >
                <RefreshCw size={14} />
                Try Again
              </button>
              <button
                onClick={() => { window.location.href = '/app' }}
                className="px-4 py-2 rounded-xl bg-synapse-600 hover:bg-synapse-700 text-white text-sm transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
