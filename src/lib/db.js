import Dexie from 'dexie'

// Offline-first local database. Every write lands here first, then the
// sync layer (see lib/sync.js) pushes/pulls against Supabase when online.
// Primary keys are client-generated UUIDs (not auto-increment) so records
// created on different devices never collide once synced.
export const db = new Dexie('billeasy')

db.version(1).stores({
  items: 'id, name, sku, taxRate, stock, unit, updatedAt',
  parties: 'id, name, phone, type, balance, updatedAt',
  invoices: 'id, invoiceNo, partyId, date, status, total, updatedAt',
  invoiceLines: 'id, invoiceId, itemId, qty, price, taxRate, updatedAt',
  payments: 'id, invoiceId, partyId, amount, mode, date, updatedAt',
  meta: 'key'
})

export function genId() {
  return crypto.randomUUID()
}

// If another tab resets the local database (see main.jsx), release this
// tab's connection so that reset isn't blocked waiting on it.
db.on('versionchange', () => {
  db.close()
})

// The local cache is per-browser, not per-account. If a different person
// signs in on the same browser, wipe the previous person's cached data
// first — otherwise their bills/items would bleed into the new account's
// view, and worse, could get pushed up to the new account's cloud data on
// next sync. Call this right after every successful sign-in.
export async function ensureUserScope(userId) {
  const active = await db.meta.get('activeUser')
  if (active?.value && active.value !== userId) {
    await db.items.clear()
    await db.parties.clear()
    await db.invoices.clear()
    await db.invoiceLines.clear()
    await db.payments.clear()
  }
  await db.meta.put({ key: 'activeUser', value: userId })
}

// --- Items ---
export async function addItem(item) {
  const id = genId()
  await db.items.add({ id, ...item, updatedAt: Date.now() })
  return id
}
export async function updateItem(id, changes) {
  return db.items.update(id, { ...changes, updatedAt: Date.now() })
}
export async function deleteItem(id) {
  return db.items.delete(id)
}

// --- Parties ---
export async function addParty(party) {
  const id = genId()
  await db.parties.add({ id, balance: 0, ...party, updatedAt: Date.now() })
  return id
}
export async function updateParty(id, changes) {
  return db.parties.update(id, { ...changes, updatedAt: Date.now() })
}

// --- Invoices ---
export async function nextInvoiceNo() {
  const count = await db.invoices.count()
  const year = new Date().getFullYear()
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`
}

export async function createInvoice({ partyId, date, lines, status = 'due' }) {
  return db.transaction('rw', db.invoices, db.invoiceLines, db.items, db.parties, async () => {
    let total = 0
    for (const line of lines) {
      total += line.qty * line.price * (1 + line.taxRate / 100)
    }
    const invoiceNo = await nextInvoiceNo()
    const invoiceId = genId()
    const now = Date.now()
    await db.invoices.add({
      id: invoiceId,
      invoiceNo,
      partyId: partyId || null,
      date: date || new Date().toISOString().slice(0, 10),
      status,
      total: Math.round(total * 100) / 100,
      updatedAt: now
    })
    for (const line of lines) {
      await db.invoiceLines.add({ id: genId(), invoiceId, ...line, updatedAt: now })
      const item = await db.items.get(line.itemId)
      if (item) {
        await db.items.update(line.itemId, { stock: (item.stock || 0) - line.qty, updatedAt: now })
      }
    }
    if (partyId && status === 'due') {
      const party = await db.parties.get(partyId)
      if (party) {
        await db.parties.update(partyId, { balance: (party.balance || 0) + total, updatedAt: now })
      }
    }
    return invoiceId
  })
}

export async function recordPayment({ invoiceId, partyId, amount, mode }) {
  return db.transaction('rw', db.payments, db.invoices, db.parties, async () => {
    const now = Date.now()
    await db.payments.add({
      id: genId(),
      invoiceId: invoiceId || null,
      partyId: partyId || null,
      amount,
      mode,
      date: new Date().toISOString().slice(0, 10),
      updatedAt: now
    })
    if (invoiceId) {
      await db.invoices.update(invoiceId, { status: 'paid', updatedAt: now })
    }
    if (partyId) {
      const party = await db.parties.get(partyId)
      if (party) {
        await db.parties.update(partyId, { balance: (party.balance || 0) - amount, updatedAt: now })
      }
    }
  })
}