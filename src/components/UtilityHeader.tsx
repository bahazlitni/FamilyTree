import { MouseEventHandler } from 'react'
import { LanguageSwitcher } from './LanguageSwitcher'
import ThemeToggleButton from './ThemeToggleButton'
import Button from './ui/Button'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import Icon from './Icon'
import { cap } from '@/lib/utils'

interface CustomProps {
   customButton?: {
      onClick?: MouseEventHandler<HTMLButtonElement>
      iconName: string
   }
   title: string
}

export default function UtilityHeader({ customButton, title }: CustomProps) {
   const locale = useLocale()
   const router = useRouter()

   return (
      <header className="utility-header">
         <Button
            onClick={
               customButton?.onClick ?? (() => router.push(`/${locale}/canvas`))
            }
         >
            <Icon name={customButton?.iconName ?? 'home'} />
         </Button>
         <h1>{title}</h1>
         <div className="row">
            <ThemeToggleButton />
            <LanguageSwitcher />
         </div>
      </header>
   )
}
