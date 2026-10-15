import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, type ChatMessage, type Conversation, type MessageThread } from '../api'
import { useDemoAuth } from '../auth/useDemoAuth'

const PAYMENT_METHODS = ['Cash on Pickup', 'Bank Transfer', 'QR Payment', 'Online Payment']

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function MessagesPanel() {
  const { user } = useDemoAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const toUserId = searchParams.get('to')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [thread, setThread] = useState<MessageThread | null>(null)
  const [loadedThreadFor, setLoadedThreadFor] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    let loadingConversations = false

    async function refreshConversations() {
      if (loadingConversations) return
      loadingConversations = true
      try {
        const result = await api.listConversations()
        if (active) setConversations(result)
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load conversations.')
      } finally {
        loadingConversations = false
      }
    }

    void refreshConversations()
    const interval = window.setInterval(() => void refreshConversations(), 5000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!toUserId) return
    const participantId = toUserId

    let active = true
    let loadingThread = false

    async function refreshThread() {
      if (loadingThread) return
      loadingThread = true
      try {
        const result = await api.getMessageThread(participantId)
        if (active) {
          setThread(result)
          setLoadedThreadFor(participantId)
          setError(null)
        }
      } catch (cause) {
        if (active) {
          setLoadedThreadFor(participantId)
          setError(cause instanceof Error ? cause.message : 'Could not load this conversation.')
        }
      } finally {
        loadingThread = false
      }
    }

    void refreshThread()
    const interval = window.setInterval(() => void refreshThread(), 2500)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [toUserId])

  useEffect(() => {
    const body = bodyRef.current
    if (body) body.scrollTop = body.scrollHeight
  }, [thread?.messages.length, toUserId])

  async function sendMessage(text: string, clearDraft = false) {
    if (!toUserId || !text.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const sent = await api.sendMessage(toUserId, text.trim())
      if (clearDraft) setDraft('')
      setThread((current) => current?.participant.id === toUserId
        ? {
            ...current,
            messages: current.messages.some((message) => message.id === sent.id)
              ? current.messages
              : [...current.messages, sent].sort((a, b) => a.sentAt.localeCompare(b.sentAt)),
          }
        : current)
      const latest = await api.listConversations()
      setConversations(latest)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send your message.')
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(draft, true)
  }

  async function deleteMessage(message: ChatMessage) {
    if (message.senderId !== user?.id || deletingIds.has(message.id)) return
    setError(null)
    setDeletingIds((current) => new Set(current).add(message.id))
    try {
      await api.deleteMessage(message.id)
      setThread((current) => current?.participant.id === toUserId
        ? { ...current, messages: current.messages.filter((entry) => entry.id !== message.id) }
        : current)
      setConversations(await api.listConversations())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this message.')
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current)
        next.delete(message.id)
        return next
      })
    }
  }

  const activeThread = thread?.participant.id === toUserId ? thread : null
  const threadLoading = Boolean(toUserId && loadedThreadFor !== toUserId)
  const participant = activeThread?.participant
  const otherConversations = conversations.filter((conversation) => conversation.userId !== user?.id)

  return (
    <main className="messages-page">
      <div className="messages-layout card">
        <aside className="messages-sidebar">
          <h2 className="messages-sidebar__title">Messages</h2>
          {otherConversations.length === 0 ? (
            <p className="messages-sidebar__empty">Your conversations will appear here.</p>
          ) : (
            otherConversations.map((conversation) => (
              <button
                key={conversation.userId}
                type="button"
                className={`thread-preview${toUserId === conversation.userId ? ' thread-preview--active' : ''}`}
                onClick={() => setSearchParams({ to: conversation.userId })}
              >
                <span className="messages-chat__avatar-letter">
                  {conversation.name.charAt(0).toUpperCase()}
                </span>
                <span className="thread-preview__body">
                  <span className="thread-preview__name">{conversation.name}</span>
                  <span className="thread-preview__snippet">
                    {conversation.latestMessage.text}
                  </span>
                </span>
              </button>
            ))
          )}
        </aside>

        <section className="messages-chat" aria-label="Conversation">
          {participant ? (
            <>
              <header className="messages-chat__header">
                <span className="messages-chat__avatar-letter">
                  {participant.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="messages-chat__seller">{participant.name}</div>
                  <div className="messages-chat__listing">Direct messages</div>
                </div>
              </header>

              <div className="messages-chat__body" ref={bodyRef} aria-live="polite">
                {threadLoading ? (
                  <p className="messages-chat__empty">Loading conversation…</p>
                ) : !activeThread ? (
                  <p className="messages-chat__empty">This conversation is unavailable.</p>
                ) : activeThread.messages.length === 0 ? (
                  <p className="messages-chat__empty">
                    Say hello to start your conversation with {participant.name}.
                  </p>
                ) : (
                  activeThread.messages.map((message: ChatMessage) => (
                    <div
                      key={message.id}
                      className={`msg${message.senderId === user?.id ? ' msg--out' : ' msg--in'}`}
                    >
                      <p>{message.text}</p>
                      <div className="msg__meta">
                        <time dateTime={message.sentAt}>{formatTime(message.sentAt)}</time>
                        {message.senderId === user?.id && (
                          <button
                            type="button"
                            className="msg__delete"
                            aria-label="Delete sent message"
                            title="Delete message"
                            disabled={deletingIds.has(message.id)}
                            onClick={() => void deleteMessage(message)}
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {error && <p className="messages-error" role="alert">{error}</p>}

              <section className="messages-payment" aria-label="Payment methods">
                <p className="messages-payment__title">Quick message: choose a payment method</p>
                <div className="messages-payment__options">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      className="pay-option"
                      disabled={sending || threadLoading}
                      onClick={() => void sendMessage(`I can pay by ${method}.`)}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </section>

              <form className="messages-compose" onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="Type a message…"
                  value={draft}
                  maxLength={4000}
                  aria-label="Message"
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button
                  type="submit"
                  className="messages-compose__send"
                  aria-label="Send message"
                  disabled={!draft.trim() || sending}
                >
                  <IconSend />
                </button>
              </form>
            </>
          ) : (
            <>
              <header className="messages-chat__header">
                <div>
                  <div className="messages-chat__seller">Your conversations</div>
                  <div className="messages-chat__listing">Choose a chat or message a seller from a listing.</div>
                </div>
              </header>
              <div className="messages-chat__body">
                {error ? (
                  <p className="messages-error" role="alert">{error}</p>
                ) : (
                  <p className="messages-chat__empty">Select a conversation to see your messages.</p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
