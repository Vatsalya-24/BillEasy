import { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { useSubscription } from '../lib/subscription.js'
import { supabase } from '../lib/supabase.js'
import PageHeader from '../components/PageHeader.jsx'

const PLANS = [
  {
    tier: 'basic',
    name: 'Basic',
    price: '₹299',
    period: '/month',
    features: ['Unlimited invoices', 'Unlimited items & parties', 'PDF export', 'Cloud sync across devices']
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '₹799',
    period: '/month',
    features: ['Everything in Basic', 'Multi-device priority sync', 'Priority support', 'Early access to new features']
  }
]

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Billing() {
  const { user, signOut } = useAuth()
  const { subscription, tier, isActive, isTrialing, trialDaysLeft } = useSubscription()
  const [loadingTier, setLoadingTier] = useState(null)
  const [error, setError] = useState('')

  async function subscribe(planTier) {
    setError('')
    setLoadingTier(planTier)
    try {
      const ok = await loadRazorpayScript()
      if (!ok) throw new Error('Could not load Razorpay checkout. Check your connection and try again.')

      const { data, error: fnError } = await supabase.functions.invoke('create-subscription', {
        body: { planTier }
      })
      if (fnError) throw fnError
      if (data.error) throw new Error(data.error)

      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'BillEasy',
        description: `${planTier === 'pro' ? 'Pro' : 'Basic'} plan`,
        prefill: { email: user.email },
        theme: { color: '#14213D' },
        handler: function () {
          // Razorpay confirms success client-side here, but the source of
          // truth is the webhook — it flips subscriptions.status to
          // 'active' server-side once payment actually clears. The
          // realtime subscription in useSubscription() picks that up
          // automatically, so no manual refresh is needed here.
        }
      })
      rzp.open()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingTier(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Choose a plan to keep using BillEasy"
        action={
          <button className="text-xs text-inkSoft hover:text-ink" onClick={signOut}>
            Sign out
          </button>
        }
      />
      <div className="p-6 md:p-8 max-w-3xl space-y-6">
        {isTrialing && (
          <div className="card p-4 text-sm bg-ledgerSoft/30 border-ledger/40">
            You're on a free trial —{' '}
            <span className="font-medium">
              {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left
            </span>
            . Subscribe any time to keep access after it ends.
          </div>
        )}
        {!isTrialing && subscription && !isActive && (
          <div className="card p-4 text-sm bg-stampSoft/40 border-stamp/40">
            Your trial has ended{subscription.status === 'past_due' ? ' and your last payment failed' : ''}.
            Subscribe below to get back into your bills, items and reports — none of your data was deleted.
          </div>
        )}

        {subscription && isActive && (
          <div className="card p-4 flex items-center justify-between text-sm">
            <span>
              Current plan: <span className="font-medium capitalize">{tier}</span>
            </span>
            {subscription.current_period_end && (
              <span className="text-inkSoft text-xs">
                Renews {new Date(subscription.current_period_end).toLocaleDateString('en-IN')}
              </span>
            )}
          </div>
        )}

        {error && <div className="text-sm text-stamp">{error}</div>}

        <div className="grid md:grid-cols-2 gap-4">
          {PLANS.map((plan) => {
            const current = isActive && tier === plan.tier
            return (
              <div key={plan.tier} className="card p-6 flex flex-col">
                <div className="font-serif text-xl">{plan.name}</div>
                <div className="mt-2">
                  <span className="font-serif text-3xl num">{plan.price}</span>
                  <span className="text-inkSoft text-sm">{plan.period}</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-inkSoft flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-ledger">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`mt-6 ${current ? 'card text-inkSoft cursor-default' : 'btn-stamp'} px-4 py-2 text-sm`}
                  disabled={current || loadingTier === plan.tier}
                  onClick={() => subscribe(plan.tier)}
                >
                  {current ? 'Current plan' : loadingTier === plan.tier ? 'Loading…' : `Subscribe to ${plan.name}`}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
