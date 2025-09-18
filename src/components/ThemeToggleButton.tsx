'use client'

import { useTheme } from '@/contexts/ThemeContext'

export default function ThemeToggleButton() {
   const { theme, toggle } = useTheme()
   const isLight = theme === 'light'

   return (
      <button
         type="button"
         aria-pressed={isLight}
         onClick={toggle}
         title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
         className="themeToggle"
      >
         <span className="themeToggle__icon" aria-hidden>
            {isLight ? '☀️' : '🌙'}
         </span>
      </button>
   )
}
