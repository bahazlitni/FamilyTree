'use client'

import React, {
   useCallback,
   useEffect,
   useRef,
   useState,
   memo,
   ClipboardEvent,
} from 'react'
import { AuthResponse } from '@supabase/supabase-js'
import { useTranslations } from 'next-intl'
import { Override, UI_Status } from '@/types'

import '@/styles/components/otp.css'
import { uiStatusToColor } from '@/lib/utils'

const COOLDOWN_SUCCESS_SECONDS = 30
const COOLDOWN_FAIL_SECONDS = 5
const COOLDOWN_SENTINEL = -999
const COOLDOWN_RATE_LIMIT_SECONDS = 120
const CARET_IDX_SENTINEL = -1

const emptyCode = (length: number) => Array<string>(length).fill('')
const isFilled = (code: string[]) => code.every((d) => d !== '')
const codeToStr = (code: string[]) => code.join('')

interface CustomProps {
   length?: number
   onSubmit?: (token: string) => Promise<AuthResponse>
   onResend?: () => Promise<AuthResponse>
   onNext?: () => void
   /** if false, disables auto-submit behavior (defaults to true) */
   autoSubmit?: boolean
}

type DivProps = React.ComponentPropsWithoutRef<'div'>
type Props = Override<DivProps, CustomProps>

