// /lib/mailer/otp/renderer.ts
import { Theme, Locale } from '@/types'

export type OtpTemplateInput = {
   code: string
   locale?: Locale
   theme?: Theme
   appName?: string
   supportEmail?: string
   actionUrl?: string
   expiresAt?: number
}

type RenderedEmail = { subject: string; html: string; text: string }

/** i18n strings */
const I18N = {
   en: {
      subject: (app: string) => `Your verification code for ${app}`,
      preheader: (app: string) => `Use this code to sign in to ${app}`,
      heading: 'Verify your sign-in',
      subheading: (app: string) =>
         `Use this code to complete your sign-in to ${app}.`,
      hint: (min: number) => `This code expires in ${min} minutes.`,
      codeLabel: 'Your code',
      openApp: 'Open the app',
      ignore:
         'If you didn’t request this code, you can safely ignore this email.',
      sentTo: (email: string) => `Sent to ${email}`,
   },
   fr: {
      subject: (app: string) => `Votre code de vérification pour ${app}`,
      preheader: (app: string) =>
         `Utilisez ce code pour vous connecter à ${app}`,
      heading: 'Vérifiez votre connexion',
      subheading: (app: string) =>
         `Utilisez ce code pour terminer votre connexion à ${app}.`,
      hint: (min: number) => `Ce code expire dans ${min} minutes.`,
      codeLabel: 'Votre code',
      openApp: "Ouvrir l'application",
      ignore:
         "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.",
      sentTo: (email: string) => `Envoyé à ${email}`,
   },
   ar: {
      subject: (app: string) => `رمز التحقق الخاص بـ ${app}`,
      preheader: (app: string) => `استخدم هذا الرمز لتسجيل الدخول إلى ${app}`,
      heading: 'تأكيد تسجيل الدخول',
      subheading: (app: string) =>
         `استخدم هذا الرمز لإكمال تسجيل الدخول إلى ${app}.`,
      hint: (min: number) => `تنتهي صلاحية هذا الرمز خلال ${min} دقيقة.`,
      codeLabel: 'رمزك',
      openApp: 'افتح التطبيق',
      ignore: 'إذا لم تطلب هذا الرمز، فتجاهل هذه الرسالة بأمان.',
      sentTo: (email: string) => `أرسلت إلى ${email}`,
   },
} as const

/** choose dir from locale */
const dirOf = (loc: Locale) => (loc === 'ar' ? 'rtl' : 'ltr')

/** palette per theme; keep inline + simple (bulletproof for email clients) */
const PALETTE = {
   dark: {
      bg: '#0f1115',
      panel: '#151822',
      border: '#2a3040',
      text: '#e6e8ee',
      textDim: '#b6bcc9',
      textMuted: '#8d95a8',
      element: '#1a1f2b',
      primary: '#7aa2ff',
      primaryText: '#0a0d14',
      radius: '10px',
      shadow: '0 6px 24px rgba(0,0,0,.35)',
   },
   light: {
      bg: '#eef1f5',
      panel: '#ffffff',
      border: '#dfe3ee',
      text: '#1a1c22',
      textDim: '#2a2e36',
      textMuted: '#535b68',
      element: '#ffffff',
      primary: '#2f5eff',
      primaryText: '#ffffff',
      radius: '10px',
      shadow: '0 6px 20px rgba(0,0,0,.08)',
   },
}

/** decide colors (auto = dark default but can be toggled in clients with dark UI) */
function pickPalette(theme?: Theme) {
   if (theme === 'light') return PALETTE.light
   // default to dark for consistency with your app
   return PALETTE.dark
}

function esc(s: string | undefined) {
   return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
}

