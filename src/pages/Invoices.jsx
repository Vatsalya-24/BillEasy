import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db, recordPayment } from '../lib/db.js'
import PageHeader from '../components/PageHeader.jsx'
import { downloadInvoicePdf } from '../lib/pdf.js'

export default function Invoices() {
  const invoices = useLiveQuery(() => db.invoices.orderBy('date').reverse().toArray(), []) || []
  const parties = useLiveQuery(() => db.parties.toArray(), []) || []
  const lines = useLiveQuery(() => db.invoiceLines.toArray(), []) || []
  const items = useLiveQuery(() => db.items.toArray(), []) || []

  async function markPaid(inv) {
    await recordPayment({ invoiceId: inv.id, partyId: inv.partyId, amount: inv.total, mode: 'cash' })
  }

  function handleDownload(inv) {
    const party = parties.find((p) => p.id === inv.partyId)
    const invLines = lines.filter((l) => l.invoiceId === inv.id).map((l) => ({
      ...l,
      name: items.find((i) => i.id === l.itemId)?.name || 'Item'
    }))
    downloadInvoicePdf(inv, party, invLines)
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} bills created`}
        action={
          <Link to="/invoices/new" className="btn-stamp">
            + New Bill
          </Link>
        }
      />
      <div className="p-6 md:p-8">
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[650px]">
            <thead>
              <tr className="text-left text-xs font-mono uppercase tracking-wide text-inkSoft/70 border-b border-rule">
                <th className="px-5 py-3 font-medium">Invoice #</th>
                <th className="px-5 py-3 font-medium">Party</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium text-right">Total</th>
                <th className="px-5 py-3 font-medium text-right">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
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
                    <td className="px-5 text-right whitespace-nowrap">
                      <button className="text-xs text-inkSoft hover:text-ink mr-3" onClick={() => handleDownload(inv)}>
                        PDF
                      </button>
                      {inv.status === 'due' && (
                        <button className="text-xs text-ledger hover:opacity-70" onClick={() => markPaid(inv)}>
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-inkSoft text-sm">
                    No invoices yet — create your first bill.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
