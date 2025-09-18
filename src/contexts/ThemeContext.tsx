'use client'

import React, {
   createContext,
   useContext,
   useEffect,
   useMemo,
   useState,
   useRef,
   ReactNode,
} from 'react'
import type { Theme } from '@/types'

type ThemeMode = 'light' | 'dark' | 'auto'

type ThemeCtx = {
   mode: ThemeMode
   theme: Theme
   setMode: (m: ThemeMode) => void
   toggle: () => void
}

const STORAGE_KEY = 'theme' // stores 'light' | 'dark' | 'auto'

const ThemeContext = createContext<ThemeCtx | null>(null)

function getSystemPref(): Theme {
   if (typeof window === 'undefined') return 'dark'
   return window.matchMedia?.('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
}

function readInitialMode(): ThemeMode {
   try {
      const sp = new URLSearchParams(window.location.search)
      const q = sp.get('theme')
      if (q === 'light' || q === 'dark' || q === 'auto') return q
   } catch {}

   try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
         return stored
      }
   } catch {}

   return 'auto'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
   const [mode, setMode] = useState<ThemeMode>('auto')
   const [theme, setTheme] = useState<Theme>('dark')
   const mqlRef = useRef<MediaQueryList | null>(null)

   useEffect(() => {
      const initial = readInitialMode()
      setMode(initial)
   }, [])

   useEffect(() => {
      if (typeof window === 'undefined') return
      mqlRef.current = window.matchMedia('(prefers-color-scheme: light)')

      const handleChange = () => {
         if (mode === 'auto') {
            setTheme(getSystemPref())
         }
      }

      mqlRef.current.addEventListener?.('change', handleChange)
      return () => {
         mqlRef.current?.removeEventListener?.('change', handleChange)
      }
   }, [mode])

   // Compute & apply theme theme; persist mode; sync across tabs
   useEffect(() => {
      const nextResolved = mode === 'auto' ? getSystemPref() : mode
      setTheme(nextResolved)

      // apply to <html>
      if (typeof document !== 'undefined') {
         document.documentElement.setAttribute('data-theme', nextResolved)
      }

      // persist configured mode (not theme)
      try {
         localStorage.setItem(STORAGE_KEY, mode)
      } catch {
         /* no-op */
      }
   }, [mode])

   // Cross-tab sync (when another tab changes the theme)
   useEffect(() => {
      const onStorage = (e: StorageEvent) => {
         if (e.key === STORAGE_KEY && e.newValue) {
            const v = e.newValue as ThemeMode
            if (v === 'light' || v === 'dark' || v === 'auto') {
               setMode(v)
            }
         }
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
   }, [])

   const value = useMemo<ThemeCtx>(
      () => ({
         mode,
         theme,
         setMode,
         toggle: () => setMode((cur) => (cur === 'light' ? 'dark' : 'light')),
      }),
      [mode, theme]
   )

   return (
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
   )
}

export function useTheme() {
   const ctx = useContext(ThemeContext)
   if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
   return ctx
}
