// app/layout.tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
// app/layout.tsx
import '@/styles/_layers.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/components/control.css'
import '@/styles/variants/control.hyperlink.css'
import '@/styles/variants/control.readonly.css'
import '@/styles/variants/control.dropdown.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
   variable: '--font-geist-mono',
   subsets: ['latin'],
})

export const metadata: Metadata = {
   title: 'Zlitni Tree',
   description: "See whether there is another you in Zlitni's family!",
}

export default function RootLayout({
   children,
}: {
   children: React.ReactNode
}) {
   return (
      <html lang="en">
         <body className={`${geistSans.variable} ${geistMono.variable}`}>
            {children}
         </body>
      </html>
   )
}
