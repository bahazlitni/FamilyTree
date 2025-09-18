'use client'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cap } from '@/lib/utils'
import { FiChevronDown } from 'react-icons/fi'

export function LanguageSwitcher() {
   const locale = useLocale()
   const t = useTranslations('languages')
   const pathname = usePathname()
   const searchParams = useSearchParams()
   const [open, setOpen] = useState(false)
   const rootRef = useRef<HTMLDivElement>(null)

   // Strip current locale prefix from the pathname to build the target path.
   const hrefbase = useMemo(() => {
      const re = new RegExp(`^/${locale}(?=/|$)`)
      const p = pathname.replace(re, '')
      return p === '' ? '/' : p
   }, [pathname, locale])

   // Preserve ALL current query params (step, next, etc.)
   const query = useMemo(
      () => Object.fromEntries(searchParams.entries()),
      [searchParams]
   )

   // Close when clicking outside
   useEffect(() => {
      if (!open) return
      const onPointerDown = (e: MouseEvent) => {
         if (!rootRef.current) return
         if (!rootRef.current.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener('pointerdown', onPointerDown)
      return () => document.removeEventListener('pointerdown', onPointerDown)
   }, [open])

   return (
      <div ref={rootRef} style={{ position: 'relative' }}>
         <button
            className="control"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
         >
            <p>{cap(t('language'))}</p>
            <FiChevronDown />
         </button>

         {open && (
            <ul className="control" data-variant="dropdown" role="listbox">
               {routing.locales.map(
                  (l) =>
                     l !== locale && (
                        <li key={l} role="option" aria-selected={l === locale}>
                           <Link
                              className="control"
                              href={{ pathname: hrefbase, query }}
                              locale={l}
                              onClick={() => setOpen(false)}
                              aria-current={l === locale ? 'page' : undefined}
                           >
                              {cap(t(l))}
                           </Link>
                        </li>
                     )
               )}
            </ul>
         )}
      </div>
   )
}
