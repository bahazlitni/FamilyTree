// proxy.ts
import createMiddleware from 'next-intl/middleware'

// Keep in sync with your i18n/routing setup
export default createMiddleware({
   locales: ['en', 'ar', 'fr'],
   defaultLocale: 'en',
   // choose one of: 'never' | 'always' | 'as-needed'
   // 'always' ensures URLs are prefixed (/en, /ar)
   localePrefix: 'always',
})

// Ensure the proxy runs on both the root and all locale-prefixed paths
export const config = {
   matcher: ['/', '/(en|ar)/:path*'],
}