export function renderOtpEmail(
   input: OtpTemplateInput & { to?: string }
): RenderedEmail {
   const {
      code,
      locale = 'en',
      theme = 'dark',
      appName = 'Family Tree',
      supportEmail,
      actionUrl,
      expiresAt,
      to,
   } = input
   const t = I18N[locale]
   const dir = dirOf(locale)
   const C = pickPalette(theme)

   const subject = t.subject(appName)
   const preheader = t.preheader(appName)

   const expiresInMin =
      expiresAt === undefined
         ? undefined
         : (expiresAt - new Date().getTime()) / 60

   // Plain text (fallback)
   const textLines = [
      t.heading,
      t.subheading(appName),
      `${t.codeLabel}: ${code}`,
      expiresInMin === undefined ? undefined : t.hint(expiresInMin),
      actionUrl ? `Open: ${actionUrl}` : '',
      t.ignore,
      supportEmail ? `Support: ${supportEmail}` : '',
   ].filter(Boolean)
   const text = textLines.join('\n\n')

   // Minimal CSS, table-based layout, no CSS variables to avoid finicky clients
   const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(subject)}</title>
  <style>
    .preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all}
    html,body{margin:0;padding:0;background:${C.bg}}
    table{border-collapse:collapse;border-spacing:0}
    a{color:${C.primary};text-decoration:none}
    .container{width:100%}
    .wrapper{max-width:560px;margin:0 auto;padding:24px}
    .card{background:${C.panel};border:1px solid ${C.border};border-radius:${
      C.radius
   };box-shadow:${C.shadow}}
    .header{padding:24px 24px 8px 24px;border-bottom:1px solid ${C.border}}
    .brand{font:600 18px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:${
       C.text
    };letter-spacing:.2px}
    .content{padding:16px 24px 8px 24px;color:${
       C.text
    };font:400 14px/1.6 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
    .headline{margin:0 0 8px 0;font:700 22px/1.3 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:${
       C.text
    }}
    .muted{color:${C.textMuted}}
    .otp-wrap{padding:12px 24px 24px 24px}
    .otp-box{margin:8px 0 12px 0;background:${C.element};border:1px solid ${
      C.border
   };border-radius:${C.radius};padding:16px 20px;text-align:center}
    .otp-label{font:600 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:${
       C.textDim
    };letter-spacing:.6px;text-transform:uppercase}
    .otp-code{margin-top:6px;font:800 28px/1.1 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;color:${
       C.text
    };letter-spacing:4px;text-transform:uppercase}
    .hint{color:${C.textDim};font-size:12px;margin-top:10px}
    .cta-wrap{padding:8px 24px 24px 24px}
    .btn{display:inline-block;background:${C.primary};color:${
      C.primaryText
   };font:700 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;border-radius:999px;padding:12px 20px;border:1px solid ${
      C.primary
   }}
    .btn:hover{filter:brightness(1.05)}
    .divider{border-top:1px solid ${C.border};margin:8px 24px}
    .footer{color:${
       C.textMuted
    };font:400 12px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;padding:12px 24px 24px 24px}
    ${
       dir === 'rtl'
          ? `
      .brand,.content,.otp-wrap,.cta-wrap,.footer { text-align: right; }
    `
          : `
      .brand,.content,.otp-wrap,.cta-wrap,.footer { text-align: left; }
    `
    }
  </style>
  <!--[if mso]>
  <style>.otp-code{letter-spacing:2px !important;font-family:Consolas,"Courier New",monospace !important;}</style>
  <![endif]-->
</head>
<body>
  <span class="preheader">${esc(preheader)}</span>

  <table role="presentation" class="container" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="wrapper">
          <table role="presentation" width="100%" class="card">
            <tr>
              <td class="header"><div class="brand">${esc(appName)}</div></td>
            </tr>
            <tr>
              <td class="content">
                <h1 class="headline">${esc(t.heading)}</h1>
                <p class="muted">${esc(t.subheading(appName))}</p>
              </td>
            </tr>
            <tr>
              <td class="otp-wrap">
                <div class="otp-box">
                  <div class="otp-label">${esc(t.codeLabel)}</div>
                  <div class="otp-code">${esc(code)}</div>
                  ${
                     expiresInMin === undefined
                        ? ''
                        : `<div class="hint">${esc(t.hint(expiresInMin))}</div>`
                  }
                </div>
              </td>
            </tr>

            ${
               actionUrl
                  ? `<tr>
                    <td class="cta-wrap" align="center">
                      <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr><td class="btn"><a href="${esc(
                           actionUrl
                        )}" target="_blank" rel="noopener">${esc(
                       t.openApp
                    )}</a></td></tr>
                      </table>
                    </td>
                  </tr>`
                  : ''
            }

            <tr><td class="divider"></td></tr>
            <tr>
              <td class="footer">
                <p>${esc(t.ignore)}</p>
                ${to ? `<p class="muted">${esc(t.sentTo(to))}</p>` : ''}
                ${
                   supportEmail
                      ? `<p class="muted">Support: ${esc(supportEmail)}</p>`
                      : ''
                }
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`

   return { subject, html, text }
}
