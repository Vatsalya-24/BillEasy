import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db, createInvoice } from '../lib/db.js'
import PageHeader from '../components/PageHeader.jsx'

export default function InvoiceForm() {
  const navigate = useNavigate()
  const items = useLiveQuery(() => db.items.orderBy('name').toArray(), []) || []
  const parties = useLiveQuery(() => db.parties.orderBy('name').toArray(), []) || []

  const [partyId, setPartyId] = useState('')
  const [lines, setLines] = useState([])
  const [saving, setSaving] = useState(false)

  function addLine() {
    if (items.length === 0) return
    const first = items[0]
    setLines([...lines, { itemId: first.id, qty: 1, price: first.price, taxRate: first.taxRate }])
  }

  function updateLine(idx, changes) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...changes } : l)))
  }

  function removeLine(idx) {
    setLines(lines.filter((_, i) => i !== idx))
  }

  function onItemChange(idx, itemId) {
    const item = items.find((i) => i.id === itemId)
    updateLine(idx, { itemId, price: item?.price || 0, taxRate: item?.taxRate || 0 })
  }

  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0)
  const taxTotal = lines.reduce((s, l) => s + l.qty * l.price * (l.taxRate / 100), 0)
  const grandTotal = subtotal + taxTotal

  async function submit(status) {
    if (lines.length === 0) return
    setSaving(true)
    await createInvoice({ partyId: partyId || null, lines, status })
    setSaving(false)
    navigate('/invoices')
  }

  return (
    <div>
      <PageHeader title="New Bill" subtitle="Add items and generate a GST-ready invoice" />
      <div className="p-6 md:p-8 max-w-3xl space-y-6">
        <div className="card p-5">
          <label className="text-xs font-mono uppercase text-inkSoft">Customer</label>
          <select className="input-field mt-1" value={partyId} onChange={(e) => setPartyId(e.target.value)}>
            <option value="">Walk-in customer</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="card">
          <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
            <span className="font-serif text-lg">Items</span>
            <button className="text-xs text-ledger hover:opacity-70" onClick={addLine} disabled={items.length === 0}>
              + Add Line
            </button>
          </div>
          {items.length === 0 && (
            <div className="px-5 py-6 text-sm text-inkSoft">Add items to your catalogue first before billing.</div>
          )}
          {lines.map((line, idx) => {
            const lineTotal = line.qty * line.price * (1 + line.taxRate / 100)
            return (
              <div key={idx} className="ledger-row px-5 grid grid-cols-12 gap-2 items-center text-sm">
                <select
                  className="input-field col-span-4"
                  value={line.itemId}
                  onChange={(e) => onItemChange(idx, e.target.value)}
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  className="input-field col-span-2"
                  value={line.qty}
                  onChange={(e) => updateLine(idx, { qty: parseFloat(e.target.value) || 0 })}
                />
                <input
                  type="number"
                  step="0.01"
                  className="input-field col-span-2"
                  value={line.price}
                  onChange={(e) => updateLine(idx, { price: parseFloat(e.target.value) || 0 })}
                />
                <div className="col-span-1 text-inkSoft text-xs text-center">{line.taxRate}%</div>
                <div className="col-span-2 text-right num">₹{lineTotal.toFixed(2)}</div>
                <button className="col-span-1 text-stamp text-xs" onClick={() => removeLine(idx)}>
                  ✕
                </button>
              </div>
            )
          })}
        </div>

        <div className="card p-5 flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-8">
            <span className="text-inkSoft">Subtotal</span>
            <span className="num w-24 text-right">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex gap-8">
            <span className="text-inkSoft">Tax</span>
            <span className="num w-24 text-right">₹{taxTotal.toFixed(2)}</span>
          </div>
          <div className="flex gap-8 font-serif text-lg pt-1 border-t border-rule mt-1">
            <span>Total</span>
            <span className="num w-24 text-right">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button className="btn-primary" disabled={saving || lines.length === 0} onClick={() => submit('due')}>
            Save as Due
          </button>
          <button className="btn-stamp" disabled={saving || lines.length === 0} onClick={() => submit('paid')}>
            Save & Mark Paid
          </button>
        </div>
      </div>
    </div>
  )
}
