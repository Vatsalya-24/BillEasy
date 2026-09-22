import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseReady } from './supabase.js'
import { ensureUserScope } from './db.js'

const AuthContext = createContext({ user: null, loading: true })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(supabaseReady)

  useEffect(() => {
    if (!supabaseReady) return

    async function applyUser(nextUser) {
      // Wipe any other account's cached data before this account's UI can
      // render or sync, so nothing crosses between accounts sharing a browser.
      if (nextUser) await ensureUserScope(nextUser.id)
      setUser(nextUser)
    }

    supabase.auth.getSession().then(async ({ data }) => {
      await applyUser(data.session?.user || null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user || null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signInWithEmail(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail, signOut, supabaseReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}