// contexts/AppGraphContext.tsx
'use client'

import React, {
   createContext,
   useContext,
   useEffect,
   useState,
   ReactNode,
} from 'react'
import type { AppGraph } from '@/types'
import loadAppGraph from '@/lib/loadAppGraph'

type Ctx = {
   pendingId?: string
   appGraph: AppGraph | null
   loading: boolean
   error: string | null
   refresh: () => void
}

const AppGraphContext = createContext<Ctx | null>(null)

// same key used by auth page / signout button when login state changes
const SESSION_VER_KEY = 'auth:session:v'

export function AppGraphProvider({ children }: { children: ReactNode }) {
   const [appGraph, setAppGraph] = useState<AppGraph | null>(null)
   const [loading, setLoading] = useState(true)
   const [error, setError] = useState<string | null>(null)

   async function fetchGraph() {
      setLoading(true)
      setError(null)
      try {
         const g = await loadAppGraph()
         setAppGraph(g)
      } catch (e: any) {
         setError(e?.message ?? 'Failed to load family graph')
      } finally {
         setLoading(false)
      }
   }

   useEffect(() => {
      fetchGraph()

      // 1) refresh on custom auth change event (emitted by SignOutButton / after login handshake)
      const onAuthChanged = () => fetchGraph()
      window.addEventListener('auth:changed', onAuthChanged as EventListener)

      // 2) refresh when another tab bumps the session version (storage event)
      const onStorage = (e: StorageEvent) => {
         if (e.key === SESSION_VER_KEY) fetchGraph()
      }
      window.addEventListener('storage', onStorage)

      // 3) optional: refresh when tab regains focus
      const onFocus = () => {
         // you could debounce/throttle this if you prefer
         // fetchGraph()
      }
      window.addEventListener('focus', onFocus)

      return () => {
         window.removeEventListener(
            'auth:changed',
            onAuthChanged as EventListener
         )
         window.removeEventListener('storage', onStorage)
         window.removeEventListener('focus', onFocus)
      }
   }, [])

   return (
      <AppGraphContext.Provider
         value={{ appGraph, loading, error, refresh: fetchGraph }}
      >
         {children}
      </AppGraphContext.Provider>
   )
}

export function useAppGraph() {
   const ctx = useContext(AppGraphContext)
   if (!ctx) throw new Error('useAppGraph must be used inside AppGraphProvider')
   return ctx
}

export function useNullableAppGraph() {
   return useContext(AppGraphContext)
}
