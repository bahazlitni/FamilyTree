// app/[locale]/layout.tsx
import type { ReactNode } from 'react'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { FocusProvider } from '@/contexts/FocusContext'
import { Suspense } from 'react'
import DirController from './DirController'

export function generateStaticParams() {
   return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
   children,
   params,
}: {
   children: ReactNode
   params: Promise<{ locale: string }>
}) {
   const { locale } = await params
   if (!hasLocale(routing.locales, locale)) notFound()

   // Enables RSC translation APIs and per-request locale
   setRequestLocale(locale)

   return (
      <NextIntlClientProvider>
         <DirController locale={locale} />

         <ThemeProvider>
            <Suspense fallback={null}>
               <FocusProvider>{children}</FocusProvider>
            </Suspense>
         </ThemeProvider>
      </NextIntlClientProvider>
   )
}
