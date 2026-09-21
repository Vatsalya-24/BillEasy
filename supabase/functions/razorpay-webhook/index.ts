// Supabase Edge Function: razorpay-webhook
// Razorpay calls this URL directly (not the browser) whenever a payment or
// subscription event happens. It verifies the request really came from
// Razorpay using the webhook secret, then updates the subscriptions table —
// this is the only place subscription status actually changes to 'active',
// so a user can't grant themselves access from the frontend.
//
// Deploy with: supabase functions deploy razorpay-webhook --no-verify-jwt
// Then paste the deployed URL into Razorpay Dashboard > Settings > Webhooks,
// subscribing to: subscription.activated, subscription.charged,
// subscription.completed, subscription.cancelled, subscription.halted,
// payment.failed
//
// Requires this secret: RAZORPAY_WEBHOOK_SECRET (set it to the same value
// you enter when creating the webhook in the Razorpay dashboard).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!

async function verifySignature(body: string, signature: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === signature
}

const STATUS_MAP: Record<string, string> = {
  'subscription.activated': 'active',
  'subscription.charged': 'active',
  'subscription.completed': 'cancelled',
  'subscription.cancelled': 'cancelled',
  'subscription.halted': 'past_due',
  'payment.failed': 'past_due'
}

Deno.serve(async (req) => {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature') || ''

  const valid = await verifySignature(body, signature)
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
  }

  const event = JSON.parse(body)
  const newStatus = STATUS_MAP[event.event]
  const razorpaySubEntity = event.payload?.subscription?.entity
  const razorpaySubscriptionId = razorpaySubEntity?.id
  const tier = razorpaySubEntity?.notes?.tier

  if (newStatus && razorpaySubscriptionId) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const update: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }
    if (razorpaySubEntity.current_end) {
      update.current_period_end = new Date(razorpaySubEntity.current_end * 1000).toISOString()
    }
    if (tier) update.tier = tier

    await supabase.from('subscriptions').update(update).eq('razorpay_subscription_id', razorpaySubscriptionId)
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
})
