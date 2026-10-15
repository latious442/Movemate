import { Link, Navigate } from 'react-router-dom'
import { useDemoAuth } from '../auth/useDemoAuth'

export function ProfilePage() {
  const { user, logout } = useDemoAuth()

  if (!user) return <Navigate to="/login" replace />

  const firstName = user.name.trim().split(/\s+/)[0] || user.name

  return (
    <main className="page page--profile">
      <header className="page__header">
        <h1>Profile</h1>
        <p className="muted">Signed in as {user.email}</p>
      </header>

      <div className="profile-card">
        <div className="profile-card__avatar" aria-hidden>
          {firstName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="profile-card__name">{user.name}</h2>
          <p className="muted profile-card__email">{user.email}</p>
          <span className="profile-card__badge">Demo student</span>
        </div>
      </div>

      <div className="profile-actions">
        <Link to="/sell" className="btn btn--outline profile-actions__link">
          Sell an item
        </Link>
        <Link to="/my-listings" className="btn btn--outline profile-actions__link">
          My listings
        </Link>
        <button
          type="button"
          className="profile-actions__logout"
          onClick={() => logout()}
        >
          Log out
        </button>
      </div>
    </main>
  )
}
