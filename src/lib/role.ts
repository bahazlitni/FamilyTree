// lib/role.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppRole } from '@/types';

export async function getAppRole(supabase: SupabaseClient): Promise<AppRole> {
    const { data, error } = await supabase.rpc('app_role')
    if (error) return null
    const r = (data as string | null) || ''
    if (r === 'admin' || r === 'member') return r
    return null
}
