import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useDemoAuth } from './auth/useDemoAuth'
import { api } from './api'
import type { Item } from './types'
import { ItemForm, type NewItemValues } from './components/ItemForm'
import { ItemCard } from './components/ItemCard'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { CategoryGrid } from './components/CategoryGrid'
import { MessagesPanel } from './components/MessagesPanel'
import { AuthPage } from './pages/AuthPage'
import { ProfilePage } from './pages/ProfilePage'
import { MyListingsPage } from './pages/MyListingsPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { useFavorites } from './favorites/useFavorites'
import { UNIVERSITIES } from './catalog'

function RequireAccount({ children }: { children: ReactNode }) {
  const { user, authReady } = useDemoAuth()

  if (!authReady) {
    return (
      <main className="page page--center" aria-busy="true">
        <p className="muted">Checking account…</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="page page--center">
        <h1>Account required</h1>
        <p className="muted">You have to register or log in account first.</p>
        <Link to="/login">Register or log in</Link>
      </main>
    )
  }

  return children
}

export default function App() {
  const navigate = useNavigate()
  const { error: favoritesError, clearError: clearFavoritesError } = useFavorites()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [university, setUniversity] = useState('')

  useEffect(() => {
    api
      .listItems()
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load items'))
      .finally(() => setLoading(false))
  }, [])

  const filteredItems = useMemo(() => {
    const terms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return items.filter((item) => {
      const searchableText = [
        item.name,
        item.category,
        item.condition,
        item.notes,
        item.university,
        item.price === 0 ? 'Free Items' : '',
      ].join(' ').toLowerCase()
      const matchesQuery = terms.every((term) => searchableText.includes(term))
      const matchesUniversity = !university || item.university === university
      return matchesQuery && matchesUniversity
    })
  }, [items, searchQuery, university])

  async function handleCreate(values: NewItemValues) {
    setSubmitting(true)
    setError(null)
    try {
      let photoUrl: string | null = null
      let photoPublicId: string | null = null

      if (values.file) {
        const uploaded = await api.uploadPhoto(values.file)
        photoUrl = uploaded.url
        photoPublicId = uploaded.publicId
      }

      const created = await api.createItem({
        name: values.name,
        category: values.category,
        quantity: values.quantity,
        notes: values.notes,
        price: values.price,
        condition: values.condition,
        university: values.university,
        campusPickup: values.campusPickup,
        localDelivery: values.localDelivery,
        photoUrl,
        photoPublicId,
      })
      setUniversity(values.university)
      setItems((current) => [created, ...current])
      navigate('/browse')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item')
    } finally {
      setSubmitting(false)
    }
  }

  function goBrowse(options?: { query?: string }) {
    if (options?.query !== undefined) setSearchQuery(options.query)
    navigate('/browse')
  }

  return (
    <div className="app">
      <Header />

      {error && <div className="alert app__alert">{error}</div>}
      {favoritesError && (
        <div className="alert app__alert" role="alert">
          <span>{favoritesError}</span>
          <button type="button" onClick={clearFavoritesError}>Dismiss</button>
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={
            <main className="app__home">
              <Hero
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                university={university}
                onUniversityChange={setUniversity}
                onFindItems={() => goBrowse()}
                onBrowse={() => goBrowse({ query: '' })}
                onSell={() => navigate('/sell')}
              />
              <CategoryGrid
                onSelectCategory={(category) => goBrowse({ query: category })}
              />
            </main>
          }
        />

        <Route
          path="/browse"
          element={
            <main className="page browse-page">
              <header className="page__header">
                <h1>Browse Items</h1>
                <p className="muted">Dorm essentials from students near you.</p>
              </header>

              <form
                className="hero__search browse-search"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault()
                }}
              >
                <label className="hero__search-field">
                  <span className="sr-only">Search essentials</span>
                  <SearchIcon />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search essentials..."
                  />
                </label>

                <div className="hero__search-divider" aria-hidden />

                <label className="hero__search-university">
                  <span className="sr-only">University</span>
                  <select
                    value={university}
                    onChange={(event) => setUniversity(event.target.value)}
                  >
                    <option value="">All universities</option>
                    {UNIVERSITIES.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <ChevronIcon />
                </label>

                <button type="submit" className="hero__search-submit">
                  Find Items
                </button>
              </form>

              <section className="items" aria-label="Available dorm essentials">
                {loading ? (
                  <div className="browse-loading">
                    <p className="muted">Loading dorm essentials…</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="browse-empty">
                    <p className="browse-empty__title">No essentials found</p>
                    <p className="muted">
                      No listings match your current filters. Try searching for something else or clearing filters.
                    </p>
                    {(searchQuery || university) && (
                      <button
                        type="button"
                        className="browse-empty__clear-btn"
                        onClick={() => {
                          setSearchQuery('')
                          setUniversity('')
                        }}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="items__grid">
                    {filteredItems.map((item) => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </section>
            </main>
          }
        />

        <Route
          path="/sell"
          element={
            <RequireAccount>
            <main className="page page--sell">
              <header className="page__header page__header--sell">
                <h1>Sell an Item</h1>
                <p className="muted">Takes less than a minute.</p>
              </header>
              <ItemForm
                submitting={submitting}
                defaultUniversity={university || UNIVERSITIES[0]}
                onSubmit={handleCreate}
              />
            </main>
            </RequireAccount>
          }
        />

        <Route
          path="/messages"
          element={
            <RequireAccount>
              <MessagesPanel />
            </RequireAccount>
          }
        />

        <Route path="/login" element={<AuthPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/my-listings"
          element={
            <RequireAccount>
              <MyListingsPage />
            </RequireAccount>
          }
        />

        <Route
          path="/favorites"
          element={
            <RequireAccount>
              <FavoritesPage items={items} loading={loading} />
            </RequireAccount>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="hero__search-icon">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="hero__chevron">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
