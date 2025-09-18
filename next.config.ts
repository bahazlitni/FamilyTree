import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin({
   // optional: see step 4 if you move request.ts elsewhere
   // experimental: {
   // createMessagesDeclaration: './messages/en.json' // for strict types of message args
   // }
})

const nextConfig: NextConfig = {}

export default withNextIntl(nextConfig)
