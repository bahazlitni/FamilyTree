// app/api/auth/reset/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { cookies } from 'next/headers'
export async function POST() {
    const supabase = await createSupabaseServer(cookies)
    await supabase.auth.signOut()
    return NextResponse.json({ ok: true })
}
