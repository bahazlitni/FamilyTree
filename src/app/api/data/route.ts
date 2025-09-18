// app/api/data/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/client'
import { getAppRole } from '@/lib/role'
import { cookies } from 'next/headers'

function parsePagination(searchParams: URLSearchParams) {
   const limit = Number(searchParams.get('limit') ?? '1000')
   const offset = Number(searchParams.get('offset') ?? '0')
   return {
      limit: Math.max(0, Math.min(limit, 5000)),
      offset: Math.max(0, offset),
   }
}

export async function GET(req: Request) {
   const url = new URL(req.url)
   const { limit, offset } = parsePagination(url.searchParams)

   const supabase = await createSupabaseServer(cookies)
   const role = await getAppRole(supabase)

   try {
      if (role !== 'admin') {
         const view_category: 'public' | 'member' =
            role === 'member' ? 'member' : 'public'
         const [
            persons,
            spouseLinks,
            childLinks,
            translation_tokens,
            translation_entries,
         ] = await Promise.all([
            supabase
               .from(`persons_${view_category}_view`)
               .select('*')
               .range(offset, offset + limit - 1),
            supabase
               .from('spouse_links_view')
               .select('*')
               .range(offset, offset + limit - 1),
            supabase
               .from('child_links_view')
               .select('*')
               .range(offset, offset + limit - 1),
            supabase
               .from(`translation_tokens_${view_category}_view`)
               .select('*')
               .range(offset, offset + limit - 1),
            supabase
               .from(`translation_entries_${view_category}_view`)
               .select('*')
               .range(offset, offset + limit - 1),
         ])
         const err =
            persons.error ||
            spouseLinks.error ||
            childLinks.error ||
            translation_tokens.error ||
            translation_entries.error
         if (err) throw err

         return NextResponse.json({
            role,
            data: {
               translation_tokens: translation_tokens.data,
               translation_entries: translation_entries.data,
               persons: persons.data,
               spouse_links: spouseLinks.data,
               child_links: childLinks.data,
            },
         })
      }

      const [
         persons,
         spouseLinks,
         childLinks,
         control,
         translation_tokens,
         translation_entries,
      ] = await Promise.all([
         supabase
            .from('persons')
            .select('*')
            .range(offset, offset + limit - 1),
         supabase
            .from('spouse_links')
            .select('*')
            .range(offset, offset + limit - 1),
         supabase
            .from('child_links')
            .select('*')
            .range(offset, offset + limit - 1),
         supabase
            .from('control')
            .select('*')
            .range(offset, offset + limit - 1),
         supabase
            .from('translation_tokens')
            .select('*')
            .range(offset, offset + limit - 1),
         supabase
            .from('translation_entries')
            .select('*')
            .range(offset, offset + limit - 1),
      ])
      const err =
         persons.error ||
         spouseLinks.error ||
         childLinks.error ||
         control.error ||
         translation_tokens.error ||
         translation_entries.error
      if (err) throw err

      return NextResponse.json({
         role,
         data: {
            persons: persons.data,
            spouse_links: spouseLinks.data,
            child_links: childLinks.data,
            control: control.data,
            translation_tokens: translation_tokens.data,
            translation_entries: translation_entries.data,
         },
      })
   } catch (e: any) {
      return NextResponse.json(
         { error: e?.message ?? 'Unknown error' },
         { status: 500 }
      )
   }
}
