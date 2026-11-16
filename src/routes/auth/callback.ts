import { createFileRoute } from '@tanstack/react-router'
import { createSupabaseServerClient } from '#/lib/supabase/server'
import { safeRedirect } from '#/lib/auth-schemas'

/** Handles the email link (magic link / signup confirm): exchanges ?code for a session. */
export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const next = safeRedirect(url.searchParams.get('next'))

        if (code) {
          const supabase = createSupabaseServerClient()
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error) {
            return Response.redirect(new URL(next, url.origin), 303)
          }
        }
        return Response.redirect(
          new URL('/login?error=callback', url.origin),
          303,
        )
      },
    },
  },
})
