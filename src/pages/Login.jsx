import { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'

export default function Login() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      await signInWithEmail(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <div className="card w-full max-w-sm p-6">
        <h1 className="font-serif text-xl mb-1">Sign in or create an account</h1>
        <p className="text-sm text-inkSoft mb-5">
          Enter your email to get started — first time here, this also creates your account and starts your
          free trial. No password needed.
        </p>
        {sent ? (
          <p className="text-sm text-ledger">
            Check your email for a link — click it to finish signing in (or creating your account, if this is your
            first time).
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@business.com"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-xs text-stamp">{error}</p>}
            <button type="submit" className="btn-primary w-full">
              Send sign-in link
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
