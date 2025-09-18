// components/SignOutButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cap, pruneSessionStorage } from '@/lib/utils'
import { useNullableAppGraph } from '@/contexts/AppGraphContext'

const SESSION_VER_KEY = 'auth:session:v'

function bumpSessionVersionAndClearCaches() {
   try {
      // bump the session version — this changes the `/api/data::v=<...>` cache key
      sessionStorage.setItem(SESSION_VER_KEY, String(Date.now()))
      // prune versioned API caches for neatness (optional)
      const keys: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
         const k = sessionStorage.key(i)
         if (k && k.startsWith('/api/data::v=')) keys.push(k)
      }
      keys.forEach((k) => sessionStorage.removeItem(k))
   } catch {}
}

export default function SignOutButton() {
   const g = useTranslations('globals')
   const router = useRouter()
   const [loading, setLoading] = useState(false)
   const graphCtx = useNullableAppGraph() // may be null if used outside provider

   async function handleSignOut() {
      try {
         setLoading(true)
         await fetch('/api/auth/signout', {
            method: 'POST',
            cache: 'no-store',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
         })
      } finally {
         // 1) invalidate per-session caches
         bumpSessionVersionAndClearCaches()
         // 2) notify any listeners (AppGraphProvider) to reload immediately
         try {
            window.dispatchEvent(new Event('auth:changed'))
         } catch {}
         // 3) explicitly refresh provider if available
         graphCtx?.refresh?.()
         // 4) refresh route (RSC + any server-only bits)
         router.refresh()
         setLoading(false)
         // Optional redirect:
         // router.replace(`/${locale}/auth`)

         // remove member and admin
         pruneSessionStorage(null)
      }
   }

   return (
      <button
         aria-label="Log Out"
         className="control"
         onClick={handleSignOut}
         disabled={loading}
         aria-busy={loading}
      >
         {cap(g('logout'))}
      </button>
   )
}
