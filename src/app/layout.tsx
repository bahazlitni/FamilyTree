// app/layout.tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { getLocale } from 'next-intl/server'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
   variable: '--font-geist-mono',
   subsets: ['latin'],
})

export const metadata: Metadata = {
   title: 'Zlitni Tree',
   description: "See whether there is another you in Zlitni's family!",
}

export default async function RootLayout({
   children,
}: {
   children: React.ReactNode
}) {
   const locale = await getLocale()
   const dir = ['ar', 'fa', 'he', 'ur'].includes(locale) ? 'rtl' : 'ltr'

   return (
      <html lang={locale} dir={dir} suppressHydrationWarning>
         <body className={`${geistSans.variable} ${geistMono.variable}`}>
            {children}
         </body>
      </html>
   )
}
