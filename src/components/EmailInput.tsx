'use client'

import { useEffect, useMemo, useState, useCallback, forwardRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { cap, uiStatusToColor } from '@/lib/utils'
import Icon from '@/components/Icon'
import { AuthResponse } from '@supabase/supabase-js'
import { Override, UI_Props, UI_Status } from '@/types'
import Button from './ui/Button'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
const LS_SUGGESTIONS_KEY = 'recent_emails'
const MAX_RECENT = 5

function normalizeEmail(e: string) {
   return e.trim().toLowerCase()
}
function isEmailValid(e: string) {
   return EMAIL_RE.test(normalizeEmail(e))
}

function loadSuggestions(): string[] {
   try {
      const raw = localStorage.getItem(LS_SUGGESTIONS_KEY)
      if (!raw) return []
      const arr = JSON.parse(raw)
      return Array.isArray(arr) ? arr.filter((e) => typeof e === 'string') : []
   } catch {
      return []
   }
}
function saveSuggestion(email: string) {
   try {
      const list = loadSuggestions()
      const next = [email, ...list.filter((e) => e !== email)].slice(
         0,
         MAX_RECENT
      )
      localStorage.setItem(LS_SUGGESTIONS_KEY, JSON.stringify(next))
   } catch {}
}

interface CustomProps extends UI_Props {
   initialEmail?: string
   onSubmit?: (email: string) => Promise<AuthResponse>
   onNext?: () => void
}

type Props = Override<React.ComponentPropsWithoutRef<'form'>, CustomProps>

const EmailInput = forwardRef<HTMLInputElement, Props>((props, ref) => {
   const { initialEmail = '', onSubmit, onNext, ...rest } = props

   const t = useTranslations('auth')
   const g = useTranslations('globals')
   const locale = useLocale()

   // IMPORTANT: SSR-safe initial value (no sessionStorage read here)
   const [email, setEmail] = useState<string>(normalizeEmail(initialEmail))
   const [sending, setSending] = useState(false)
   const [state, setState] = useState<UI_Status>('')
   const [stateKey, setStateKey] = useState<string>('') // translation key

   const canSubmit = useMemo(() => isEmailValid(email), [email])

   // Suggestions loaded after mount (no hydration mismatch)
   const [suggestions, setSuggestions] = useState<string[]>([])
   useEffect(() => {
      setSuggestions(loadSuggestions())
   }, [])

   const dir = useMemo(() => (locale === 'ar' ? -1 : 1), [locale])
   const NextIcon = () => (
      <Icon name={`chevron-${dir === -1 ? 'left' : 'right'}`} />
   )

   const renderRich = useCallback(
      (key: string, values?: Record<string, unknown>) =>
         t.rich(key, {
            ...(values || {}),
            strong: (c) => <strong>{c}</strong>,
         }),
      [t]
   )

   const handleSubmit = useCallback(
      async (e: React.FormEvent<HTMLFormElement>) => {
         e.preventDefault()
         if (sending || !canSubmit || !onSubmit) return

         setSending(true)
         setState('')
         setStateKey('email.submit.checking')

         const res = await onSubmit(email)
         if (res.error) {
            const code = (res.error as any)?.status || 0
            const key =
               code === 400
                  ? 'email.submit.case-400'
                  : code === 401
                  ? 'email.submit.case-401'
                  : code === 402
                  ? 'email.submit.case-402'
                  : code === 403
                  ? 'email.submit.case-403'
                  : code === 429
                  ? 'email.submit.case-429'
                  : 'email.submit.default'
            setState(code === 402 || code === 429 ? 'warning' : 'error')
            setStateKey(key)
         } else {
            setState('success')
            setStateKey('email.submit.success')
            saveSuggestion(email)
            onNext?.() // page-level logic decides the next step
         }

         setSending(false)
      },
      [sending, canSubmit, onSubmit, email, onNext]
   )

   return (
      <form className="field" onSubmit={handleSubmit} noValidate {...rest}>
         <label htmlFor="email">{t('email.label')}</label>

         <div className="row">
            <input
               id="email"
               ref={ref}
               className="control"
               data-tone={uiStatusToColor(state)}
               data-variant="outline"
               data-size="l"
               type="email"
               inputMode="email"
               autoCapitalize="none"
               autoCorrect="off"
               spellCheck={false}
               autoComplete="email"
               placeholder={t('email.placeholder')}
               value={email}
               onChange={(e) => setEmail(normalizeEmail(e.target.value))}
               list="recent-emails"
               disabled={sending}
            />
            <datalist id="recent-emails">
               {suggestions.map((s) => (
                  <option key={s} value={s} />
               ))}
            </datalist>

            <Button
               type="submit"
               disabled={!canSubmit || sending}
               aria-busy={sending}
               data-state={state}
            >
               {cap(g('next'))}
               <NextIcon />
            </Button>
         </div>

         {stateKey && (
            <p className="control" data-state={state}>
               {renderRich(stateKey)}
            </p>
         )}
      </form>
   )
})
EmailInput.displayName = 'EmailInput'
export default EmailInput
