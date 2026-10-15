import { useEffect, useState } from 'react'
import { ItemCard } from '../components/ItemCard'
import { ItemForm, type NewItemValues } from '../components/ItemForm'
import { api } from '../api'
import type { Item, ItemInput } from '../types'

export function MyListingsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [editing, setEditing] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api.listMyItems()
      .then((listings) => {
        if (active) setItems(listings)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load your listings.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function saveChanges(values: NewItemValues) {
    if (!editing) return
    setSubmitting(true)
    setError(null)
    try {
      let photoUrl = editing.photoUrl
      let photoPublicId = editing.photoPublicId
      if (values.file) {
        const uploaded = await api.uploadPhoto(values.file)
        photoUrl = uploaded.url
        photoPublicId = uploaded.publicId
      }
      const input: ItemInput = {
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
      }
      const updated = await api.updateItem(editing.id, input)
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item))
      setEditing(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this listing.')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteListing(item: Item) {
    if (!window.confirm(`Delete “${item.name}”? This cannot be undone.`)) return
    setError(null)
    try {
      await api.deleteItem(item.id)
      setItems((current) => current.filter((listing) => listing.id !== item.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this listing.')
    }
  }

  return (
    <main className="page page--my-listings">
      <header className="page__header">
        <h1>{editing ? 'Edit listing' : 'My listings'}</h1>
        <p className="muted">
          {editing ? 'Update the details for your post.' : 'Manage the items you have posted.'}
        </p>
      </header>

      {error && <p className="my-listings__error" role="alert">{error}</p>}

      {editing ? (
        <>
          <button
            type="button"
            className="my-listings__back"
            onClick={() => setEditing(null)}
            disabled={submitting}
          >
            Back to my listings
          </button>
          <ItemForm
            key={editing.id}
            submitting={submitting}
            defaultUniversity={editing.university}
            initialItem={editing}
            onSubmit={saveChanges}
          />
        </>
      ) : loading ? (
        <p className="muted" aria-busy="true">Loading your listings…</p>
      ) : items.length === 0 ? (
        <section className="my-listings__empty">
          <h2>No listings yet</h2>
          <p className="muted">Items you post will appear here so you can edit or remove them.</p>
        </section>
      ) : (
        <section className="my-listings__grid" aria-label="Your listings">
          {items.map((item) => (
            <div className="my-listing" key={item.id}>
              <ItemCard item={item} />
              <div className="my-listing__actions">
                <button type="button" onClick={() => setEditing(item)}>Edit</button>
                <button type="button" onClick={() => void deleteListing(item)}>Delete</button>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
