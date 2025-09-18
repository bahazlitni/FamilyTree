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
import { Override } from '@/types'

import '@/styles/components/otp.css'

/** Utility: make CustomProps override overlapping DOM props */

type Status = '' | 'warning' | 'success' | 'error'

const COOLDOWN_SUCCESS_SECONDS = 30
const COOLDOWN_FAIL_SECONDS = 5
const COOLDOWN_SENTINEL = -999
const CARET_IDX_SENTINEL = -1
const COOLDOWN_RATE_LIMIT_SECONDS = 120

function emptyCode(length: number) {
   return Array<string>(length).fill('')
}
function isFilled(code: string[]): boolean {
   return code.every((d) => d !== '')
}

interface CustomProps {
   length?: number
   onSubmit?: (token: string) => Promise<AuthResponse>
   onResend?: () => Promise<AuthResponse>
   onNext?: () => void
}

type DivProps = React.ComponentPropsWithoutRef<'div'>
type Props = Override<DivProps, CustomProps>

const OTPInput = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
   const { length = 6, onSubmit, onResend, onNext, ...rest } = props

   const [code, setCode] = useState<string[]>(emptyCode(length))
   const [status, setStatus] = useState<Status>('')
   const [messageStatus, setMessageStatus] = useState<Status>('')
   const [caretIdx, setCaretIdx] = useState<number>(CARET_IDX_SENTINEL)
   const [cooldown, setCooldown] = useState<number>(0)
   const [allSelected, setAllSelected] = useState<boolean>(false)
   const inputsRef = useRef<(HTMLInputElement | null)[]>(
      Array(length).fill(null)
   )
   const [loading, setLoading] = useState<boolean>(false)
   const [message, setMessage] = useState<string>('')

   const tResend = useTranslations('auth.OTP.resend')
   const tSubmit = useTranslations('auth.OTP.submit')

   // Keep refs array and code length in sync if `length` changes
   useEffect(() => {
      inputsRef.current = Array(length).fill(null)
      setCode(emptyCode(length))
      setCaretIdx(CARET_IDX_SENTINEL)
      setAllSelected(false)
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
   }

   const handleChange = (e: React.ChangeEvent<HTMLInputElement>, i: number) => {
      const raw = e.target.value.replace(/\D/g, '')
      if (!raw) return
      setCodeAt(i, raw[0])

      if (i < length - 1) {
         // find next empty box (skip already filled)
         let nextI = i + 1
         setCode((curr) => {
            while (nextI < length - 1 && curr[nextI] !== '') nextI++
            return curr
         })
         focusIdx(nextI)
      }
   }

   const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData('text').trim()
      if (/^\d+$/.test(pasted) && pasted.length === length) {
         setCode(pasted.split(''))
         setCaretIdx(CARET_IDX_SENTINEL)
      }
      e.preventDefault()
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
            setCode(emptyCode(length))
            focusIdx(0)
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
      }

      if (e.key === 'ArrowRight' && i < length - 1) focusIdx(i + 1)
      if (e.key === 'ArrowLeft' && i > 0) focusIdx(i - 1)
   }

   const resendCode = useCallback(async () => {
      if (!onResend) return
      setLoading(true)

      const { error } = await onResend()
      if (!error) {
         setMessage(tResend('success'))
         setMessageStatus('success')
         setCooldown(COOLDOWN_SUCCESS_SECONDS)
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
   }, [onResend, tResend])

   // Auto-submit when all boxes are filled
   useEffect(() => {
      if (!onSubmit || !isFilled(code) || loading) return

      setLoading(true)
      setMessage(tSubmit('checking'))

      onSubmit(code.join(''))
         .then(({ error }) => {
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
                  default:
                     setMessage(tSubmit('default'))
                     break
               }
            }
         })
         .finally(() => setLoading(false))
   }, [code, onSubmit, onNext, tSubmit, loading])

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
                  data-variant="otp-box"
                  data-state={
                     allSelected || caretIdx === i ? 'selected' : status
                  }
               >
                  <input
                     onDoubleClick={() => setAllSelected((s) => !s)}
                     ref={makeRef(i)}
                     type="text"
                     inputMode="numeric"
                     pattern="[0-9]*"
                     maxLength={1}
                     value=""
                     onChange={(e) => handleChange(e, i)}
                     onKeyDown={(e) => handleKeyDown(e, i)}
                     onFocus={() => focusIdx(i)}
                     onBlur={() => focusIdx(CARET_IDX_SENTINEL)}
                     onPaste={handlePaste}
                     disabled={loading}
                     aria-label={`Digit ${i + 1}`}
                     data-variant="otp-box"
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

            <p data-state={status || messageStatus} className="control">
               {message}
            </p>
         </div>
      </div>
   )
})

OTPInput.displayName = 'OTPInput'
export default memo(OTPInput)
