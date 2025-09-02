// app/api/admin/set-role/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';

// Body: { email: string, role: 'admin' | 'member' | null }
export async function POST(req: NextRequest) {
    const { email, role } = await req.json()

    if (!email || !['admin','member',null].includes(role))
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    
    // Find user
    const { data: { users }, error: listErr } = await supabaseService.auth.admin.listUsers({
        page: 1, perPage: 1, email
    } as any)

    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })
    const user = users?.[0]
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const app_meta = { ...(user.user_metadata || {}), ...(user.app_metadata || {}) }
    if (role === null) delete (app_meta as any).app_role
    else (app_meta as any).app_role = role

    const { error: updErr } = await supabaseService.auth.admin.updateUserById(user.id, {
        app_metadata: app_meta,
    });
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, user_id: user.id, app_role: role })
}
