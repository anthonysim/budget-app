import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { AuthCard } from '#/components/auth/auth-card'
import { PasswordForm } from '#/components/auth/password-form'
import { safeRedirect } from '#/lib/auth-schemas'

export const Route = createFileRoute('/signup')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    if (context.user) throw redirect({ href: safeRedirect(search.redirect) })
  },
  component: SignupPage,
})

function SignupPage() {
  const { redirect: redirectParam } = Route.useSearch()
  const redirectTo = safeRedirect(redirectParam)
  return (
    <AuthCard title="Create account" description="Start budgeting in minutes.">
      <PasswordForm mode="signup" redirectTo={redirectTo} />
      <p className="text-muted-foreground text-center text-sm">
        Have an account?{' '}
        <Link
          to="/login"
          search={{ redirect: redirectParam }}
          className="underline"
        >
          Log in
        </Link>
      </p>
    </AuthCard>
  )
}
