import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
   locales: ['en', 'fr', 'ar'] as const,
   defaultLocale: 'en',
})

export type AppLocale = (typeof routing.locales)[number]
