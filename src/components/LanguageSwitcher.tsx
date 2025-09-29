'use client'
import { useLocale, useTranslations } from 'next-intl'
import { routing } from '@/i18n/routing'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { cap } from '@/lib/utils'
import SelectBox, { type SelectItem } from '@/components/ui/SelectBox'
import { useRouter } from '@/i18n/navigation' // next-intl-aware router
import { UI_Props } from '@/types'

export function LanguageSwitcher({ variant, tone, size }: UI_Props) {
   const locale = useLocale()
   const t = useTranslations('languages')
   const pathname = usePathname()
   const searchParams = useSearchParams()
   const router = useRouter()

   // Strip current locale prefix from the pathname to build the target path.
   const hrefbase = useMemo(() => {
      const re = new RegExp(`^/${locale}(?=/|$)`)
      const p = pathname.replace(re, '')
      return p === '' ? '/' : p
   }, [pathname, locale])

   // Preserve ALL current query params.
   const query = useMemo(
      () => Object.fromEntries(searchParams.entries()),
      [searchParams]
   )

   // Build items from available locales
   const items: SelectItem[] = useMemo(
      () =>
         routing.locales.map((l) => ({
            id: l,
            label: cap(t(l)),
            disabled: l === locale, // optional: disable current one
         })),
      [locale, t]
   )

   return (
      <SelectBox
         items={items}
         value={locale}
         onSelect={(next) => {
            if (!next || next === locale) return
            // next-intl-aware navigation, keep path + query, change locale
            router.push({ pathname: hrefbase, query }, { locale: next as any })
         }}
         variant={variant}
         tone={tone}
         size={size}
         placeholder={cap(t('language'))}
         aria-label={cap(t('language'))}
      />
   )
}
