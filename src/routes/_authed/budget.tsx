import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { signOut } from '#/server/auth'

export const Route = createFileRoute('/_authed/budget')({
  component: BudgetPage,
})

function BudgetPage() {
  const { user } = Route.useRouteContext()
  const router = useRouter()

  async function onSignOut() {
    await signOut()
    await router.invalidate()
    await router.navigate({ to: '/login', search: { redirect: '/budget' } })
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">Budget</h1>
      <p className="text-muted-foreground">Signed in as {user.email}</p>
      <Button variant="outline" onClick={onSignOut}>
        Sign out
      </Button>
    </main>
  )
}
