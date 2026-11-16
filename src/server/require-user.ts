import { createSupabaseServerClient } from '#/lib/supabase/server'

/**
 * Use at the top of every server function that touches user data.
 * Throws if the request has no valid session.
 */
export async function requireUser() {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error('Unauthorized')
  return data.user
}
