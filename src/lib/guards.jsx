import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import { useSubscription } from './subscription.js'

export function RequireAuth({ children }) {
  const { user, loading, supabaseReady } = useAuth()
  const location = useLocation()

  // If Supabase isn't configured at all (no .env keys yet), don't lock
  // the developer out of their own app mid-setup.
  if (!supabaseReady) return children

  if (loading) return <FullscreenNote text="Loading…" />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

export function RequireSubscription({ children }) {
  const location = useLocation()
  const { loading, isActive } = useSubscription()

  if (loading) return <FullscreenNote text="Loading…" />
  if (!isActive && location.pathname !== '/billing') {
    return <Navigate to="/billing" replace />
  }
  return children
}

function FullscreenNote({ text }) {
  return <div className="min-h-screen flex items-center justify-center text-inkSoft text-sm">{text}</div>
}
