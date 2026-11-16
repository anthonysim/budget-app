import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/budget')({
  component: BudgetPage,
})

function BudgetPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Budget</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Your budget will show up here.
      </p>
    </main>
  )
}
