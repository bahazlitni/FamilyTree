// lib/supabaseService.ts
import { createClient as cc } from '@supabase/supabase-js'

export function createClient() {
   return cc(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
   )
}
