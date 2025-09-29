// components/SignInButton.tsx
'use client'
import { cap } from '@/lib/utils'
import { useLocale, useTranslations } from 'use-intl'
import { usePathname, useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { UI_Props } from '@/types'

export default function SignInButton({ variant, tone, size }: UI_Props) {
   const g = useTranslations('globals')
   const locale = useLocale()
   const pathname = usePathname()
   const search = useSearchParams()
   const here = pathname + (search?.toString() ? `?${search}` : '')
   const next = encodeURIComponent(here)
   const router = useRouter()

   return (
      <Button
         onClick={() => router.push(`/${locale}/auth?callback=${next}`)}
         aria-label="Log In"
         variant={variant}
         tone={tone}
         size={size}
      >
         {cap(g('login'))}
      </Button>
   )
}
