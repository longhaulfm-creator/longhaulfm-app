// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnon) {
  throw new Error('Missing Supabase env vars — check your .env file')
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Tauri — no URL-based OAuth redirects
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

export type SupabaseClient = typeof supabase