const OTPInput = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
   const {
      length = 6,
      onSubmit,
      onResend,
      onNext,
      autoSubmit = true,
      ...rest
   } = props

   const [code, setCode] = useState<string[]>(emptyCode(length))
   const [status, setStatus] = useState<UI_Status>('')
   const [messageStatus, setMessageStatus] = useState<UI_Status>('')
   const [caretIdx, setCaretIdx] = useState<number>(CARET_IDX_SENTINEL)
   const [cooldown, setCooldown] = useState<number>(0)
   const [allSelected, setAllSelected] = useState<boolean>(false)
   const [loading, setLoading] = useState<boolean>(false)
   const [message, setMessage] = useState<string>('')

   const inputsRef = useRef<(HTMLInputElement | null)[]>(
      Array(length).fill(null)
   )

   // Prevent auto-submit loops: store the last code string we attempted
   const lastTriedRef = useRef<string>('')

   const tResend = useTranslations('auth.OTP.resend')
   const tSubmit = useTranslations('auth.OTP.submit')

   // Keep refs and code length synced if `length` changes
   useEffect(() => {
      inputsRef.current = Array(length).fill(null)
      setCode(emptyCode(length))
      lastTriedRef.current = '' // reset last-attempt marker
      setCaretIdx(CARET_IDX_SENTINEL)
      setAllSelected(false)
      setStatus('')
      setMessageStatus('')
      setMessage('')
   }, [length])

   const focusIdx = (i: number) => {
      if (i >= 0 && i < length) inputsRef.current[i]?.focus()
      setCaretIdx(i)
      setAllSelected(false)
   }

   const setCodeAt = (i: number, val: string) => {
      setCode((prev) => {
         const next = [...prev]
         next[i] = val
         return next
      })
      // user edited → allow a new attempt
      lastTriedRef.current = ''
   }

   const clearAll = useCallback(() => {
      setCode(emptyCode(length))
      setStatus('')
      setMessageStatus('')
      setMessage('')
      setAllSelected(false)
      lastTriedRef.current = ''
      setCaretIdx(0)
      setTimeout(() => inputsRef.current[0]?.focus(), 0)
   }, [length])

   const handleChange = (e: React.ChangeEvent<HTMLInputElement>, i: number) => {
      const raw = e.target.value.replace(/\D/g, '')
      if (!raw) return

      // Keep only first digit typed here
      setCodeAt(i, raw[0])

      // Move caret to next empty cell (or stop at last)
      if (i < length - 1) {
         setCode((curr) => {
            let nextI = i + 1
            while (nextI < length && curr[nextI] !== '') nextI++
            // if all subsequent are filled, keep focus at last cell
            focusIdx(Math.min(nextI, length - 1))
            return curr
         })
      }
   }

   const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
      // try to spread digits across boxes, starting at focused index (or 0)
      const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '')
      if (!pasted) return
      e.preventDefault()

      const start = caretIdx >= 0 ? caretIdx : 0
      const next = [...code]
      let j = 0
      for (let i = start; i < length && j < pasted.length; i++, j++) {
         next[i] = pasted[j]
      }
      setCode(next)
      lastTriedRef.current = '' // allow new attempt
      // move caret to last filled or end
      const lastPos = Math.min(start + pasted.length, length - 1)
      focusIdx(lastPos)
   }

   const handleKeyDown = (
      e: React.KeyboardEvent<HTMLInputElement>,
      i: number
   ) => {
      if (loading) return

      if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) {
         if (e.ctrlKey && e.code === 'KeyA') setAllSelected(true)
         return
      }

      if (e.key === 'Backspace') {
         e.preventDefault()
         setStatus('')
         setMessageStatus('')
         setMessage('')

         if (allSelected) {
            clearAll()
            return
         }

         setCode((prev) => {
            const next = [...prev]
            if (prev[i]) {
               next[i] = ''
            } else if (i > 0) {
               next[i - 1] = ''
               focusIdx(i - 1)
            }
            return next
         })
         lastTriedRef.current = '' // editing → allow new attempt
      }

      if (e.key === 'ArrowRight' && i < length - 1) focusIdx(i + 1)
      if (e.key === 'ArrowLeft' && i > 0) focusIdx(i - 1)
      if (e.key === 'Enter' && onSubmit && isFilled(code) && !loading) {
         // Manual submit: ignore lastTried guard to respect Enter intent
         void performSubmit(true)
      }
   }

   const resendCode = useCallback(async () => {
      if (!onResend) return
      setLoading(true)

      const { error } = await onResend()
      if (!error) {
         setMessage(tResend('success'))
         setMessageStatus('success')
         setCooldown(COOLDOWN_SUCCESS_SECONDS)
         clearAll() // start fresh after resend
      } else {
         const statusCode = (error as any)?.status || 0
         setMessageStatus('error')
         switch (statusCode) {
            case 400:
               setMessage(tResend('case-400'))
               setCooldown(COOLDOWN_FAIL_SECONDS)
               break
            case 401:
               setMessage(tResend('case-401'))
               setCooldown(COOLDOWN_SENTINEL)
               break
            case 402:
               setMessage(tResend('case-402'))
               setCooldown(COOLDOWN_RATE_LIMIT_SECONDS)
               break
            case 403:
               setMessage(tResend('case-403'))
               setCooldown(COOLDOWN_SENTINEL)
               break
            case 429:
               setMessage(tResend('case-429'))
               setCooldown(COOLDOWN_RATE_LIMIT_SECONDS)
               break
            default:
               setMessage(tResend('default'))
               setCooldown(COOLDOWN_FAIL_SECONDS)
               break
         }
      }
      setStatus('')
      setLoading(false)
   }, [onResend, tResend, clearAll])

   // Internal submit that respects lastTried guard unless forced (Enter)
   const performSubmit = useCallback(
      async (force = false) => {
         if (!onSubmit) return
         const token = codeToStr(code)
         if (!isFilled(code)) return
         if (!force && lastTriedRef.current === token) return // prevent loop

         setLoading(true)
         setMessage(tSubmit('checking'))
         lastTriedRef.current = token

         try {
            const { error } = await onSubmit(token)
            if (!error) {
               setMessage(tSubmit('success'))
               setStatus('success')
               setCooldown(COOLDOWN_SENTINEL)
               onNext?.()
            } else {
               const statusCode = (error as any)?.status || 0
               setStatus(statusCode === 410 ? 'warning' : 'error')
               setCooldown(COOLDOWN_FAIL_SECONDS)
               switch (statusCode) {
                  case 400:
                     setMessage(tSubmit('case-400'))
                     break
                  case 401:
                     setMessage(tSubmit('case-401'))
                     break
                  case 403:
                     setMessage(tSubmit('case-403'))
                     break
                  case 410:
                     setMessage(tSubmit('case-410'))
                     break
                  case 429:
                     setMessage(tSubmit('case-429'))
                     break
                  default:
                     setMessage(tSubmit('default'))
                     break
               }
               // NOTE: we do NOT clear the code here; we just mark lastTriedRef,
               // so no immediate re-submit will occur until user edits.
            }
         } finally {
            setLoading(false)
         }
      },
      [code, onSubmit, onNext, tSubmit]
   )

   // Auto-submit when filled, but only if different from last tried
   useEffect(() => {
      if (!autoSubmit || !onSubmit || loading) return
      if (!isFilled(code)) return
      const token = codeToStr(code)
      if (token && token !== lastTriedRef.current) {
         void performSubmit(false)
      }
   }, [code, onSubmit, autoSubmit, performSubmit, loading])

   // Cooldown tick
   useEffect(() => {
      if (cooldown <= 0) return
      const interval = setInterval(() => {
         setCooldown((prev) => {
            if (prev <= 1) {
               clearInterval(interval)
               return 0
            }
            return prev - 1
         })
      }, 1000)
      return () => clearInterval(interval)
   }, [cooldown])

   const makeRef = useCallback(
      (idx: number) => (el: HTMLInputElement | null) => {
         inputsRef.current[idx] = el
      },
      []
   )

   return (
      <div
         ref={ref}
         {...rest}
         className="otp"
         role="group"
         aria-label="One-time code"
      >
         <ol>
            {code.map((digit, i) => (
               <li
                  key={i}
                  className="control"
                  role="otp-box"
                  data-tone={
                     allSelected || caretIdx === i
                        ? 'blue'
                        : uiStatusToColor(status)
                  }
               >
                  <input
                     onDoubleClick={() => setAllSelected((s) => !s)}
                     ref={makeRef(i)}
                     type="text"
                     inputMode="numeric"
                     pattern="[0-9]*"
                     maxLength={1}
                     value="" // visual digit is rendered outside
                     onChange={(e) => handleChange(e, i)}
                     onKeyDown={(e) => handleKeyDown(e, i)}
                     onFocus={() => focusIdx(i)}
                     onBlur={() => setCaretIdx(CARET_IDX_SENTINEL)}
                     onPaste={handlePaste}
                     disabled={loading}
                     aria-label={`Digit ${i + 1}`}
                     data-variant="otp-box"
                     {...(i === 0
                        ? {
                             'data-otp-first': 'true',
                             autoComplete: 'one-time-code',
                          }
                        : {})}
                  />
                  {digit}
               </li>
            ))}
         </ol>

         <div className="bottom">
            <button
               type="button"
               className="control"
               data-variant="hyperlink"
               data-state={status}
               disabled={
                  (cooldown !== COOLDOWN_SENTINEL && cooldown > 0) || loading
               }
               onClick={resendCode}
            >
               {cooldown > 0
                  ? tResend('resend-in-n-seconds', { n: cooldown })
                  : tResend('resend-code')}
            </button>

            <p
               data-tone={uiStatusToColor(status || messageStatus)}
               className="control"
            >
               {message}
            </p>
         </div>
      </div>
   )
})

OTPInput.displayName = 'OTPInput'
export default memo(OTPInput)
