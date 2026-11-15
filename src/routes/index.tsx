import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold">Budget</h1>
      <p className="text-muted-foreground text-lg">
        Zero-based budgeting, coming soon.
      </p>
      <Button>Get started</Button>
    </main>
  )
}
