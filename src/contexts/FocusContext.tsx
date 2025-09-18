'use client'

import React, {
   createContext,
   useContext,
   useEffect,
   useState,
   ReactNode,
   useCallback,
   useMemo,
} from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'

export type FocusCtx = {
   focus: string | null | undefined
   requestFocus: (id?: string | null) => void
}

const FocusContext = createContext<FocusCtx | null>(null)

export function FocusProvider({ children }: { children: ReactNode }) {
   const searchParams = useSearchParams()
   const locale = useLocale()
   const basePath = useMemo(() => `/${locale}/canvas`, [locale])

   const path = usePathname() || '/'
   const router = useRouter()
   const [focus, setFocus] = useState<string | null | undefined>(undefined)

   const replaceQuery = useCallback(
      (mutate: (qp: URLSearchParams) => void) => {
         const qp = new URLSearchParams(searchParams.toString())
         mutate(qp)
         const qs = qp.toString()
         router.replace(qs ? `${path}?${qs}` : path, { scroll: false })
      },
      [router, path, searchParams]
   )

   /**
    * URL → state (single source of truth):
    * - If ?focus=ID appears, set state to ID, then remove it from the URL.
    * - If ?focus is absent and we haven't synced yet, set state to null.
    * This makes the effect idempotent and avoids loops.
    */
   useEffect(() => {
      const param = searchParams.get('focus')

      // First-time sync when there's no param
      if (param == null && focus === undefined) {
         setFocus(null)
         return
      }

      // Consume the param exactly once
      if (param != null && param !== focus) {
         setFocus(param)
         // remove it on the same tick; this triggers one more searchParams update,
         // but the guard (param !== focus) prevents another state change
         replaceQuery((qp) => qp.delete('focus'))
      }
   }, [searchParams, focus, replaceQuery])

   /**
    * Public API: request a focus change.
    * - If not on /canvas, navigate there with ?focus=ID so the effect can consume it.
    * - If already on /canvas, set ?focus=ID via replace; the effect will sync state and then clear it.
    * - Passing null clears focus (state + URL) idempotently.
    */
   const requestFocus = useCallback(
      (id?: string | null) => {
         const onCanvas = path.startsWith(basePath)

         if (!onCanvas) {
            if (id) router.push(`${basePath}?focus=${encodeURIComponent(id)}`)
            else router.push(basePath)
            return
         }

         if (!id) {
            // Clear focus explicitly
            if (focus !== null) setFocus(null)
            replaceQuery((qp) => qp.delete('focus'))
            return
         }

         if (focus === id) return
         replaceQuery((qp) => qp.set('focus', id))
      },
      [basePath, router, path, focus, replaceQuery]
   )

   return (
      <FocusContext.Provider value={{ focus, requestFocus }}>
         {children}
      </FocusContext.Provider>
   )
}

export function useFocus() {
   const ctx = useContext(FocusContext)
   if (!ctx) throw new Error('useFocus must be used inside FocusProvider')
   return ctx
}
