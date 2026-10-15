import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useDemoAuth } from '../auth/useDemoAuth'

const links: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/browse', label: 'Browse' },
  { to: '/sell', label: 'Sell' },
  { to: '/messages', label: 'Messages' },
  { to: '/favorites', label: 'Favorites' },
]

export function Header() {
  const { user } = useDemoAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const profileLabel = user ? user.name.trim().split(/\s+/)[0] || 'Profile' : 'Profile'
  const profileTo = user ? '/profile' : '/login'

  return (
    <header className="site-header">
      <Link to="/" className="site-header__logo" onClick={() => setMenuOpen(false)}>
        MOVEMATE
      </Link>

      <nav
        id="main-navigation"
        className={`site-header__nav${menuOpen ? ' site-header__nav--open' : ''}`}
        aria-label="Main"
      >
        {links.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `site-header__link${isActive ? ' site-header__link--active' : ''}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="site-header__actions">
        <Link
          to="/favorites"
          className="site-header__icon-btn"
          aria-label="Favorites"
          onClick={() => setMenuOpen(false)}
        >
          <HeartIcon />
        </Link>
        <Link to={profileTo} className="site-header__profile" onClick={() => setMenuOpen(false)}>
          {profileLabel}
        </Link>
      </div>
      <button
        type="button"
        className={`site-header__menu-btn${menuOpen ? ' site-header__menu-btn--open' : ''}`}
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        aria-controls="main-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MenuIcon isOpen={menuOpen} />
      </button>
    </header>
  )
}

function MenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      {isOpen ? (
        <path
          d="m6 6 12 12M18 6 6 18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M4 7h16M4 12h16M4 17h16"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20.5l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 10.68L12 20.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
