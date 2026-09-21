import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db.js'
import PageHeader from '../components/PageHeader.jsx'

export default function Reports() {
  const invoices = useLiveQuery(() => db.invoices.toArray(), []) || []
  const lines = useLiveQuery(() => db.invoiceLines.toArray(), []) || []
  const items = useLiveQuery(() => db.items.toArray(), []) || []

  const totalSales = invoices.reduce((s, i) => s + i.total, 0)
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const totalDue = invoices.filter((i) => i.status === 'due').reduce((s, i) => s + i.total, 0)

  const taxCollected = lines.reduce((s, l) => s + l.qty * l.price * (l.taxRate / 100), 0)

  const itemTotals = {}
  for (const l of lines) {
    itemTotals[l.itemId] = (itemTotals[l.itemId] || 0) + l.qty
  }
  const topItems = Object.entries(itemTotals)
    .map(([itemId, qty]) => ({ item: items.find((i) => i.id === itemId), qty }))
    .filter((t) => t.item)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  return (
    <div>
      <PageHeader title="Reports" subtitle="Business performance at a glance" />
      <div className="p-6 md:p-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="text-xs font-mono uppercase text-inkSoft/70">Total Sales</div>
            <div className="font-serif text-2xl mt-2 num">₹{totalSales.toFixed(2)}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs font-mono uppercase text-inkSoft/70">Collected</div>
            <div className="font-serif text-2xl mt-2 num text-ledger">₹{totalPaid.toFixed(2)}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs font-mono uppercase text-inkSoft/70">Outstanding</div>
            <div className="font-serif text-2xl mt-2 num text-stamp">₹{totalDue.toFixed(2)}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs font-mono uppercase text-inkSoft/70">Tax Collected</div>
            <div className="font-serif text-2xl mt-2 num">₹{taxCollected.toFixed(2)}</div>
          </div>
        </div>

        <div className="card">
          <div className="px-5 py-3 border-b border-rule font-serif text-lg">Top Selling Items</div>
          {topItems.length === 0 ? (
            <div className="px-5 py-8 text-center text-inkSoft text-sm">No sales data yet.</div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {topItems.map(({ item, qty }) => (
                  <tr key={item.id} className="ledger-row">
                    <td className="px-5">{item.name}</td>
                    <td className="px-5 text-right num">
                      {qty} {item.unit} sold
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
