import { NavLink, Outlet } from 'react-router-dom'
import SyncStatus from './SyncStatus.jsx'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/invoices', label: 'Invoices' },
  { to: '/items', label: 'Items' },
  { to: '/parties', label: 'Parties' },
  { to: '/reports', label: 'Reports' },
  { to: '/billing', label: 'Billing' }
]

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-56 shrink-0 bg-ink text-paper flex md:flex-col">
        <div className="px-5 py-5 border-b md:border-b border-paper/10">
          <div className="font-serif text-xl font-semibold tracking-tight">BillEasy</div>
          <div className="text-[11px] font-mono text-paper/50 mt-0.5">ledger &amp; billing</div>
        </div>
        <nav className="flex md:flex-col flex-1 overflow-x-auto md:overflow-visible">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `px-5 py-3 text-sm whitespace-nowrap border-l-2 ${
                  isActive
                    ? 'border-stamp bg-white/5 text-white'
                    : 'border-transparent text-paper/60 hover:text-paper hover:bg-white/5'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <SyncStatus />
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
