import {
  Outlet,
  createFileRoute,
  getRouteApi,
  notFound,
} from '@tanstack/react-router'
import { AppShell } from '#/components/layout/app-shell'
import { getBudget } from '#/server/budgets'

export const Route = createFileRoute('/_authed/budgets/$budgetId')({
  loader: async ({ params }) => {
    const budget = await getBudget({ data: { budgetId: params.budgetId } })
    if (!budget) throw notFound()
    return budget
  },
  component: BudgetLayout,
})

const authed = getRouteApi('/_authed')

function BudgetLayout() {
  const { user } = Route.useRouteContext()
  const budget = Route.useLoaderData()
  const budgets = authed.useLoaderData()
  return (
    <AppShell email={user.email} budget={budget} budgets={budgets}>
      <Outlet />
    </AppShell>
  )
}
