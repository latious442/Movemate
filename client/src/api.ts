import type { Item, ItemInput, UploadedPhoto } from './types'
import { getAuthToken } from './auth/sessionStorage'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export type AuthUser = { name: string; email: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  const token = getAuthToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  if (!response.ok) {
    let message = response.statusText
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // response had no JSON body
    }
    throw new Error(message || `Request failed with ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  listItems: () => request<Item[]>('/api/items'),
  listMyItems: () => request<Item[]>('/api/items/mine'),
  listFavorites: () => request<string[]>('/api/favorites'),

  addFavorite: (itemId: string) =>
    request<void>(`/api/favorites/${encodeURIComponent(itemId)}`, { method: 'PUT' }),

  removeFavorite: (itemId: string) =>
    request<void>(`/api/favorites/${encodeURIComponent(itemId)}`, { method: 'DELETE' }),

  createItem: (input: ItemInput) =>
    request<Item>('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),

  updateItem: (id: string, input: Partial<ItemInput>) =>
    request<Item>(`/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),

  deleteItem: (id: string) =>
    request<void>(`/api/items/${id}`, { method: 'DELETE' }),

  uploadPhoto: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<UploadedPhoto>('/api/uploads', { method: 'POST', body: form })
  },

  authRegister: (body: { name: string; email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  authLogin: (body: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  authLogout: () =>
    request<void>('/api/auth/logout', {
      method: 'POST',
    }),

  authMe: () => request<{ user: AuthUser }>('/api/auth/me').then((body) => body.user),
}
