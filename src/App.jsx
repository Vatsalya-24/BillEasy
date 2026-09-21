import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/auth.jsx'
import { RequireAuth, RequireSubscription } from './lib/guards.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Items from './pages/Items.jsx'
import Parties from './pages/Parties.jsx'
import Invoices from './pages/Invoices.jsx'
import InvoiceForm from './pages/InvoiceForm.jsx'
import Reports from './pages/Reports.jsx'
import Login from './pages/Login.jsx'
import Billing from './pages/Billing.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <RequireSubscription>
                <Layout />
              </RequireSubscription>
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/items" element={<Items />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/new" element={<InvoiceForm />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/billing" element={<Billing />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
