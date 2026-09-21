import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { db } from './lib/db.js'
import './index.css'

async function resetLocalDb(err) {
  console.warn('Local database schema conflict, resetting local cache:', err)
  try {
    await db.close()
  } catch {}
  await db.delete()
  window.location.reload()
}

async function bootstrap() {
  try {
    await db.open()
  } catch (err) {
    await resetLocalDb(err)
    return
  }

  // Safety net: if a write elsewhere hits the same "changing primary key"
  // conflict (e.g. because another tab still held the old-schema database
  // open when this one loaded), recover instead of leaving a dead app.
  window.addEventListener('unhandledrejection', (event) => {
    const msg = `${event.reason?.name || ''} ${event.reason?.message || ''}`
    if (msg.includes('UpgradeError') || msg.includes('changing primary key') || msg.includes('DatabaseClosedError')) {
      event.preventDefault()
      resetLocalDb(event.reason)
    }
  })

  ReactDOM.createRoot(document.getElementById('root')).render(
    <HashRouter>
      <App />
    </HashRouter>
  )
}

bootstrap()
