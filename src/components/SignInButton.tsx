// components/SignInButton.tsx
'use client'
import { cap } from '@/lib/utils'
import Link from 'next/link'
import { useLocale, useTranslations } from 'use-intl'
import { usePathname, useSearchParams } from 'next/navigation'

export default function SignInButton() {
   const g = useTranslations('globals')
   const locale = useLocale()
   const pathname = usePathname()
   const search = useSearchParams()
   const here = pathname + (search?.toString() ? `?${search}` : '')
   const next = encodeURIComponent(here)

   return (
      <Link
         href={`/${locale}/auth?callback=${next}`}
         aria-label="Log In"
         className="control"
      >
         {cap(g('login'))}
      </Link>
   )
}
