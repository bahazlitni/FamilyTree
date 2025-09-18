'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useLocale, useTranslations } from 'next-intl'
import { cap } from '@/lib/utils'
import OTPInput from '@/components/OTPInput'
import { AuthResponse } from '@supabase/supabase-js'
import EmailInput from '@/components/EmailInput'
import { AppRole } from '@/types'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import '@/styles/components/dialog.css'
import Icon from '@/components/Icon'

/* ---------------- types & constants ---------------- */
type UIState = '' | 'warning' | 'success' | 'error'
type Step = 'email' | 'otp' | 'completed'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

const SS_EMAIL_KEY = 'auth:email' // last submitted normalized email
const SS_STEP_KEY = 'auth:step' // requested: 'email' | 'otp' | 'completed'
const SS_OTP_TS_KEY = 'auth:otp_ts' // ms when OTP email was last sent

const EXPIRY_DURATION_MS = 5 * 60 * 1000 // 5 minutes
const EXPIRY_GRACE_MS = 3 * 1000 // treat <3s left as expired

/* ---------------- helpers ---------------- */
function normalizeEmail(e: string) {
   return e.trim().toLowerCase()
}
function isEmailValid(e: string) {
   return EMAIL_RE.test(normalizeEmail(e))
}
function nowMs() {
   return Date.now()
}

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

/* ----- sessionStorage accessors (safe) ----- */
function ssGet(key: string): string {
   try {
      return sessionStorage.getItem(key) || ''
   } catch {
      return ''
   }
}
function ssSet(key: string, val: string) {
   try {
      sessionStorage.setItem(key, val)
   } catch {}
}
function ssDel(key: string) {
   try {
      sessionStorage.removeItem(key)
   } catch {}
}

function ssGetEmail(): string {
   return ssGet(SS_EMAIL_KEY)
}
function ssSetEmail(v: string) {
   ssSet(SS_EMAIL_KEY, normalizeEmail(v))
}
function ssClearEmail() {
   ssDel(SS_EMAIL_KEY)
}

function ssGetStep(): Step | null {
   const v = ssGet(SS_STEP_KEY)
   return v === 'otp' || v === 'completed' ? v : v === 'email' ? 'email' : null
}
function ssSetStep(step: Step) {
   ssSet(SS_STEP_KEY, step)
}
function ssClearStep() {
   ssDel(SS_STEP_KEY)
}

function ssGetOtpTs(): number {
   const v = ssGet(SS_OTP_TS_KEY)
   return v ? Number(v) : 0
}
function ssSetOtpTs(ts: number) {
   ssSet(SS_OTP_TS_KEY, String(ts))
}
function ssClearOtpTs() {
   ssDel(SS_OTP_TS_KEY)
}

function isOtpFresh(issuedAtMs: number): boolean {
   if (!issuedAtMs) return false
   const elapsed = nowMs() - issuedAtMs
   return elapsed < EXPIRY_DURATION_MS - EXPIRY_GRACE_MS
}

/* ----- “rich message” model for completed step ----- */
type CompletedMsg = {
   key: `completed.${string}` // translation key under 'auth'
   values?: Record<string, unknown>
   state: UIState
   details?: string
} | null

