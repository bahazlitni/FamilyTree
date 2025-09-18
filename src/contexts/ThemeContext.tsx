'use client'

import React, {
   createContext,
   useContext,
   useEffect,
   useMemo,
   useState,
} from 'react'
import type { Theme } from '@/types'

type ThemeCtx = {
   theme: Theme
   setTheme: (t: Theme) => void
   toggle: () => void
}

const ThemeContext = createContext<ThemeCtx | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
   const [theme, setTheme] = useState<Theme>('dark')

   // initialize from localStorage or system preference
   useEffect(() => {
      const stored = (typeof window !== 'undefined' &&
         localStorage.getItem('theme')) as Theme | null
      if (stored === 'light' || stored === 'dark') {
         setTheme(stored)
         return
      }
      const prefersLight = window.matchMedia?.(
         '(prefers-color-scheme: light)',
      ).matches
      setTheme(prefersLight ? 'light' : 'dark')
   }, [])

   // apply to <html> and persist
   useEffect(() => {
      if (typeof document === 'undefined') return
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('theme', theme)
   }, [theme])

   const value = useMemo(
      () => ({
         theme,
         setTheme,
         toggle: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
      }),
      [theme],
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
