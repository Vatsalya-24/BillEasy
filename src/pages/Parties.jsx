import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, addParty, recordPayment } from '../lib/db.js'
import PageHeader from '../components/PageHeader.jsx'

const emptyForm = { name: '', phone: '', type: 'customer' }

export default function Parties() {
  const parties = useLiveQuery(() => db.parties.orderBy('name').toArray(), []) || []
  const [form, setForm] = useState(emptyForm)
  const [open, setOpen] = useState(false)
  const [payTarget, setPayTarget] = useState(null)
  const [payAmount, setPayAmount] = useState('')

  async function submit(e) {
    e.preventDefault()
    await addParty(form)
    setForm(emptyForm)
    setOpen(false)
  }

  async function submitPayment(e) {
    e.preventDefault()
    await recordPayment({ partyId: payTarget.id, amount: parseFloat(payAmount) || 0, mode: 'cash' })
    setPayTarget(null)
    setPayAmount('')
  }

  return (
    <div>
      <PageHeader
        title="Parties"
        subtitle={`${parties.length} customers & suppliers`}
        action={
          <button className="btn-stamp" onClick={() => setOpen(true)}>
            + Add Party
          </button>
        }
      />
      <div className="p-6 md:p-8">
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-left text-xs font-mono uppercase tracking-wide text-inkSoft/70 border-b border-rule">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium text-right">Balance</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {parties.map((p) => (
                <tr key={p.id} className="ledger-row">
                  <td className="px-5">{p.name}</td>
                  <td className="px-5 text-inkSoft capitalize">{p.type}</td>
                  <td className="px-5 text-inkSoft font-mono">{p.phone || '—'}</td>
                  <td className={`px-5 text-right num ${p.balance > 0 ? 'text-stamp' : 'text-ledger'}`}>
                    ₹{Math.abs(p.balance || 0).toFixed(2)} {p.balance > 0 ? 'due' : p.balance < 0 ? 'advance' : ''}
                  </td>
                  <td className="px-5 text-right">
                    {p.balance > 0 && (
                      <button className="text-xs text-ledger hover:opacity-70" onClick={() => setPayTarget(p)}>
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {parties.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-5 py-8 text-center text-inkSoft text-sm">
                    No parties yet — add a customer or supplier to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={submit} className="card w-full max-w-md p-6 space-y-4 bg-paper">
            <h2 className="font-serif text-xl">Add Party</h2>
            <div>
              <label className="text-xs font-mono uppercase text-inkSoft">Name</label>
              <input required className="input-field mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-inkSoft">Phone</label>
              <input className="input-field mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-inkSoft">Type</label>
              <select className="input-field mt-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="px-4 py-2 text-sm text-inkSoft" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Party
              </button>
            </div>
          </form>
        </div>
      )}

      {payTarget && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={submitPayment} className="card w-full max-w-sm p-6 space-y-4 bg-paper">
            <h2 className="font-serif text-xl">Record Payment</h2>
            <p className="text-sm text-inkSoft">
              {payTarget.name} owes <span className="num text-stamp">₹{payTarget.balance.toFixed(2)}</span>
            </p>
            <div>
              <label className="text-xs font-mono uppercase text-inkSoft">Amount Received (₹)</label>
              <input required type="number" step="0.01" className="input-field mt-1" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="px-4 py-2 text-sm text-inkSoft" onClick={() => setPayTarget(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Payment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
