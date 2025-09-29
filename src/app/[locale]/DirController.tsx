// app/[locale]/DirController.tsx
'use client'
import { useEffect } from 'react'

export default function DirController({ locale }: { locale: string }) {
   const dir = ['ar', 'fa', 'he', 'ur'].includes(locale) ? 'rtl' : 'ltr'
   useEffect(() => {
      const root = document.documentElement
      // Only touch if needed to avoid reflows
      if (root.getAttribute('lang') !== locale)
         root.setAttribute('lang', locale)
      if (root.getAttribute('dir') !== dir) root.setAttribute('dir', dir)
   }, [locale])
   return null
}
