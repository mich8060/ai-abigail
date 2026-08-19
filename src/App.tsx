import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import abigailAvatar from './assets/abigail-avatar.png'
import abigailLogo from './assets/abigail-logo.svg'
import { generateAbigailReplies, isCrisis, welcomeFor } from './lib/abigail'
import { askAbigailLlm } from './lib/llm'
import type { ChatMessage } from './types'
import './App.css'

const NAME_KEY = 'abigail-first-name'

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function makeMessage(role: ChatMessage['role'], text: string): ChatMessage {
  return { id: uid(), role, text, createdAt: Date.now() }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function normalizeName(raw: string): string {
  const first = raw.trim().split(/\s+/)[0] ?? ''
  const cleaned = first.replace(/[^\p{L}\p{M}'-]/gu, '').slice(0, 24)
  if (!cleaned) return ''
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function loadName(): string {
  try {
    return normalizeName(localStorage.getItem(NAME_KEY) ?? '')
  } catch {
    return ''
  }
}

function saveName(name: string): void {
  localStorage.setItem(NAME_KEY, name)
}

function AbigailAvatar() {
  return <img className="avatar-face" src={abigailAvatar} alt="" />
}

function StoryAvatar({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <div className={`story-ring ${size}`}>
      <div className="avatar-wrap">
        <AbigailAvatar />
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="row abigail">
      <StoryAvatar />
      <div className="bubble typing" aria-label="Abigail is typing">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

function NameGate({ onJoin }: { onJoin: (name: string) => void }) {
  const [value, setValue] = useState('')
  const ready = normalizeName(value).length > 0

  function submit(event: FormEvent) {
    event.preventDefault()
    const name = normalizeName(value)
    if (!name) return
    onJoin(name)
  }

  return (
    <div className="page">
      <main className="shell gate">
        <div className="gate-body">
          <img src={abigailLogo} alt="Abigail" className="gate-logo" />
          <p className="gate-kicker">Direct</p>
          <h2>What’s your first name?</h2>
          <p className="gate-copy">
            Abigail will use it. Whether that’s a compliment is... pending.
          </p>
          <form className="gate-form" onSubmit={submit}>
            <input
              autoFocus
              autoComplete="given-name"
              placeholder="First name"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <button type="submit" disabled={!ready}>
              Continue
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const [firstName, setFirstName] = useState(loadName)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = loadName()
    return stored ? [makeMessage('abigail', welcomeFor(stored))] : []
  })
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState(loadName)
  const scroller = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const node = scroller.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  function join(name: string) {
    saveName(name)
    setFirstName(name)
    setNameDraft(name)
    setMessages([makeMessage('abigail', welcomeFor(name))])
  }

  async function replyTo(text: string, history: ChatMessage[]) {
    setBusy(true)
    let replies: string[]

    if (isCrisis(text)) {
      replies = generateAbigailReplies(text, history)
    } else {
      try {
        const content = await askAbigailLlm(history, firstName)
        replies = [content]
      } catch {
        replies = generateAbigailReplies(text, history)
      }
    }

    for (const [index, reply] of replies.entries()) {
      if (index > 0) await sleep(420)
      setMessages((current) => [...current, makeMessage('abigail', reply)])
    }

    setBusy(false)
    input.current?.focus()
  }

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    const userMessage = makeMessage('user', trimmed)
    const history = [...messages, userMessage]
    setDraft('')
    setMessages(history)
    void replyTo(trimmed, history)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    send(draft)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send(draft)
    }
  }

  function clearChat() {
    setMessages([makeMessage('abigail', welcomeFor(firstName))])
    setSettingsOpen(false)
  }

  function updateName(event: FormEvent) {
    event.preventDefault()
    const name = normalizeName(nameDraft)
    if (!name) return
    saveName(name)
    setFirstName(name)
    setNameDraft(name)
    setSettingsOpen(false)
  }

  if (!firstName) return <NameGate onJoin={join} />

  return (
    <div className="page">
      <main className="shell">
        <header className="top">
          <div className="identity">
            <StoryAvatar />
            <div className="identity-copy">
              <h1>Abigail, the annoying AI</h1>
              <p className="status">
                {busy ? 'Typing With Her Whole Chest' : 'Active Now · Judging Lightly'}
                {' · '}
                Based On The Real Abigail
              </p>
            </div>
          </div>
          <div className="top-actions">
            <button
              className="icon-btn"
              type="button"
              aria-label="Details"
              onClick={() => setSettingsOpen(true)}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm.75 15h-1.5v-6h1.5zm0-8h-1.5V7h1.5z"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className="thread" ref={scroller}>
          <div className="thread-hero">
            <StoryAvatar size="lg" />
            <p className="hero-name">Abigail</p>
            <p className="hero-handle">based on the real Abigail</p>
            <p className="hero-time">Today</p>
          </div>
          {messages.map((message) => (
            <div key={message.id} className={`row ${message.role}`}>
              {message.role === 'abigail' && <StoryAvatar />}
              <p className="bubble">{message.text}</p>
            </div>
          ))}
          {busy && <TypingDots />}
        </div>

        <div className="composer-wrap">
          <form className="composer" onSubmit={onSubmit}>
            <span className="cam" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M12 9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8-3h-3.2l-1.8-2H9L7.2 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-8 12.5A5.5 5.5 0 1 1 17.5 13 5.5 5.5 0 0 1 12 18.5z"
                />
              </svg>
            </span>
            <textarea
              ref={input}
              rows={1}
              value={draft}
              placeholder="Message…"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
            />
            {draft.trim() ? (
              <button type="submit" disabled={busy} className="send-text">
                Send
              </button>
            ) : (
              <span className="composer-icons" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path
                    fill="currentColor"
                    d="M12 21s-6.5-4.2-9.3-8.2C.7 10.2 1.2 6.8 4 5.3 6.2 4.1 8.7 5 12 8c3.3-3 5.8-3.9 8-2.7 2.8 1.5 3.3 4.9 1.3 7.5C18.5 16.8 12 21 12 21z"
                  />
                </svg>
              </span>
            )}
          </form>
        </div>
      </main>

      {settingsOpen && (
        <div className="modal" role="dialog" aria-labelledby="settings-title">
          <button
            className="scrim"
            type="button"
            aria-label="Close details"
            onClick={() => setSettingsOpen(false)}
          />
          <div className="panel">
            <div className="panel-head">
              <h2 id="settings-title">Details</h2>
              <button type="button" className="icon-btn" onClick={() => setSettingsOpen(false)}>
                ✕
              </button>
            </div>
            <form className="name-form" onSubmit={updateName}>
              <label>
                First name
                <input
                  value={nameDraft}
                  autoComplete="given-name"
                  onChange={(event) => setNameDraft(event.target.value)}
                />
              </label>
              <button type="submit" className="ig-btn">
                Save
              </button>
            </form>
            <p className="hint">
              Chatting as <strong>{firstName}</strong>. Abigail will use it, for better or worse.
            </p>
            <button className="danger" type="button" onClick={clearChat}>
              Clear chat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
