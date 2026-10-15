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
  const [university, setUniversity] = useState('Stanford University')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  useEffect(() => {
    api
      .listItems()
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load items'))
      .finally(() => setLoading(false))
  }, [])

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return items.filter((item) => {
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.notes?.toLowerCase().includes(q) ?? false)
      const matchesCategory =
        !categoryFilter || item.category.toLowerCase() === categoryFilter.toLowerCase()
      return matchesQuery && matchesCategory
    })
  }, [items, searchQuery, categoryFilter])

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

  function goBrowse(options?: { query?: string; category?: string | null }) {
    if (options?.query !== undefined) setSearchQuery(options.query)
    if (options?.category !== undefined) setCategoryFilter(options.category)
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
                onBrowse={() => goBrowse({ category: null })}
                onSell={() => navigate('/sell')}
              />
              <CategoryGrid
                onSelectCategory={(category) => goBrowse({ category, query: '' })}
              />
            </main>
          }
        />

        <Route
          path="/browse"
          element={
            <main className="page">
              <header className="page__header">
                <h1>Browse items</h1>
                <p className="muted">
                  {university}
                  {categoryFilter ? ` · ${categoryFilter}` : ''}
                  {searchQuery.trim() ? ` · “${searchQuery.trim()}”` : ''}
                </p>
              </header>

              <section className="items">
                {loading ? (
                  <p className="muted">Loading…</p>
                ) : filteredItems.length === 0 ? (
                  <p className="muted">No items match your search yet. Be the first to sell something.</p>
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
                defaultUniversity={university}
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
