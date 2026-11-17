import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { BudgetGrid } from '#/components/budget/budget-grid'
import { firstOfMonth, monthFromParam } from '#/lib/month'
import { loadBudgetMonth } from '#/server/budget-month'

export const Route = createFileRoute('/_authed/budgets/$budgetId/budget')({
  validateSearch: (search: Record<string, unknown>): { month?: string } => ({
    month: monthFromParam(search.month) ? String(search.month) : undefined,
  }),
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: ({ params, deps }) =>
    loadBudgetMonth({
      data: {
        budgetId: params.budgetId,
        month: monthFromParam(deps.month) ?? firstOfMonth(),
      },
    }),
  component: BudgetPage,
})

const layout = getRouteApi('/_authed/budgets/$budgetId')

function BudgetPage() {
  const view = Route.useLoaderData()
  const { budget } = layout.useLoaderData()
  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">Budget</h1>
      <BudgetGrid budget={budget} view={view} />
    </div>
  )
}