/* -------------- component --------------- */
export default function AuthPage() {
   const supabase = createClient()
   const locale = useLocale()
   const t = useTranslations('auth')
   const g = useTranslations('globals')
   const searchParams = useSearchParams()

   const safeNext = useMemo(() => {
      const nextParam = searchParams.get('callback')
      return computeSafeNext(nextParam, locale)
   }, [searchParams, locale])

   // requested step (UI intent)
   const [step, setStep] = useState<Step>('email')

   // facts for rendering/guards
   const submittedEmailRef = useRef<string>('') // normalized
   const [completedMsg, setCompletedMsg] = useState<CompletedMsg>(null)
   const [signingOut, setSigningOut] = useState(false)

   const emailInputRef = useRef<HTMLInputElement>(null)

   const renderRich = useCallback(
      (key: string, values?: Record<string, unknown>) =>
         t.rich(key, {
            ...(values || {}),
            strong: (c) => <strong>{c}</strong>,
         }),
      [t]
   )

   /* ---------- autofocus (after mount) ---------- */
   useEffect(() => {
      const id = setTimeout(() => emailInputRef.current?.focus(), 120)
      return () => clearTimeout(id)
   }, [])

   /* ---------- FIRST LOAD: resolve requested step combinatorially ---------- */
   useEffect(() => {
      ;(async () => {
         // 1) If already signed in → go completed
         const { data: sess0 } = await supabase.auth.getSession()
         if (sess0.session) {
            const em = sess0.session.user?.email || ''
            submittedEmailRef.current = normalizeEmail(em)
            ssSetEmail(submittedEmailRef.current)
            ssSetStep('completed')
            setStep('completed')
            return
         }

         // 2) URL auth params → completed (handshake will finalize)
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

         // 3) Not signed in → restore last session step/email (Option B)
         const lastStep = ssGetStep() ?? 'email'
         const lastEmail = ssGetEmail()
         submittedEmailRef.current = lastEmail

         if (lastStep === 'otp') {
            const fresh = isEmailValid(lastEmail) && isOtpFresh(ssGetOtpTs())
            setStep(fresh ? 'otp' : 'email')
         } else if (lastStep === 'completed') {
            // without session, completed is invalid; fallback using same rule as above
            const fresh = isEmailValid(lastEmail) && isOtpFresh(ssGetOtpTs())
            setStep(fresh ? 'otp' : 'email')
         } else {
            setStep('email')
         }
      })()
   }, [supabase])

   /* ---------- ALWAYS GUARDS whenever `step` changes ---------- */
   useEffect(() => {
      let cancelled = false
      ;(async () => {
         const { data } = await supabase.auth.getSession()
         const signedIn = !!data.session

         const email = ssGetEmail() || submittedEmailRef.current
         const valid = isEmailValid(email)
         const fresh = isOtpFresh(ssGetOtpTs())

         let next: Step = step

         if (signedIn) {
            next = 'completed'
         } else {
            if (step === 'completed') next = valid && fresh ? 'otp' : 'email'
            else if (step === 'otp') next = valid && fresh ? 'otp' : 'email'
            else next = 'email'
         }

         if (!cancelled && next !== step) {
            setStep(next)
            ssSetStep(next)
         }
      })()
      return () => {
         cancelled = true
      }
   }, [step, supabase])

   // mirror requested step for future refreshes (safe)
   useEffect(() => {
      ssSetStep(step)
   }, [step])

   /* ---------- email redirect target (stable between SSR/CSR) ---------- */
   const emailRedirectTo = useMemo(() => {
      const origin =
         typeof window !== 'undefined'
            ? window.location.origin
            : process.env.NEXT_PUBLIC_BASE_URL || ''
      const base = process.env.NEXT_PUBLIC_BASE_URL || origin
      const params = new URLSearchParams({ callback: safeNext })
      return `${base}/${locale}/auth?${params.toString()}`
   }, [locale, safeNext])

   /* ---------- submit/resend handlers ---------- */
   const onEmailSubmit = useCallback(
      async (email: string): Promise<AuthResponse> => {
         const normalized = normalizeEmail(email)
         submittedEmailRef.current = normalized
         ssSetEmail(normalized)

         // OTP economy: if we've sent one within the window, skip resend
         if (isOtpFresh(ssGetOtpTs())) {
            ssSetStep('otp')
            setStep('otp')
            return { data: { user: null, session: null }, error: null } as any
         }

         const res = await supabase.auth.signInWithOtp({
            email: normalized,
            options: { emailRedirectTo, shouldCreateUser: true },
         })

         if (!res.error) {
            ssSetOtpTs(nowMs()) // remember issuance moment
            ssSetStep('otp')
            setStep('otp')
         }
         return res
      },
      [emailRedirectTo, supabase]
   )

   const onOTPSubmit = useCallback(
      async (token: string): Promise<AuthResponse> => {
         return await supabase.auth.verifyOtp({
            email: ssGetEmail() || submittedEmailRef.current,
            token,
            type: 'email',
         })
      },
      [supabase]
   )

   const onOTPResend = useCallback(async (): Promise<AuthResponse> => {
      const res = await supabase.auth.signInWithOtp({
         email: ssGetEmail() || submittedEmailRef.current,
         options: { shouldCreateUser: true, emailRedirectTo },
         // @ts-expect-error parity with submit
         type: 'email',
      })
      if (!res.error) {
         ssSetOtpTs(nowMs()) // refresh freshness
      }
      return res
   }, [emailRedirectTo, supabase])

   /* ---------- handshake / finalize when `step` === completed ---------- */
   useEffect(() => {
      if (step !== 'completed') return
      let cancelled = false
      ;(async () => {
         setCompletedMsg({ key: 'completed.checking', state: '' })

         // Try to establish from URL if no session yet
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
               // Not signed in → fallback (OTP if email valid & fresh)
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

   /* ---------- sign out (inline) ---------- */
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
                     onClick={() => setStep('email')}
                     className="control"
                     disabled={step !== 'otp'}
                  >
                     <Icon
                        name={
                           locale === 'ar' ? 'chevron-right' : 'chevron-left'
                        }
                     />
                  </button>

                  <h1>{cap(g('login'))}</h1>
                  <LanguageSwitcher />
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
                        // IMPORTANT: do NOT read sessionStorage here (SSR-safe)
                        initialEmail=""
                        onSubmit={onEmailSubmit}
                        onNext={() => {
                           /* onEmailSubmit drives step */
                        }}
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
                              onSubmit={async (token) => {
                                 const res = await onOTPSubmit(token)
                                 if (!res.error) setStep('completed')
                                 return res
                              }}
                              onResend={onOTPResend}
                              onNext={() => setStep('completed')}
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
                        href="/faq/auth/make-account"
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
