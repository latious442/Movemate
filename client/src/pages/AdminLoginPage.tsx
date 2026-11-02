import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getAdminToken, setAdminToken } from '../auth/adminSession'
import { api } from '../api'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (getAdminToken()) return <Navigate to="/admin/dashboard" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { token } = await api.adminLogin(password)
      setAdminToken(token)
      navigate('/admin/dashboard', { replace: true })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Admin login failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page page--auth">
      <header className="page__header page__header--auth">
        <h1>Admin login</h1>
        <p className="muted">Sign in to view MoveMate activity.</p>
      </header>
      <div className="auth-card">
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-form__field">
            Admin password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="auth-form__error" role="alert">{error}</p>}
          <button type="submit" className="auth-form__submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
      <p className="auth-back">
        <Link to="/">← Back to MoveMate</Link>
      </p>
    </main>
  )
}
