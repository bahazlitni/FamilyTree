'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import styles from './page.module.css'

const LS_KEY = 'recent_emails'
const MAX_RECENT = 5

function loadRecentEmails(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((e) => typeof e === 'string') : []
  } catch { return [] }
}

function saveRecentEmail(email: string) {
  try {
    const current = loadRecentEmails()
    const next = [email, ...current.filter((e) => e !== email)].slice(0, MAX_RECENT)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  } catch {}
}

export default function EmailSignInPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    setRecent(loadRecentEmails())
  }, [])

  const canSubmit = useMemo(() => {
    const v = email.trim().toLowerCase()
    // very light validation
    return !!v && v.includes('@') && v.includes('.')
  }, [email])

  async function sendLink() {
    const normalized = email.trim().toLowerCase()
    if (!normalized) return
    setSending(true)
    setStatus('Sending...')

    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    })

    if (error) {
      setStatus(`Error: ${error.message}`)
    } else {
      setStatus('Check your inbox for a magic link.')
      saveRecentEmail(normalized)
      setRecent(loadRecentEmails())
    }
    setSending(false)
  }

  return (
    <main className={styles.wrap}>
      <section className={styles.card} aria-labelledby="signin-title">
        <header className={styles.header}>
          <h1 id="signin-title" className={styles.title}>Sign in</h1>
          <p className={styles.subtitle}>We’ll email you a magic link to continue.</p>
        </header>

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>Email</label>
          <div className={styles.inputRow}>
            <input
              id="email"
              className={styles.input}
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              list="recent-emails"
              aria-describedby="email-help"
            />
            <datalist id="recent-emails">
              {recent.map((e) => <option key={e} value={e} />)}
            </datalist>
            <button
              className={styles.button}
              onClick={sendLink}
              disabled={!canSubmit || sending}
            >
              {sending ? 'Sending…' : 'Send magic link'}
            </button>
          </div>
        </div>

        {!!status && (
          <div
            className={
              status.startsWith('Error')
                ? `${styles.status} ${styles.isError}`
                : `${styles.status} ${styles.isOk}`
            }
            role="status"
            aria-live="polite"
          >
            {status}
          </div>
        )}
      </section>
    </main>
  )
}
