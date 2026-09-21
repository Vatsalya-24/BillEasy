# BillEasy

Offline-first GST billing, inventory and party ledger app. One React codebase, three targets: web, installable mobile PWA, and desktop (Electron).

## Stack
- React + Vite + Tailwind
- Dexie (IndexedDB) — all data is local-first; every screen reads live from the browser database via `dexie-react-hooks`, so it works fully offline
- jsPDF — invoice PDF export
- vite-plugin-pwa — installable app, offline caching, manifest + service worker

## Setup
```bash
npm install
cp .env.example .env   # then fill in your Supabase URL + anon key (see below)
```

## Cloud sync setup (Supabase)
1. Create a free project at supabase.com.
2. Open the **SQL Editor** in your project, paste in the contents of `supabase_schema.sql` from this repo, and run it. This creates the `items`, `parties`, `invoices`, `invoice_lines`, `payments` tables with row-level security, so each signed-in user only ever sees their own data.
3. Go to **Project Settings → API**, copy the **Project URL** and **anon public** key, and put them in `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
4. In **Authentication → Providers**, make sure **Email** is enabled (it is by default). The app uses magic-link (passwordless) email sign-in.
5. Restart `npm run dev`. Until `.env` is filled in, the app runs fully offline with no sync UI — nothing breaks by leaving it blank.

Once signed in on a device, the sidebar shows sync status and syncs automatically: on sign-in, every 60 seconds, and whenever the browser comes back online. Sign in with the same email on a second device (phone, desktop) and its local data merges in — last write wins per record if the same item was edited on two devices before syncing.

## Run on web (and test as PWA)
```bash
npm run dev
```
Open the printed localhost URL. To test the installable/offline behavior, run `npm run build && npm run preview` — PWA features only activate on a production build.

## Run on mobile
No separate build needed — deploy the web build anywhere (Vercel, Netlify, your own server) and open it on a phone browser. The browser will offer "Add to Home Screen" / "Install app", which gives it a home-screen icon and offline support.

## Run on desktop (Electron)
```bash
npm run electron:dev     # dev mode, hot reload
npm run electron:build   # produces installers in /release
```

## Data model
Everything lives in Dexie tables defined in `src/lib/db.js`: `items`, `parties`, `invoices`, `invoiceLines`, `payments`. Writes go straight to IndexedDB, so the UI never waits on a network call.

## What's here (MVP scope)
- Item/inventory catalogue with stock tracking
- Party (customer/supplier) ledger with running balances
- Invoice creation with multi-line items, per-item tax rate, auto totals
- Mark invoices paid / record partial payments against a party balance
- PDF invoice export
- Dashboard with today's sales, dues, low stock
- Reports: total sales, collected vs outstanding, tax collected, top-selling items

## Subscriptions (Razorpay)

The whole app is gated: every new signup gets a 14-day free trial with full access, then needs a Basic or Pro subscription to continue. This needs a small serverless backend (Supabase Edge Functions) because Razorpay's secret key can never live in frontend code, and webhook events need a real server URL to land on.

### 1. Database
Run `supabase_subscriptions.sql` in the Supabase SQL editor (after `supabase_schema.sql`). This creates the `subscriptions` table and a trigger that gives every new signup a 14-day trial row automatically. Change the trial length by editing the `interval '14 days'` line before running it.

### 2. Razorpay setup
1. Create an account at razorpay.com and complete KYC (required before you can accept live payments — test mode works immediately without it).
2. Go to **Subscriptions → Plans** and create two plans, one for Basic and one for Pro, matching whatever price you want. Copy each plan's ID (looks like `plan_xxxxx`).
3. Go to **Settings → API Keys** and generate a Key ID + Key Secret.

### 3. Deploy the Edge Functions
Install the Supabase CLI if you don't have it (`npm install -g supabase`), then from this project folder:
```bash
supabase login
supabase link --project-ref <your-project-ref>   # found in your Supabase project URL

supabase secrets set \
  RAZORPAY_KEY_ID=xxxx \
  RAZORPAY_KEY_SECRET=xxxx \
  RAZORPAY_PLAN_BASIC=plan_xxxx \
  RAZORPAY_PLAN_PRO=plan_xxxx \
  RAZORPAY_WEBHOOK_SECRET=choose-any-strong-secret-string

supabase functions deploy create-subscription
supabase functions deploy razorpay-webhook --no-verify-jwt
```
The second deploy prints a URL like `https://<ref>.functions.supabase.co/razorpay-webhook`.

### 4. Wire up the webhook
In Razorpay: **Settings → Webhooks → Add New Webhook**. Paste that URL, set the **Secret** to the exact same string you used for `RAZORPAY_WEBHOOK_SECRET` above, and subscribe to these events: `subscription.activated`, `subscription.charged`, `subscription.completed`, `subscription.cancelled`, `subscription.halted`, `payment.failed`.

### How enforcement works
- Signing in is now required to use the app at all (previously optional).
- `subscriptions.status` starts as `trialing`; the app checks `trial_ends_at` on every load.
- Once trial ends (or a payment fails), the app redirects everywhere to `/billing` until they subscribe.
- Only the webhook function (using the service role key) can ever set `status` to `active` — a user can't grant themselves access by editing client-side state.
- This is best-effort, like any client app with local offline data — not meant to be unbypassable by a determined user, but enough for a normal small-business product.

## What's intentionally left out (v2)
- Cloud sync/auth (Firebase/Supabase) — hook point is `src/lib/db.js`; add a sync layer that pushes/pulls Dexie tables when online
- E-invoice/e-way bill generation, barcode scanning, OCR scan-to-bill, WhatsApp integration, multi-user roles
- Tauri packaging (lighter alternative to Electron) — swap in if bundle size matters more than Electron's larger ecosystem
