'use client'
import { useTheme } from '@/contexts/ThemeContext'
import { FiMoon, FiSun } from 'react-icons/fi'
import Button from '@/components/ui/Button'
import { UI_Props } from '@/types'

export default function ThemeToggleButton({ tone, size, variant }: UI_Props) {
   const { theme, toggle } = useTheme()
   return (
      <Button
         onClick={toggle}
         aria-label="toggle theme"
         variant={variant}
         tone={tone}
         size={size}
      >
         {theme === 'dark' ? <FiSun /> : <FiMoon />}
      </Button>
   )
}
