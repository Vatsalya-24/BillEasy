import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, addItem, updateItem, deleteItem } from '../lib/db.js'
import PageHeader from '../components/PageHeader.jsx'

const emptyForm = { name: '', sku: '', price: '', taxRate: '18', stock: '', unit: 'pcs' }

export default function Items() {
  const items = useLiveQuery(() => db.items.orderBy('name').toArray(), []) || []
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [open, setOpen] = useState(false)

  function startAdd() {
    setForm(emptyForm)
    setEditingId(null)
    setOpen(true)
  }
  function startEdit(item) {
    setForm({ ...item })
    setEditingId(item.id)
    setOpen(true)
  }
  async function submit(e) {
    e.preventDefault()
    const payload = {
      name: form.name,
      sku: form.sku,
      price: parseFloat(form.price) || 0,
      taxRate: parseFloat(form.taxRate) || 0,
      stock: parseFloat(form.stock) || 0,
      unit: form.unit
    }
    if (editingId) await updateItem(editingId, payload)
    else await addItem(payload)
    setOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle={`${items.length} products in your catalogue`}
        action={
          <button className="btn-stamp" onClick={startAdd}>
            + Add Item
          </button>
        }
      />
      <div className="p-6 md:p-8">
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-xs font-mono uppercase tracking-wide text-inkSoft/70 border-b border-rule">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">SKU</th>
                <th className="px-5 py-3 font-medium text-right">Price</th>
                <th className="px-5 py-3 font-medium text-right">Tax</th>
                <th className="px-5 py-3 font-medium text-right">Stock</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="ledger-row">
                  <td className="px-5">{item.name}</td>
                  <td className="px-5 text-inkSoft font-mono">{item.sku || '—'}</td>
                  <td className="px-5 text-right num">₹{item.price.toFixed(2)}</td>
                  <td className="px-5 text-right num text-inkSoft">{item.taxRate}%</td>
                  <td className={`px-5 text-right num ${item.stock <= 5 ? 'text-stamp' : ''}`}>
                    {item.stock} {item.unit}
                  </td>
                  <td className="px-5 text-right whitespace-nowrap">
                    <button className="text-xs text-inkSoft hover:text-ink mr-3" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button className="text-xs text-stamp hover:opacity-70" onClick={() => deleteItem(item.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-inkSoft text-sm">
                    No items yet — add your first product to start billing.
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
            <h2 className="font-serif text-xl">{editingId ? 'Edit Item' : 'Add Item'}</h2>
            <div>
              <label className="text-xs font-mono uppercase text-inkSoft">Name</label>
              <input required className="input-field mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono uppercase text-inkSoft">SKU</label>
                <input className="input-field mt-1" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-inkSoft">Unit</label>
                <input className="input-field mt-1" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-inkSoft">Price (₹)</label>
                <input required type="number" step="0.01" className="input-field mt-1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-inkSoft">Tax Rate (%)</label>
                <input type="number" step="0.01" className="input-field mt-1" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-inkSoft">Stock</label>
                <input type="number" step="0.01" className="input-field mt-1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="px-4 py-2 text-sm text-inkSoft" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Item
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
