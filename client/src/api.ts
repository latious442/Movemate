import type { Item, ItemInput, UploadedPhoto } from './types'
import { getAuthToken } from './auth/sessionStorage'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export type AuthUser = { id: string; name: string; email: string }

export interface AdminStats {
  posts: number
  users: number
  conversations: number
  messages: number
}

export type AdminTableRow = Record<string, string | number | boolean | null>
export interface AdminPost extends Omit<Item, 'ownerName'> {
  ownerName: string | null
  ownerEmail: string | null
}

export interface AdminUser extends AdminTableRow {
  id: string
  name: string
  email: string
  createdAt: string
  favoriteCount: number
}

export interface ChatMessage {
  id: string
  sentAt: string
  text: string
  senderId: string
  receiverId: string
}

export interface AdminChatMessage extends ChatMessage {
  senderName: string
  senderEmail: string | null
  receiverName: string
  receiverEmail: string | null
}

export interface Conversation {
  userId: string
  name: string
  latestMessage: ChatMessage
}

export interface MessageThread {
  participant: { id: string; name: string }
  messages: ChatMessage[]
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  authToken: string | null | undefined = undefined,
): Promise<T> {
  const headers = new Headers(init?.headers)
  const token = authToken === undefined ? getAuthToken() : authToken
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
    throw new ApiError(message || `Request failed with ${response.status}`, response.status)
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

  listConversations: () => request<Conversation[]>('/api/messages'),

  getMessageThread: (userId: string) =>
    request<MessageThread>(`/api/messages/${encodeURIComponent(userId)}`),

  sendMessage: (receiverId: string, text: string) =>
    request<ChatMessage>('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId, text }),
    }),

  deleteMessage: (messageId: string) =>
    request<void>(`/api/messages/${encodeURIComponent(messageId)}`, { method: 'DELETE' }),

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
    request<{ message: string }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  authVerifyRegistration: (body: { email: string; code: string }) =>
    request<{ token: string; user: AuthUser }>('/api/auth/register/verify', {
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

  adminLogin: (password: string) =>
    request<{ token: string }>(
      '/api/admin/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      },
      null,
    ),

  adminStats: (token: string) => request<AdminStats>('/api/admin/stats', undefined, token),

  adminPosts: (token: string) => request<AdminPost[]>('/api/admin/posts', undefined, token),

  adminUsers: (token: string) => request<AdminUser[]>('/api/admin/users', undefined, token),

  adminCreateUser: (
    token: string,
    body: { name: string; email: string; password: string },
  ) =>
    request<AdminUser>(
      '/api/admin/users',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      token,
    ),

  adminUpdateUser: (
    token: string,
    id: string,
    body: { name: string; email: string; password?: string },
  ) =>
    request<AdminUser>(
      `/api/admin/users/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      token,
    ),

  adminDeleteUser: (token: string, id: string) =>
    request<void>(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' }, token),

  adminChatMessages: (token: string) =>
    request<AdminChatMessage[]>('/api/admin/chatmessages', undefined, token),

  adminConversation: (token: string, firstAccountId: string, secondAccountId: string) => {
    const query = new URLSearchParams({ firstAccountId, secondAccountId })
    return request<AdminChatMessage[]>(
      `/api/admin/chatmessages/conversation?${query.toString()}`,
      undefined,
      token,
    )
  },

  adminDeletePost: (token: string, id: string) =>
    request<void>(`/api/admin/posts/${encodeURIComponent(id)}`, { method: 'DELETE' }, token),

  adminDeleteChatMessage: (token: string, id: string) =>
    request<void>(
      `/api/admin/chatmessages/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      token,
    ),

  adminLogout: (token: string) =>
    request<void>('/api/admin/logout', { method: 'POST' }, token),
}
