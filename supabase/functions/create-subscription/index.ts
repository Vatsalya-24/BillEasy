// Supabase Edge Function: create-subscription
// Called from the Billing page when someone picks a plan. Creates (or
// reuses) a Razorpay customer and starts a subscription for the signed-in
// user, returning what the frontend needs to open Razorpay Checkout.
// The Razorpay *secret* key only ever lives here, as a Supabase secret —
// never in frontend code.
//
// Deploy with: supabase functions deploy create-subscription
// Requires these secrets set via `supabase secrets set`:
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_PLAN_BASIC, RAZORPAY_PLAN_PRO
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!
const PLAN_IDS: Record<string, string> = {
  basic: Deno.env.get('RAZORPAY_PLAN_BASIC')!,
  pro: Deno.env.get('RAZORPAY_PLAN_PRO')!
}

const authHeader = (id: string, secret: string) => 'Basic ' + btoa(`${id}:${secret}`)

Deno.serve(async (req) => {
  // The browser sends an OPTIONS preflight before the real POST; answer it
  // with the CORS headers or the actual request never gets sent.
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { planTier } = await req.json()
    const planId = PLAN_IDS[planTier]
    if (!planId) {
      return new Response(JSON.stringify({ error: 'Unknown plan' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '')
    const { data: userData, error: userErr } = await supabase.auth.getUser(authToken)
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: corsHeaders })
    }
    const user = userData.user

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Reuse an existing Razorpay customer if we already made one.
    let customerId = sub?.razorpay_customer_id
    if (!customerId) {
      const custRes = await fetch('https://api.razorpay.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: authHeader(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: user.email, notes: { supabase_user_id: user.id } })
      })
      const cust = await custRes.json()
      if (!custRes.ok) {
        // Razorpay enforces one customer per email per account. If an
        // earlier attempt (e.g. one that failed before we saved the row)
        // already created this customer, Razorpay returns their existing
        // id in error.metadata — reuse it instead of failing.
        const existingId = cust.error?.metadata?.customer_id
        if (existingId) {
          customerId = existingId
        } else {
          throw new Error(cust.error?.description || 'Failed to create Razorpay customer')
        }
      } else {
        customerId = cust.id
      }
    }

    const subRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: authHeader(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan_id: planId,
        customer_notify: 1,
        total_count: 120, // effectively "until cancelled" for a monthly plan
        notes: { supabase_user_id: user.id, tier: planTier }
      })
    })
    const razorpaySub = await subRes.json()
    if (!subRes.ok) throw new Error(razorpaySub.error?.description || 'Failed to create subscription')

    await supabase
      .from('subscriptions')
      .update({
        razorpay_customer_id: customerId,
        razorpay_subscription_id: razorpaySub.id,
        tier: planTier,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    return new Response(
      JSON.stringify({ subscriptionId: razorpaySub.id, keyId: RAZORPAY_KEY_ID }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})
