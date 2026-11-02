import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { clearAdminToken, getAdminToken } from '../auth/adminSession'
import {
  api,
  ApiError,
  type AdminChatMessage,
  type AdminPost,
  type AdminUser,
} from '../api'
import { ItemCard } from '../components/ItemCard'

type AdminRecordKind = 'posts' | 'users' | 'chatmessages'

const pageDetails: Record<AdminRecordKind, { title: string; description: string }> = {
  posts: { title: 'All posts', description: 'Listing details and their owners.' },
  users: { title: 'All users', description: 'Registered account details.' },
  chatmessages: {
    title: 'All chat messages',
    description: 'Private message contents and sender and recipient details.',
  },
}

export function AdminRecordsPage({ kind }: { kind: AdminRecordKind }) {
  const [token, setToken] = useState(() => getAdminToken() ?? '')
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loadedKind, setLoadedKind] = useState<AdminRecordKind | null>(null)
  const [loadError, setLoadError] = useState<{ kind: AdminRecordKind; message: string } | null>(null)
  const [userFormOpen, setUserFormOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '' })
  const [userFormError, setUserFormError] = useState<string | null>(null)
  const [savingUser, setSavingUser] = useState(false)
  const [chatView, setChatView] = useState<'timeline' | 'conversation'>('timeline')
  const [firstAccountId, setFirstAccountId] = useState('')
  const [secondAccountId, setSecondAccountId] = useState('')
  const [timelineMessages, setTimelineMessages] = useState<AdminChatMessage[]>([])
  const [conversationResult, setConversationResult] = useState<{
    key: string
    rows: AdminChatMessage[]
  } | null>(null)
  const [conversationError, setConversationError] = useState<{ key: string; message: string } | null>(
    null,
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    if (kind !== 'posts') {
      const usersRequest = api.adminUsers(token)
      const recordsRequest =
        kind === 'chatmessages' ? api.adminChatMessages(token) : Promise.resolve(null)
      Promise.all([usersRequest, recordsRequest])
        .then(([result, messages]) => {
          if (!cancelled) {
            setUsers(result)
            if (messages) setTimelineMessages(messages)
            setLoadedKind(kind)
          }
        })
        .catch((requestError: unknown) => {
          if (!cancelled) {
            if (requestError instanceof ApiError && requestError.status === 401) {
              clearAdminToken()
              setToken('')
              return
            }
            setLoadError({
              kind,
              message:
                requestError instanceof Error
                  ? requestError.message
                  : 'Could not load admin records.',
            })
            setLoadedKind(kind)
          }
        })
    } else {
      api.adminPosts(token)
        .then((result) => {
          if (!cancelled) {
            setPosts(result)
            setLoadedKind(kind)
          }
        })
        .catch((requestError: unknown) => {
          if (!cancelled) {
            if (requestError instanceof ApiError && requestError.status === 401) {
              clearAdminToken()
              setToken('')
              return
            }
            setLoadError({
              kind,
              message:
                requestError instanceof Error
                  ? requestError.message
                  : 'Could not load admin records.',
            })
            setLoadedKind(kind)
          }
        })
    }
    return () => {
      cancelled = true
    }
  }, [kind, token])

  const conversationKey =
    firstAccountId && secondAccountId ? `${firstAccountId}:${secondAccountId}` : ''

  useEffect(() => {
    if (
      !token ||
      kind !== 'chatmessages' ||
      chatView !== 'conversation' ||
      !firstAccountId ||
      !secondAccountId ||
      firstAccountId === secondAccountId
    ) {
      return
    }
    let cancelled = false
    api.adminConversation(token, firstAccountId, secondAccountId)
      .then((result) => {
        if (!cancelled) {
          setConversationResult({ key: conversationKey, rows: result })
          setConversationError(null)
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          if (requestError instanceof ApiError && requestError.status === 401) {
            clearAdminToken()
            setToken('')
            return
          }
          setConversationError({
            key: conversationKey,
            message:
              requestError instanceof Error
                ? requestError.message
                : 'Could not load this conversation.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [chatView, conversationKey, firstAccountId, kind, secondAccountId, token])

  if (!token) return <Navigate to="/admin/login" replace />

  const loading = loadedKind !== kind
  const error = loadError?.kind === kind ? loadError.message : null
  const { title, description } = pageDetails[kind]
  const conversationRows =
    conversationResult?.key === conversationKey ? conversationResult.rows : []
  const visibleChatMessages =
    chatView === 'timeline' ? timelineMessages : conversationRows
  const conversationIsLoading =
    Boolean(conversationKey) &&
    firstAccountId !== secondAccountId &&
    conversationResult?.key !== conversationKey &&
    conversationError?.key !== conversationKey
  const conversationLoadError =
    conversationError?.key === conversationKey ? conversationError.message : null
  function openCreateUserForm() {
    setEditingUserId(null)
    setUserForm({ name: '', email: '', password: '' })
    setUserFormError(null)
    setUserFormOpen(true)
  }

  function openEditUserForm(user: AdminUser) {
    setEditingUserId(user.id)
    setUserForm({ name: user.name, email: user.email, password: '' })
    setUserFormError(null)
    setUserFormOpen(true)
  }

  function closeUserForm() {
    setUserFormOpen(false)
    setEditingUserId(null)
    setUserFormError(null)
  }

  async function handleSaveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingUser(true)
    setUserFormError(null)
    try {
      const body = {
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        ...(userForm.password ? { password: userForm.password } : {}),
      }
      if (editingUserId) {
        const updatedUser = await api.adminUpdateUser(token, editingUserId, body)
        setUsers((current) =>
          current.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
        )
      } else {
        const createdUser = await api.adminCreateUser(token, {
          ...body,
          password: userForm.password,
        })
        setUsers((current) => [...current, createdUser])
      }
      closeUserForm()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        clearAdminToken()
        setToken('')
        return
      }
      setUserFormError(
        requestError instanceof Error ? requestError.message : 'Could not save this user.',
      )
    } finally {
      setSavingUser(false)
    }
  }

  async function handleDelete(id: string) {
    const isPost = kind === 'posts'
    const label = isPost ? 'post' : 'chat message'
    if (!window.confirm(`Permanently delete this ${label}? This cannot be undone.`)) return

    setDeletingId(id)
    setDeleteError(null)
    try {
      if (isPost) {
        await api.adminDeletePost(token, id)
        setPosts((current) => current.filter((post) => post.id !== id))
      } else if (kind === 'chatmessages') {
        await api.adminDeleteChatMessage(token, id)
        setTimelineMessages((current) => current.filter((message) => message.id !== id))
        setConversationResult((current) =>
          current
            ? { ...current, rows: current.rows.filter((row) => row.id !== id) }
            : current,
        )
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        clearAdminToken()
        setToken('')
        return
      }
      setDeleteError(
        requestError instanceof Error ? requestError.message : `Could not delete the ${label}.`,
      )
    } finally {
      setDeletingId(null)
    }
  }

  const firstAccount = users.find((user) => user.id === firstAccountId)
  const secondAccount = users.find((user) => user.id === secondAccountId)

  return (
    <main className="page admin-dashboard">
      <header className="admin-dashboard__header admin-dashboard__hero admin-dashboard__records-hero">
        <div>
          <p className="admin-dashboard__eyebrow">MOVEMATE / COMMUNITY</p>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
        <div className="admin-dashboard__header-actions">
          {kind === 'users' && (
            <button
              type="button"
              className="admin-primary-btn"
              onClick={openCreateUserForm}
            >
              <span aria-hidden="true">+</span> Add user
            </button>
          )}
          <Link className="admin-dashboard__back" to="/admin/dashboard">Overview</Link>
        </div>
      </header>

      <nav className="admin-records__nav" aria-label="Admin data pages">
        <Link to="/admin/dashboard/posts" aria-current={kind === 'posts' ? 'page' : undefined}>
          Posts
        </Link>
        <Link to="/admin/dashboard/users" aria-current={kind === 'users' ? 'page' : undefined}>
          Users
        </Link>
        <Link
          to="/admin/dashboard/chatmessages"
          aria-current={kind === 'chatmessages' ? 'page' : undefined}
        >
          Chat messages
        </Link>
      </nav>

      {error && <p className="auth-form__error" role="alert">{error}</p>}
      {loading && <p className="muted" aria-live="polite">Loading records…</p>}
      {deleteError && <p className="auth-form__error" role="alert">{deleteError}</p>}
      {userFormOpen && kind === 'users' && (
        <section className="admin-user-form-card" aria-labelledby="admin-user-form-title">
          <div className="admin-user-form-card__heading">
            <div className="admin-user-avatar admin-user-avatar--form" aria-hidden="true">
              {editingUserId ? '✦' : '+'}
            </div>
            <div>
              <p className="admin-dashboard__eyebrow">COMMUNITY ACCOUNT</p>
              <h2 id="admin-user-form-title">{editingUserId ? 'Edit user' : 'Add a user'}</h2>
              <p className="muted">
                {editingUserId
                  ? 'Update profile details or set a new password.'
                  : 'Create a MoveMate account for an approved university email.'}
              </p>
            </div>
          </div>
          <form className="admin-user-form" onSubmit={(event) => void handleSaveUser(event)}>
            <label>
              Full name
              <input
                autoComplete="name"
                required
                maxLength={100}
                value={userForm.name}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label>
              University email
              <input
                type="email"
                autoComplete="email"
                required
                value={userForm.email}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label>
              {editingUserId ? 'New password (optional)' : 'Account password'}
              <input
                type="password"
                autoComplete="new-password"
                minLength={4}
                required={!editingUserId}
                value={userForm.password}
                placeholder={editingUserId ? 'Leave blank to keep current password' : ''}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </label>
            {userFormError && <p className="auth-form__error" role="alert">{userFormError}</p>}
            <div className="admin-user-form__actions">
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={closeUserForm}
                disabled={savingUser}
              >
                Cancel
              </button>
              <button type="submit" className="admin-primary-btn" disabled={savingUser}>
                {savingUser ? 'Saving…' : editingUserId ? 'Save changes' : 'Create user'}
              </button>
            </div>
          </form>
        </section>
      )}
      {kind === 'chatmessages' && !loading && !error && (
        <>
          <div className="admin-chat-toolbar">
            <div className="admin-chat-mode" role="group" aria-label="Chat message view">
              <button
                type="button"
                aria-pressed={chatView === 'timeline'}
                className={chatView === 'timeline' ? 'admin-chat-mode__active' : ''}
                onClick={() => setChatView('timeline')}
              >
                All chats timeline
              </button>
              <button
                type="button"
                aria-pressed={chatView === 'conversation'}
                className={chatView === 'conversation' ? 'admin-chat-mode__active' : ''}
                onClick={() => setChatView('conversation')}
              >
                Specific conversation
              </button>
            </div>
            <p className="admin-chat-toolbar__count">
              {chatView === 'timeline'
                ? `${timelineMessages.length} ${timelineMessages.length === 1 ? 'message' : 'messages'}`
                : 'Choose two users to filter'}
            </p>
          </div>
          {chatView === 'conversation' && (
            <section className="admin-conversation-picker" aria-label="Choose chat participants">
              <label>
                First account
                <select
                  value={firstAccountId}
                  onChange={(event) => setFirstAccountId(event.target.value)}
                >
                  <option value="">Select a user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name} — {user.email}</option>
                  ))}
                </select>
              </label>
              <label>
                Second account
                <select
                  value={secondAccountId}
                  onChange={(event) => setSecondAccountId(event.target.value)}
                >
                  <option value="">Select another user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name} — {user.email}</option>
                  ))}
                </select>
              </label>
            </section>
          )}
        </>
      )}
      {kind === 'chatmessages' &&
        chatView === 'conversation' &&
        firstAccountId === secondAccountId &&
        firstAccountId && (
          <p className="auth-form__error" role="alert">Choose two different users.</p>
        )}
      {kind === 'chatmessages' &&
        chatView === 'conversation' &&
        !firstAccountId &&
        !loading &&
        !error && (
          <p className="card muted">Select two accounts to load their conversation.</p>
        )}
      {kind === 'chatmessages' &&
        chatView === 'conversation' &&
        firstAccountId &&
        !secondAccountId &&
        !loading &&
        !error && (
          <p className="card muted">Now select a second account to view the conversation.</p>
        )}
      {conversationIsLoading && (
        <p className="muted" aria-live="polite">Loading selected conversation…</p>
      )}
      {conversationLoadError && (
        <p className="auth-form__error" role="alert">{conversationLoadError}</p>
      )}
      {kind === 'chatmessages' &&
        chatView === 'conversation' &&
        !loading &&
        !error &&
        conversationKey &&
        firstAccountId !== secondAccountId &&
        !conversationIsLoading &&
        !conversationLoadError &&
        conversationRows.length === 0 && (
          <p className="card muted">
            No messages between {firstAccount?.name} and {secondAccount?.name}.
          </p>
        )}
      {kind === 'chatmessages' &&
        chatView === 'timeline' &&
        !loading &&
        !error &&
        timelineMessages.length === 0 && (
          <p className="card muted">There are no messages yet.</p>
        )}
      {kind === 'chatmessages' &&
        chatView === 'conversation' &&
        !loading &&
        !error &&
        conversationRows.length > 0 &&
        !conversationIsLoading && (
          <section className="admin-chat-list" aria-label="Selected conversation messages">
            <p className="muted admin-chat-list__order">Newest messages first</p>
            {visibleChatMessages.map((row) => (
              <article className="admin-chat-message" key={String(row.id)}>
                <header>
                  <div>
                    <strong>{row.senderName} <span>to</span> {row.receiverName}</strong>
                    <time>{typeof row.sentAt === 'string' ? new Date(row.sentAt).toLocaleString() : ''}</time>
                  </div>
                  <button
                    type="button"
                    className="admin-delete-btn"
                    onClick={() => void handleDelete(String(row.id))}
                    disabled={deletingId === row.id}
                  >
                    {deletingId === row.id ? 'Deleting…' : 'Delete'}
                  </button>
                </header>
                <p>{row.text}</p>
              </article>
            ))}
          </section>
        )}
      {kind === 'chatmessages' &&
        chatView === 'timeline' &&
        !loading &&
        !error &&
        timelineMessages.length > 0 && (
          <section className="admin-chat-list" aria-label="All user chat messages">
            <p className="muted admin-chat-list__order">All users · newest messages first</p>
            {visibleChatMessages.map((row) => (
              <article className="admin-chat-message" key={row.id}>
                <header>
                  <div>
                    <strong>{row.senderName} <span>to</span> {row.receiverName}</strong>
                    <time>{new Date(row.sentAt).toLocaleString()}</time>
                  </div>
                  <button
                    type="button"
                    className="admin-delete-btn"
                    onClick={() => void handleDelete(row.id)}
                    disabled={deletingId === row.id}
                  >
                    {deletingId === row.id ? 'Deleting…' : 'Delete'}
                  </button>
                </header>
                <p>{row.text}</p>
              </article>
            ))}
          </section>
        )}
      {kind === 'posts' && !loading && !error && posts.length === 0 && (
        <p className="card muted">There are no {kind} yet.</p>
      )}
      {kind === 'posts' && !loading && !error && posts.length > 0 && (
        <div className="items__grid admin-posts-grid">
          {posts.map((post) => (
            <ItemCard
              key={post.id}
              item={{ ...post, ownerName: post.ownerName ?? undefined }}
              onAdminDelete={(id) => void handleDelete(id)}
              adminDeletePending={deletingId === post.id}
            />
          ))}
        </div>
      )}
      {kind === 'users' && !loading && !error && users.length === 0 && (
        <p className="card muted">There are no {kind} yet.</p>
      )}
      {kind === 'users' && !loading && !error && users.length > 0 && (
        <section className="admin-users-grid" aria-label="MoveMate users">
          {users.map((user) => (
            <article className="admin-user-card" key={user.id}>
              <div className="admin-user-card__top">
                <div className="admin-user-avatar" aria-hidden="true">
                  {user.name.trim().charAt(0).toUpperCase()}
                </div>
                <span className="admin-user-card__badge">Community member</span>
              </div>
              <h2>{user.name}</h2>
              <p className="admin-user-card__email">{user.email}</p>
              <div className="admin-user-card__meta">
                <span>
                  <strong>{user.favoriteCount}</strong>
                  {user.favoriteCount === 1 ? ' favorite' : ' favorites'}
                </span>
                <span>
                  Joined {new Date(user.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <button
                type="button"
                className="admin-secondary-btn admin-user-card__edit"
                onClick={() => openEditUserForm(user)}
              >
                Edit profile
              </button>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}
