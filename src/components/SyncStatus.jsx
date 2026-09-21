import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { fullSync, getLastSync } from '../lib/sync.js'

export default function SyncStatus() {
  const { user, signOut, supabaseReady } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle') // idle | syncing | synced | error
  const [lastSync, setLastSync] = useState(null)

  async function runSync() {
    if (!user) return
    setStatus('syncing')
    try {
      await fullSync(user.id)
      setLastSync(Date.now())
      setStatus('synced')
    } catch (e) {
      console.error(e)
      setStatus('error')
    }
  }

  useEffect(() => {
    if (!user) return
    getLastSync().then(setLastSync)
    runSync()
    const onOnline = () => runSync()
    window.addEventListener('online', onOnline)
    const interval = setInterval(runSync, 60000)
    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(interval)
    }
  }, [user])

  if (!supabaseReady) {
    return (
      <div className="px-5 py-3 text-xs text-paper/40 border-t border-paper/10">
        Offline mode — add Supabase keys to enable sync
      </div>
    )
  }

  if (!user) {
    return (
      <button
        onClick={() => navigate('/login')}
        className="px-5 py-3 text-xs text-paper/70 hover:text-paper border-t border-paper/10 text-left"
      >
        Sign in to sync →
      </button>
    )
  }

  const label =
    status === 'syncing' ? 'Syncing…' : status === 'error' ? 'Sync failed — retrying' : 'Synced'
  const dotColor = status === 'error' ? 'bg-stamp' : status === 'syncing' ? 'bg-yellow-400' : 'bg-ledger'

  return (
    <div className="border-t border-paper/10 px-5 py-3 text-xs text-paper/70">
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        {label}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="truncate max-w-[110px]">{user.email}</span>
        <button onClick={signOut} className="hover:text-paper">
          Sign out
        </button>
      </div>
    </div>
  )
}
