import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseReady = Boolean(url && anonKey)

// If the .env values aren't set yet, the app still runs fully offline —
// sync-related UI just stays hidden until they're provided.
export const supabase = supabaseReady ? createClient(url, anonKey) : null
