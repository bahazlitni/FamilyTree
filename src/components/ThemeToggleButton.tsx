'use client'
import { useTheme } from '@/contexts/ThemeContext'
import { FiMoon, FiSun } from 'react-icons/fi'

export default function ThemeToggleButton() {
   const { theme, toggle } = useTheme()
   return (
      <button className="control" onClick={toggle} aria-label="toggle theme">
         {theme === 'dark' ? <FiSun /> : <FiMoon />}
      </button>
   )
}
