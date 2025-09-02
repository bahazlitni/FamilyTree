// app/api/data/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase';
import { getAppRole } from '@/lib/role';
import { cookies } from 'next/headers'

function parsePagination(searchParams: URLSearchParams) {
  const limit = Number(searchParams.get('limit') ?? '1000');
  const offset = Number(searchParams.get('offset') ?? '0');
  return { limit: Math.max(0, Math.min(limit, 5000)), offset: Math.max(0, offset) };
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const { limit, offset } = parsePagination(url.searchParams);

    const supabase = await createSupabaseServer(cookies)
    const role = await getAppRole(supabase)

    try {
        if (role === null) {
        const [persons, spouseLinks, childLinks] = await Promise.all([
            supabase.from('persons_public_view').select('*').range(offset, offset + limit - 1),
            supabase.from('spouse_links_view').select('*').range(offset, offset + limit - 1),
            supabase.from('child_links_view').select('*').range(offset, offset + limit - 1),
        ]);
        const err = persons.error || spouseLinks.error || childLinks.error;
        if (err) throw err;

        return NextResponse.json({
            role: 'anon',
            data: {
                persons: persons.data,
                spouse_links: spouseLinks.data,
                child_links: childLinks.data,
            },
        });
        }

        if (role === 'member') {
        const [persons, spouseLinks, childLinks] = await Promise.all([
            supabase.from('persons_member_view').select('*').range(offset, offset + limit - 1),
            supabase.from('spouse_links_view').select('*').range(offset, offset + limit - 1),
            supabase.from('child_links_view').select('*').range(offset, offset + limit - 1),
        ]);
        const err = persons.error || spouseLinks.error || childLinks.error;
        if (err) throw err;

        return NextResponse.json({
            role,
            data: {
                persons: persons.data,
                spouse_links: spouseLinks.data,
                child_links: childLinks.data,
            },
        });
        }

        const [persons, spouseLinks, childLinks, control] = await Promise.all([
            supabase.from('persons').select('*').range(offset, offset + limit - 1),
            supabase.from('spouse_links').select('*').range(offset, offset + limit - 1),
            supabase.from('child_links').select('*').range(offset, offset + limit - 1),
            supabase.from('control').select('*').range(offset, offset + limit - 1),
        ]);
        const err = persons.error || spouseLinks.error || childLinks.error || control.error;
        if (err) throw err;

        return NextResponse.json({
        role,
        data: {
            persons: persons.data,
            spouse_links: spouseLinks.data,
            child_links: childLinks.data,
            control: control.data,
        },
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
    }
}
