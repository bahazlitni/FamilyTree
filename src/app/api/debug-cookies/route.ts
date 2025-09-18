import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

function decodeSupabaseCookie(val: string) {
   if (val.startsWith('base64-')) {
      const b64 = val.slice('base64-'.length)
      const jsonStr = Buffer.from(b64, 'base64').toString('utf8')
      return JSON.parse(jsonStr)
   }
   try {
      return JSON.parse(val) // plain JSON case
   } catch {
      return { access_token: val } // raw JWT fallback
   }
}

export async function GET() {
   const all = (await cookies()).getAll()
   const authCookie = all.find(
      (ck) => ck.name.startsWith('sb-') && ck.name.endsWith('-auth-token'),
   )

   if (!authCookie) {
      return NextResponse.json(
         { error: 'No supabase auth cookie' },
         { status: 401 },
      )
   }

   const session = decodeSupabaseCookie(authCookie.value)
   const accessToken = session.access_token
   // const refreshToken = session.refresh_token;

   const decoded = accessToken
      ? jwt.decode(accessToken, { complete: true })
      : null

   return NextResponse.json({
      cookieName: authCookie.name,

      session,
      decoded,
      payload: decoded && typeof decoded !== 'string' ? decoded.payload : null,
   })
}
