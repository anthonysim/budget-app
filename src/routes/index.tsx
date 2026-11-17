import { Link, createFileRoute } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { Wordmark } from '#/components/layout/wordmark'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { user } = Route.useRouteContext()
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h1>
        <Wordmark size="lg" />
      </h1>
      <p className="text-muted-foreground text-lg">Budgeting, simplified.</p>
      <p className="text-muted-foreground -mt-2 text-sm">간소 · simplicity</p>
      {user ? (
        <Button asChild>
          <Link to="/budget">Open budget</Link>
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/login" search={{ redirect: '/budget' }}>
              Log in
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/signup" search={{ redirect: '/budget' }}>
              Sign up
            </Link>
          </Button>
        </div>
      )}
    </main>
  )
}
