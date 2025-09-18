// src/app/api/auth/send-otp/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server' // service-role client
import { renderOtpEmail } from '@/lib/mailer/otp/renderer' // your renderer
import { sendMail } from '@/lib/mailer/otp/mail' // your nodemailer sender

const OTP_TTL_SECONDS = 5 * 60

export async function POST(req: Request) {
   try {
      const { email, locale = 'en', theme = 'dark' } = await req.json()
      if (!email)
         return NextResponse.json({ error: 'Missing email' }, { status: 400 })

      const headersRes = await headers()
      const ip =
         headersRes.get('x-forwarded-for') ?? headersRes.get('x-real-ip') ?? ''

      const admin = createClient() // must be service role

      const { data, error } = await admin.rpc('auth_create_email_otp', {
         p_email: String(email).trim().toLowerCase(),
         p_locale: locale,
         p_theme: theme,
         p_ttl_seconds: OTP_TTL_SECONDS,
         p_ip: ip,
      })

      if (error) {
         console.error('auth_create_email_otp RPC error:', error)
         return NextResponse.json(
            { error: 'Failed to create OTP' },
            { status: 500 }
         )
      }

      const row = Array.isArray(data) ? data[0] : data
      const code: string = row.code
      const expiresAt = Number(row.expires_at)

      const { subject, html, text } = renderOtpEmail({
         code,
         locale,
         theme,
         expiresAt,
      })
      await sendMail({
         to: email,
         subject,
         html,
         text,
         from: process.env.SMTP_FROM!,
      })

      return NextResponse.json({ ok: true })
   } catch (e) {
      console.error('/api/auth/send-otp', e)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
   }
}
