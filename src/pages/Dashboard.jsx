import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../lib/db.js'
import PageHeader from '../components/PageHeader.jsx'

function Stat({ label, value, accent }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-mono uppercase tracking-wide text-inkSoft/70">{label}</div>
      <div className={`font-serif text-3xl mt-2 num ${accent || 'text-ink'}`}>{value}</div>
    </div>
  )
}

export default function Dashboard() {
  const invoices = useLiveQuery(() => db.invoices.orderBy('date').reverse().toArray(), []) || []
  const items = useLiveQuery(() => db.items.toArray(), []) || []
  const parties = useLiveQuery(() => db.parties.toArray(), []) || []

  const today = new Date().toISOString().slice(0, 10)
  const todaysInvoices = invoices.filter((i) => i.date === today)
  const todaysSales = todaysInvoices.reduce((s, i) => s + i.total, 0)
  const dueAmount = invoices.filter((i) => i.status === 'due').reduce((s, i) => s + i.total, 0)
  const lowStock = items.filter((i) => (i.stock || 0) <= 5)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        action={
          <Link to="/invoices/new" className="btn-stamp">
            + New Bill
          </Link>
        }
      />
      <div className="p-6 md:p-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Today's Sales" value={`₹${todaysSales.toFixed(2)}`} accent="text-ledger" />
          <Stat label="Bills Today" value={todaysInvoices.length} />
          <Stat label="Amount Due" value={`₹${dueAmount.toFixed(2)}`} accent="text-stamp" />
          <Stat label="Low Stock Items" value={lowStock.length} />
        </div>

        <div className="card">
          <div className="px-5 py-3 border-b border-rule font-serif text-lg">Recent Bills</div>
          {invoices.length === 0 ? (
            <div className="px-5 py-8 text-center text-inkSoft text-sm">
              No bills yet. Create your first one to see it here.
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {invoices.slice(0, 8).map((inv) => {
                  const party = parties.find((p) => p.id === inv.partyId)
                  return (
                    <tr key={inv.id} className="ledger-row">
                      <td className="px-5 font-mono text-inkSoft">{inv.invoiceNo}</td>
                      <td className="px-5">{party?.name || 'Walk-in customer'}</td>
                      <td className="px-5 text-inkSoft">{inv.date}</td>
                      <td className="px-5 text-right num">₹{inv.total.toFixed(2)}</td>
                      <td className="px-5 text-right">
                        <span className={`stamp-badge ${inv.status === 'paid' ? 'stamp-badge--paid' : 'stamp-badge--due'}`}>
                          {inv.status === 'paid' ? 'PAID' : 'DUE'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
