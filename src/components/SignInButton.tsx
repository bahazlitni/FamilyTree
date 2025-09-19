// components/SignInButton.tsx
'use client'
import { cap } from '@/lib/utils'
import Link from 'next/link'
import { useLocale, useTranslations } from 'use-intl'
import { usePathname, useSearchParams } from 'next/navigation'

export default function SignInButton({
   dataVariant,
   dataState,
}: {
   dataVariant?: string
   dataState?: string
}) {
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
         data-variant={dataVariant}
         data-state={dataState}
      >
         {cap(g('login'))}
      </Link>
   )
}
