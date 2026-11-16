import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/accounts')({
  component: Page,
})

function Page() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">All Accounts</h1>
      <p className="text-muted-foreground mt-2 text-sm">Coming soon.</p>
    </main>
  )
}
