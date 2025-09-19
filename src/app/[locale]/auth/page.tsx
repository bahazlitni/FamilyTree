'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useLocale, useTranslations } from 'next-intl'
import { cap } from '@/lib/utils'
import OTPInput from '@/components/OTPInput'
import EmailInput from '@/components/EmailInput'
import { AuthResponse } from '@supabase/supabase-js'
import { AppRole } from '@/types'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import '@/styles/components/dialog.css'
import Icon from '@/components/Icon'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggleButton from '@/components/ThemeToggleButton'
import { useRouter } from 'next/navigation'

type UIState = '' | 'warning' | 'success' | 'error'
type Step = 'email' | 'otp' | 'completed'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
const SS_EMAIL_KEY = 'auth:email'
const SS_STEP_KEY = 'auth:step'
const SS_OTP_TS_KEY = 'auth:otp_ts'
const EXPIRY_DURATION_MS = 5 * 60 * 1000
const EXPIRY_GRACE_MS = 3 * 1000

const normalizeEmail = (e: string) => e.trim().toLowerCase()
const isEmailValid = (e: string) => EMAIL_RE.test(normalizeEmail(e))
const nowMs = () => Date.now()

function parseHashParams(hash: string) {
   const h = new URLSearchParams(hash.replace(/^#/, ''))
   return {
      access_token: h.get('access_token'),
      refresh_token: h.get('refresh_token'),
      error: h.get('error_description') || h.get('error'),
   }
}
function computeSafeNext(nextParam: string | null, locale: string) {
   const fallback = `/${locale}/canvas`
   if (!nextParam) return fallback
   try {
      if (!nextParam.startsWith('/') || nextParam.startsWith('//'))
         return fallback
      if (nextParam.replace(/\/+$/, '') === `/${locale}/auth`) return fallback
      return nextParam
   } catch {
      return fallback
   }
}

const ssGet = (k: string) => {
   try {
      return sessionStorage.getItem(k) || ''
   } catch {
      return ''
   }
}
const ssSet = (k: string, v: string) => {
   try {
      sessionStorage.setItem(k, v)
   } catch {}
}
const ssDel = (k: string) => {
   try {
      sessionStorage.removeItem(k)
   } catch {}
}

const ssGetEmail = () => ssGet(SS_EMAIL_KEY)
const ssSetEmail = (v: string) => ssSet(SS_EMAIL_KEY, normalizeEmail(v))
const ssClearEmail = () => ssDel(SS_EMAIL_KEY)

const ssGetStep = (): Step | null => {
   const v = ssGet(SS_STEP_KEY)
   return v === 'otp' || v === 'completed' ? v : v === 'email' ? 'email' : null
}
const ssSetStep = (s: Step) => ssSet(SS_STEP_KEY, s)
const ssClearStep = () => ssDel(SS_STEP_KEY)

const ssGetOtpTs = () => {
   const v = ssGet(SS_OTP_TS_KEY)
   return v ? Number(v) : 0
}
const ssSetOtpTs = (ts: number) => ssSet(SS_OTP_TS_KEY, String(ts))
const ssClearOtpTs = () => ssDel(SS_OTP_TS_KEY)

const isOtpFresh = (issuedAtMs: number) =>
   issuedAtMs && nowMs() - issuedAtMs < EXPIRY_DURATION_MS - EXPIRY_GRACE_MS

type CompletedMsg = {
   key: `completed.${string}`
   values?: Record<string, unknown>
   state: UIState
   details?: string
} | null

export default function AuthPage() {
   const { theme } = useTheme()
   const supabase = createClient()
   const locale = useLocale()
   const t = useTranslations('auth')
   const g = useTranslations('globals')
   const searchParams = useSearchParams()

   const router = useRouter()

   const safeNext = useMemo(() => {
      const nextParam = searchParams.get('callback')
      return computeSafeNext(nextParam, locale)
   }, [searchParams, locale])

   const [step, setStep] = useState<Step>('email')
   const submittedEmailRef = useRef<string>('')
   const [completedMsg, setCompletedMsg] = useState<CompletedMsg>(null)
   const [signingOut, setSigningOut] = useState(false)
   const emailInputRef = useRef<HTMLInputElement>(null)

   // NEW: while we are navigating to /api/auth/callback, suppress guards
   const navigatingRef = useRef(false)

   const renderRich = useCallback(
      (key: string, values?: Record<string, unknown>) =>
         t.rich(key, {
            ...(values || {}),
            strong: (c) => <strong>{c}</strong>,
         }),
      [t]
   )

   useEffect(() => {
      const id = setTimeout(() => emailInputRef.current?.focus(), 120)
      return () => clearTimeout(id)
   }, [])

   useEffect(() => {
      ;(async () => {
         const { data: sess0 } = await supabase.auth.getSession()
         if (sess0.session) {
            const em = sess0.session.user?.email || ''
            submittedEmailRef.current = normalizeEmail(em)
            ssSetEmail(submittedEmailRef.current)
            ssSetStep('completed')
            setStep('completed')
            return
         }

         const url = new URL(window.location.href)
         const { access_token, refresh_token, error } = parseHashParams(
            url.hash
         )
         const hasImplicit = !!(access_token && refresh_token) && !error
         const hasPkce = !!url.searchParams.get('code')
         if (hasImplicit || hasPkce) {
            ssSetStep('completed')
            setStep('completed')
            return
         }

         const lastStep = ssGetStep() ?? 'email'
         const lastEmail = ssGetEmail()
         submittedEmailRef.current = lastEmail
         const fresh = isEmailValid(lastEmail) && isOtpFresh(ssGetOtpTs())
         setStep(
            lastStep === 'otp' || lastStep === 'completed'
               ? fresh
                  ? 'otp'
                  : 'email'
               : 'email'
         )
      })()
   }, [supabase])

   // GUARD: do nothing while navigating to callback
   useEffect(() => {
      if (navigatingRef.current) return
      let cancelled = false
      ;(async () => {
         const { data } = await supabase.auth.getSession()
         const signedIn = !!data.session
         const email = ssGetEmail() || submittedEmailRef.current
         const valid = isEmailValid(email)
         const fresh = isOtpFresh(ssGetOtpTs())

         let next: Step = step
         if (signedIn) next = 'completed'
         else if (step === 'completed') next = valid && fresh ? 'otp' : 'email'
         else if (step === 'otp') next = valid && fresh ? 'otp' : 'email'
         else next = 'email'

         if (!cancelled && next !== step) {
            setStep(next)
            ssSetStep(next)
         }
      })()
      return () => {
         cancelled = true
      }
   }, [step, supabase])

   useEffect(() => {
      ssSetStep(step)
   }, [step])

   useEffect(() => {
      if (step !== 'otp') return
      const id = setTimeout(() => {
         const el = document.querySelector<HTMLInputElement>(
            '[data-otp-first="true"], input[autocomplete="one-time-code"]'
         )
         el?.focus()
      }, 80)
      return () => clearTimeout(id)
   }, [step])

   // --- API calls (unchanged shapes) ---

   const onEmailSubmit = useCallback(
      async (email: string) => {
         const normalized = normalizeEmail(email)
         ssSetEmail(normalized)

         const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normalized, locale, theme }),
         })

         if (!res.ok) {
            const { error } = await res
               .json()
               .catch(() => ({ error: 'Failed' }))
            return {
               data: { user: null, session: null },
               error: new Error(error),
            } as any
         }

         ssSetOtpTs(nowMs())
         ssSetStep('otp')
         setStep('otp')
         return { data: { user: null, session: null }, error: null } as any
      },
      [locale, theme]
   )

   const onOTPSubmit = useCallback(
      async (token: string): Promise<AuthResponse> => {
         const email = ssGetEmail() || submittedEmailRef.current
         const res = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code: token, callback: safeNext }),
         })
         const json = await res.json()

         if (!res.ok) {
            return {
               data: { user: null, session: null },
               error: {
                  message: json?.error,
                  status: res.status,
               },
            } as any
         }

         // IMPORTANT: do NOT setStep('completed') here.
         // We will navigate to the server confirm route which sets cookies,
         // then that route redirects to `callback`.
         if (json?.redirect) {
            navigatingRef.current = true
            window.location.assign(json.redirect)
            return { data: { user: null, session: null }, error: null } as any
         }

         return {
            data: { user: null, session: null },
            error: new Error('No redirect link'),
         } as any
      },
      [safeNext]
   )

   const onOTPResend = useCallback(async (): Promise<AuthResponse> => {
      const email = ssGetEmail() || submittedEmailRef.current
      const res = await fetch('/api/auth/send-otp', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, locale, theme }),
      })
      if (!res.ok) {
         const { error } = await res.json().catch(() => ({ error: 'Failed' }))
         return {
            data: { user: null, session: null },
            error: new Error(error),
         } as any
      }
      ssSetOtpTs(nowMs())
      return { data: { user: null, session: null }, error: null } as any
   }, [locale, theme])

   // Completed handshake (kept as-is for implicit/PKCE fallbacks)
   useEffect(() => {
      if (step !== 'completed') return
      let cancelled = false
      ;(async () => {
         setCompletedMsg({ key: 'completed.checking', state: '' })

         const { data: sess0 } = await supabase.auth.getSession()
         if (!sess0.session) {
            const url = new URL(window.location.href)
            const {
               access_token,
               refresh_token,
               error: hashErr,
            } = parseHashParams(url.hash)

            if (hashErr) {
               if (!cancelled)
                  setCompletedMsg({
                     key: 'completed.auth-error',
                     state: 'error',
                     details: hashErr,
                  })
            } else if (access_token && refresh_token) {
               const { error } = await supabase.auth.setSession({
                  access_token,
                  refresh_token,
               })
               if (!cancelled) {
                  setCompletedMsg(
                     error
                        ? {
                             key: 'completed.auth-error',
                             state: 'error',
                             details: error.message,
                          }
                        : { key: 'completed.signed-implicit', state: 'success' }
                  )
               }
            } else if (url.searchParams.get('code')) {
               const { error } = await supabase.auth.exchangeCodeForSession(
                  url.toString()
               )
               if (!cancelled) {
                  setCompletedMsg(
                     error
                        ? {
                             key: 'completed.exchange-warning',
                             state: 'warning',
                             details: error.message,
                          }
                        : { key: 'completed.signed-pkce', state: 'success' }
                  )
               }
            } else {
               if (!cancelled)
                  setCompletedMsg({
                     key: 'completed.no-auth-params',
                     state: 'warning',
                  })
            }
         }

         const { data: sess1 } = await supabase.auth.getSession()

         // Clean URL (keep callback only)
         {
            const cleanParams = new URLSearchParams({ callback: safeNext })
            const clean = `${
               location.origin
            }/${locale}/auth?${cleanParams.toString()}`
            window.history.replaceState({}, '', clean)
         }

         if (!cancelled) {
            if (sess1.session) {
               const userEmail =
                  sess1.session.user?.email ||
                  ssGetEmail() ||
                  submittedEmailRef.current
               const { data: appRole, error: rErr } = await supabase.rpc(
                  'app_role'
               )
               if (rErr) {
                  setCompletedMsg({
                     key: 'completed.role-error',
                     state: 'error',
                     details: rErr.message,
                  })
               } else {
                  const resolved: AppRole =
                     appRole === 'admin' || appRole === 'member'
                        ? (appRole as AppRole)
                        : null
                  setCompletedMsg({
                     key: 'completed.connected-as',
                     state: 'success',
                     values: {
                        email: userEmail ?? '—',
                        role: resolved ?? 'anon',
                     },
                  })
               }
            } else {
               const email = ssGetEmail() || submittedEmailRef.current
               const next =
                  isEmailValid(email) && isOtpFresh(ssGetOtpTs())
                     ? 'otp'
                     : 'email'
               ssSetStep(next)
               setStep(next)
            }
         }
      })()
      return () => {
         cancelled = true
      }
   }, [step, supabase, locale, safeNext])

   const handleSignOut = useCallback(async () => {
      try {
         setSigningOut(true)
         await fetch('/api/auth/signout', {
            method: 'POST',
            cache: 'no-store',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
         })
      } finally {
         ssClearEmail()
         ssClearStep()
         ssClearOtpTs()
         setCompletedMsg(null)
         setStep('email')
         setSigningOut(false)
      }
   }, [])

   return (
      <AnimatePresence>
         <motion.div
            className="dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
         >
            <motion.div
               className="container"
               role="dialog"
               initial={{ y: 12, scale: 0.96 }}
               animate={{ y: 0, scale: 1 }}
               transition={{
                  type: 'spring',
                  stiffness: 340,
                  damping: 28,
                  mass: 0.7,
               }}
            >
               <div className="header">
                  <button
                     onClick={() => {
                        if (step === 'otp') setStep('email')
                        else router.push(`/${locale}/canvas`)
                     }}
                     className="control"
                  >
                     <Icon
                        name={
                           step === 'otp'
                              ? locale === 'ar'
                                 ? 'chevron-right'
                                 : 'chevron-left'
                              : 'home'
                        }
                     />
                  </button>
                  <h1>{cap(g('login'))}</h1>
                  <div className="row">
                     <ThemeToggleButton />
                     <LanguageSwitcher />
                  </div>
               </div>

               <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 25 * (locale === 'ar' ? -1 : 1) }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
               >
                  {step === 'email' && (
                     <EmailInput
                        ref={emailInputRef}
                        initialEmail=""
                        onSubmit={onEmailSubmit}
                        onNext={() => {} /* driven in onEmailSubmit */}
                     />
                  )}

                  {step === 'otp' && (
                     <form>
                        <label htmlFor="OTP">
                           {renderRich('OTP.sent-to', {
                              email: submittedEmailRef.current || ssGetEmail(),
                           })}
                        </label>
                        <div className="row">
                           <OTPInput
                              id="OTP"
                              onSubmit={onOTPSubmit}
                              onResend={onOTPResend}
                              // IMPORTANT: do not advance here; navigation handles the flow
                              onNext={undefined}
                              length={6}
                           />
                        </div>
                     </form>
                  )}

                  {step === 'completed' && (
                     <p
                        className="control"
                        data-state={completedMsg?.state ?? ''}
                        data-variant="inline-text"
                     >
                        {completedMsg ? (
                           <>
                              {renderRich(
                                 completedMsg.key,
                                 completedMsg.values
                              )}
                              {completedMsg.details ? (
                                 <> — {completedMsg.details}</>
                              ) : null}
                           </>
                        ) : (
                           renderRich('completed.checking')
                        )}
                     </p>
                  )}
               </motion.div>

               {step === 'email' && (
                  <div className="row">
                     <Link
                        data-variant="hyperlink"
                        className="control"
                        href={`/${locale}/faq/auth/make-account`}
                     >
                        {cap(t('email.how do i make an account?'))}
                     </Link>
                  </div>
               )}

               {step === 'completed' && (
                  <div className="row">
                     <button
                        type="button"
                        className="control"
                        data-variant="hyperlink"
                        onClick={handleSignOut}
                        disabled={signingOut}
                        aria-busy={signingOut}
                     >
                        {cap(g('logout'))}
                     </button>
                     <Link href={safeNext} className="control">
                        {cap(g('continue'))}
                     </Link>
                  </div>
               )}
            </motion.div>
         </motion.div>
      </AnimatePresence>
   )
}
