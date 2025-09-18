// /lib/mailer/otp/mail.ts
import nodemailer, { Transporter } from 'nodemailer'
import type { SendMailOptions } from 'nodemailer'

let _tx: Transporter | null = null

function getTransport(): Transporter {
   if (_tx) return _tx
   const smtpUrl = process.env.SMTP_URL
   const host = process.env.SMTP_HOST
   const port = process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT)
      : undefined
   const secure = process.env.SMTP_SECURE?.toLowerCase() === 'true' || false
   const user = process.env.SMTP_USER
   const pass = process.env.SMTP_PASS

   if (!smtpUrl && !(host && port && user && pass)) {
      throw new Error(
         'SMTP is not configured. Provide SMTP_URL or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS'
      )
   }

   _tx = smtpUrl
      ? nodemailer.createTransport(smtpUrl)
      : nodemailer.createTransport({
           host,
           port,
           secure,
           auth: { user, pass },
        })

   return _tx
}

export async function sendMail(input: SendMailOptions) {
   const transporter = getTransport()
   const info = await transporter.sendMail({
      ...input,
      headers: {
         'X-Mailer': 'FamilyTree/OTP',
         ...(input.headers || {}),
      },
      messageId:
         input.messageId ||
         `<ft-${Date.now()}-${Math.random().toString(36).slice(2)}@${
            process.env.MAIL_DOMAIN || 'localhost'
         }>`,
   })

   // For local/dev visibility
   if (process.env.NODE_ENV !== 'production') {
      try {
         // @ts-ignore nodemailer provides preview for ethereal/email-stub transports
         // eslint-disable-next-line @typescript-eslint/no-var-requires
         const getTestMessageUrl = require('nodemailer').getTestMessageUrl
         const url = getTestMessageUrl?.(info)
         if (url) console.log('Preview URL:', url)
      } catch {}
   }

   return info
}
