import { supabase } from './supabase.js'
import { db } from './db.js'

// Local Dexie table name -> remote Supabase table name.
const TABLE_MAP = {
  items: 'items',
  parties: 'parties',
  invoices: 'invoices',
  invoiceLines: 'invoice_lines',
  payments: 'payments'
}

// Simple last-write-wins sync, keyed on `updatedAt`. Good enough for a
// single owner using the app across a couple of their own devices.
// Not built for concurrent multi-user editing of the same record.

export async function pushAll(userId) {
  for (const [local, remote] of Object.entries(TABLE_MAP)) {
    const rows = await db[local].toArray()
    if (rows.length === 0) continue
    const payload = rows.map((r) => ({ ...r, user_id: userId }))
    const { error } = await supabase.from(remote).upsert(payload, { onConflict: 'id' })
    if (error) throw new Error(`Push failed for ${remote}: ${error.message}`)
  }
}

export async function pullAll(userId) {
  for (const [local, remote] of Object.entries(TABLE_MAP)) {
    const { data, error } = await supabase.from(remote).select('*').eq('user_id', userId)
    if (error) throw new Error(`Pull failed for ${remote}: ${error.message}`)
    for (const row of data) {
      const { user_id, ...rest } = row
      const existing = await db[local].get(rest.id)
      if (!existing || (rest.updatedAt || 0) > (existing.updatedAt || 0)) {
        await db[local].put(rest)
      }
    }
  }
}

export async function fullSync(userId) {
  await pullAll(userId)
  await pushAll(userId)
  await db.meta.put({ key: 'lastSync', value: Date.now() })
}

export async function getLastSync() {
  const row = await db.meta.get('lastSync')
  return row?.value || null
}
