// app/api/data/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/client'
import { getAppRole } from '@/lib/role'
import { cookies } from 'next/headers'
import type {
   ChildLink,
   PersonRow,
   SpouseLink,
   TranslationEntryRow,
   TranslationTokenRow,
} from '@/types'

function parsePagination(searchParams: URLSearchParams) {
   const hasPagination =
      searchParams.has('limit') || searchParams.has('offset')
   if (!hasPagination) return null

   const limit = Number(searchParams.get('limit') ?? '1000')
   const offset = Number(searchParams.get('offset') ?? '0')
   return {
      limit: Math.max(0, Math.min(limit, 5000)),
      offset: Math.max(0, offset),
   }
}

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServer>>
type Pagination = ReturnType<typeof parsePagination>

async function selectRows<T>(
   supabase: SupabaseServerClient,
   table: string,
   pagination: Pagination
): Promise<T[]> {
   if (pagination) {
      const { limit, offset } = pagination
      const { data, error } = await supabase
         .from(table)
         .select('*')
         .range(offset, offset + limit - 1)
      if (error) throw error
      return (data ?? []) as T[]
   }

   const pageSize = 1000
   const rows: T[] = []
   let offset = 0

   while (true) {
      const { data, error } = await supabase
         .from(table)
         .select('*')
         .range(offset, offset + pageSize - 1)

      if (error) throw error

      const batch = (data ?? []) as T[]
      rows.push(...batch)

      if (batch.length < pageSize) break
      offset += pageSize
   }

   return rows
}

export async function GET(req: Request) {
   const url = new URL(req.url)
   const pagination = parsePagination(url.searchParams)

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
            selectRows<PersonRow>(
               supabase,
               `persons_${view_category}_view`,
               pagination
            ),
            selectRows<SpouseLink>(supabase, 'spouse_links_view', pagination),
            selectRows<ChildLink>(supabase, 'child_links_view', pagination),
            selectRows<TranslationTokenRow>(
               supabase,
               `translation_tokens_${view_category}_view`,
               pagination
            ),
            selectRows<TranslationEntryRow>(
               supabase,
               `translation_entries_${view_category}_view`,
               pagination
            ),
         ])

         return NextResponse.json({
            role,
            data: {
               translation_tokens,
               translation_entries,
               persons,
               spouse_links: spouseLinks,
               child_links: childLinks,
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
         selectRows<PersonRow>(supabase, 'persons', pagination),
         selectRows<SpouseLink>(supabase, 'spouse_links', pagination),
         selectRows<ChildLink>(supabase, 'child_links', pagination),
         selectRows<Record<string, unknown>>(supabase, 'control', pagination),
         selectRows<TranslationTokenRow>(
            supabase,
            'translation_tokens',
            pagination
         ),
         selectRows<TranslationEntryRow>(
            supabase,
            'translation_entries',
            pagination
         ),
      ])

      return NextResponse.json({
         role,
         data: {
            persons,
            spouse_links: spouseLinks,
            child_links: childLinks,
            control,
            translation_tokens,
            translation_entries,
         },
      })
   } catch (e: any) {
      return NextResponse.json(
         { error: e?.message ?? 'Unknown error' },
         { status: 500 }
      )
   }
}
