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
        <nav className="site-header__quick-nav" aria-label="Quick links">
          <NavLink
            to="/browse"
            className={({ isActive }) =>
              `site-header__quick-link${isActive ? ' site-header__quick-link--active' : ''}`
            }
            aria-label="Browse listings"
            title="Browse"
            onClick={() => setMenuOpen(false)}
          >
            <BrowseIcon />
          </NavLink>
          <NavLink
            to="/sell"
            className={({ isActive }) =>
              `site-header__quick-link${isActive ? ' site-header__quick-link--active' : ''}`
            }
            aria-label="Sell an item"
            title="Sell"
            onClick={() => setMenuOpen(false)}
          >
            <SellIcon />
          </NavLink>
          <NavLink
            to="/messages"
            className={({ isActive }) =>
              `site-header__quick-link${isActive ? ' site-header__quick-link--active' : ''}`
            }
            aria-label="Messages"
            title="Messages"
            onClick={() => setMenuOpen(false)}
          >
            <MessagesIcon />
          </NavLink>
        </nav>
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

function BrowseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 10h2l1-3.5A2 2 0 018 5h2a2 2 0 012 2v1h0V7a2 2 0 012-2h2a2 2 0 012 1.5L19 10h2M3 10l1 5a2 2 0 002 1.5h3a2 2 0 002-2V11h2v3.5a2 2 0 002 2h3a2 2 0 002-1.5l1-5M3 10h18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m14.5 5.5 4 4M4 20l4.2-.9L19.4 7.9a2.1 2.1 0 00-3-3L5.2 16.1 4 20z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MessagesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6.5A2.5 2.5 0 015.5 4h13A2.5 2.5 0 0121 6.5v11a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5v-11z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m4 6 8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
