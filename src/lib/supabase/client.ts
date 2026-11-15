import { createBrowserClient } from '@supabase/ssr'

/** Browser Supabase client (publishable key only). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  )
}
