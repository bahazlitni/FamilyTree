// src/app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createSupabaseServer } from '@/lib/supabase/client'

const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 5)

function isSafePath(p: unknown): p is string {
   return typeof p === 'string' && p.startsWith('/')
}

export async function POST(req: NextRequest) {
   try {
      const { email, code, callback } = await req.json()

      if (!email || !code) {
         return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      }

      const normalizedEmail = String(email).trim().toLowerCase()
      const localeFromPath =
         (typeof callback === 'string' && callback.split('/')[1]) || 'en'

      // ---------- 1) Verify OTP via your SQL RPC (service role) ----------
      const admin = createSupabaseAdmin(
         process.env.NEXT_PUBLIC_SUPABASE_URL!,
         process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
         { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const { data, error: rpcErr } = await admin.rpc(
         'auth_consume_email_otp',
         {
            p_code: String(code),
            p_email: normalizedEmail,
            p_max_attempts: OTP_MAX_ATTEMPTS,
         }
      )

      if (rpcErr) {
         console.error('auth_consume_email_otp RPC error:', rpcErr)
         return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
         )
      }

      const resRow = Array.isArray(data) ? data[0] : data
      const status: string | undefined = resRow?.status
      const locale: string = resRow?.locale || localeFromPath || 'en'

      const safeNext = isSafePath(callback)
         ? String(callback)
         : `/${locale}/canvas`

      // Map statuses -> HTTP
      if (status === 'no_active')
         return NextResponse.json({ error: 'No active code' }, { status: 400 })
      if (status === 'expired')
         return NextResponse.json({ error: 'Code expired' }, { status: 410 })
      if (status === 'locked')
         return NextResponse.json(
            { error: 'Too many attempts' },
            { status: 429 }
         )
      if (status === 'invalid')
         return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
      if (status !== 'ok')
         return NextResponse.json({ error: 'Unknown status' }, { status: 400 })

      // ---------- 2) Ask GoTrue for a hashed token (admin API) ----------
      const { data: link, error: linkErr } =
         await admin.auth.admin.generateLink({
            type: 'magiclink',
            email: normalizedEmail,
         })
      if (linkErr || !link?.properties?.hashed_token) {
         console.error('generateLink error:', linkErr)
         return NextResponse.json(
            { error: 'Failed to generate link' },
            { status: 500 }
         )
      }
      const token_hash = link.properties.hashed_token as string

      // ---------- 3) ENSURE USER ROLE before session issuance ----------
      try {
         // Try to read role (service role bypasses RLS)
         const { data: roleData, error: getRoleErr } = await admin.rpc(
            'get_user_role',
            {
               p_email: normalizedEmail,
            }
         )
         const currentRole: string | null =
            (Array.isArray(roleData) ? roleData?.[0] : roleData) ?? null

         if (getRoleErr) {
            console.error('get_user_role error (non-fatal):', getRoleErr)
         }

         const { error: setRoleErr } = await admin.rpc('set_user_role', {
            p_email: normalizedEmail,
            p_role: currentRole ?? 'anon',
         })
         if (setRoleErr) {
            // Don’t block login; just log
            console.error('set_user_role error (non-fatal):', setRoleErr)
         }

         // If a role already exists, we do nothing; your trigger/func keeps app_metadata in sync.
         // Doing nothing avoids unnecessary writes.
      } catch (roleAssignErr) {
         console.error(
            'Role assignment block failed (non-fatal):',
            roleAssignErr
         )
      }

      // ---------- 4) Prepare the JSON response FIRST (we'll attach cookies to it) ----------
      const jsonRes = NextResponse.json({
         redirect: new URL(safeNext, req.nextUrl.origin).toString(),
      })

      // ---------- 5) Create SSR client that WRITES cookies onto jsonRes ----------
      const supabase = await createSupabaseServer(cookies)

      // ---------- 6) Verify the hashed token server-side → sets auth cookies on jsonRes ----------
      const { error: verifyErr } = await supabase.auth.verifyOtp({
         type: 'magiclink',
         token_hash,
      })
      if (verifyErr) {
         // On failure, do NOT return jsonRes (it has partial cookie state). Return a fresh error JSON.
         return NextResponse.json({ error: 'confirm' }, { status: 401 })
      }

      // Cookies are now set on the JSON response; client will navigate after receiving this.
      return jsonRes
   } catch (e) {
      console.error('/api/auth/verify-otp', e)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
   }
}
