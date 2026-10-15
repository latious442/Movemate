import { Link } from 'react-router-dom'
import { ItemCard } from '../components/ItemCard'
import { useFavorites } from '../favorites/useFavorites'
import type { Item } from '../types'

interface FavoritesPageProps {
  items: Item[]
  loading: boolean
}

export function FavoritesPage({ items, loading: itemsLoading }: FavoritesPageProps) {
  const { favoriteIds, loading: favoritesLoading } = useFavorites()
  const favoriteItems = items.filter((item) => favoriteIds.includes(item.id))

  return (
    <main className="page">
      <header className="page__header">
        <h1>Favorites</h1>
        <p className="muted">Listings you have saved.</p>
      </header>

      {itemsLoading || favoritesLoading ? (
        <p className="muted" aria-busy="true">Loading your favorites…</p>
      ) : favoriteItems.length === 0 ? (
        <section className="my-listings__empty">
          <h2>No favorites yet</h2>
          <p className="muted">Tap the heart on a listing to save it here.</p>
          <Link to="/browse">Browse listings</Link>
        </section>
      ) : (
        <section className="items__grid" aria-label="Your favorite listings">
          {favoriteItems.map((item) => <ItemCard key={item.id} item={item} />)}
        </section>
      )}
    </main>
  )
}
