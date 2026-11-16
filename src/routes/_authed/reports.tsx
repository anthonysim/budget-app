import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/reports')({
  component: Page,
})

function Page() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="text-muted-foreground mt-2 text-sm">Coming soon.</p>
    </main>
  )
}
