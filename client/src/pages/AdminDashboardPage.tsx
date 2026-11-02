import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { clearAdminToken, getAdminToken } from '../auth/adminSession'
import { api, ApiError, type AdminStats } from '../api'

const metrics: { key: keyof AdminStats; label: string; to: string }[] = [
  { key: 'posts', label: 'Posts', to: '/admin/dashboard/posts' },
  { key: 'users', label: 'Users', to: '/admin/dashboard/users' },
  { key: 'conversations', label: 'Conversations', to: '/admin/dashboard/chatmessages' },
  { key: 'messages', label: 'Chat messages', to: '/admin/dashboard/chatmessages' },
]

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [token, setToken] = useState(() => getAdminToken() ?? '')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    api.adminStats(token)
      .then((result) => {
        if (!cancelled) setStats(result)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          if (requestError instanceof ApiError && requestError.status === 401) {
            clearAdminToken()
            setToken('')
            navigate('/admin/login', { replace: true })
            return
          }
          setError(requestError instanceof Error ? requestError.message : 'Could not load dashboard.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [navigate, token])

  if (!token) return <Navigate to="/admin/login" replace />

  async function handleLogout() {
    setError(null)
    setLoggingOut(true)
    try {
      await api.adminLogout(token)
      clearAdminToken()
      navigate('/admin/login', { replace: true })
    } catch (logoutError) {
      if (logoutError instanceof ApiError && logoutError.status === 401) {
        clearAdminToken()
        setToken('')
        navigate('/admin/login', { replace: true })
        return
      }
      setError(logoutError instanceof Error ? logoutError.message : 'Could not sign out.')
      setLoggingOut(false)
    }
  }

  return (
    <main className="page admin-dashboard">
      <header className="admin-dashboard__header admin-dashboard__hero">
        <div>
          <p className="admin-dashboard__eyebrow">MOVEMATE / ADMIN STUDIO</p>
          <h1>MoveMate, in motion.</h1>
          <p className="muted">A little care keeps a community moving forward.</p>
        </div>
        <button
          type="button"
          className="admin-dashboard__logout"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
        >
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </header>

      {error && <p className="auth-form__error" role="alert">{error}</p>}
      {!stats && !error && <p className="muted" aria-live="polite">Loading dashboard…</p>}
      {stats && (
        <>
          <div className="admin-dashboard__section-heading">
            <div>
              <p className="admin-dashboard__eyebrow">COMMUNITY PULSE</p>
              <h2>Good things are growing.</h2>
            </div>
            <span>Live overview</span>
          </div>
          <section className="admin-stats" aria-label="MoveMate totals">
          {metrics.map(({ key, label, to }, index) => (
            <Link className="admin-stats__card" to={to} key={key}>
              <span className="admin-stats__icon" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p>{label}</p>
              <strong>{stats[key].toLocaleString()}</strong>
              <span className="admin-stats__link">Explore details <span aria-hidden="true">↗</span></span>
            </Link>
          ))}
          </section>
          <aside className="admin-dashboard__closing-note">
            <span aria-hidden="true">✦</span>
            <p><strong>Every move matters.</strong> Thanks for helping students find what they need.</p>
          </aside>
        </>
      )}
    </main>
  )
}
