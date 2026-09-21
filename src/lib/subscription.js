import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from './auth.jsx'

export function isEntitled(sub) {
  if (!sub) return false
  if (sub.status === 'active') return true
  if (sub.status === 'trialing') return new Date(sub.trial_ends_at).getTime() > Date.now()
  return false
}

export function trialDaysLeft(sub) {
  if (!sub || sub.status !== 'trialing') return 0
  const ms = new Date(sub.trial_ends_at).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !supabase) {
      setSubscription(null)
      setLoading(false)
      return
    }
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle()
      if (!cancelled) {
        setSubscription(data)
        setLoading(false)
      }
    }
    load()

    // Live-update the app the moment the webhook flips status server-side —
    // e.g. right after a payment clears, without needing a page refresh.
    // Channel name must be unique per instance: more than one component
    // can call useSubscription() at the same time (e.g. the route guard
    // and the Billing page itself), and Supabase Realtime rejects two
    // simultaneous subscriptions sharing one channel name.
    const channel = supabase
      .channel(`subscription-changes-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
        load
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user])

  return {
    subscription,
    loading,
    isActive: isEntitled(subscription),
    isTrialing: subscription?.status === 'trialing',
    trialDaysLeft: trialDaysLeft(subscription),
    tier: subscription?.tier || 'free'
  }
}
