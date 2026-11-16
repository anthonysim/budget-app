import { Link, useRouter } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'

export function ErrorView({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <div
      role="alert"
      className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground text-sm">
        {import.meta.env.DEV
          ? error instanceof Error
            ? error.message
            : String(error)
          : 'An unexpected error occurred. Try again.'}
      </p>
      <div className="flex gap-2">
        <Button
          onClick={() => {
            reset()
            void router.invalidate()
          }}
        >
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  )
}
