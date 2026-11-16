import {
  Outlet,
  createFileRoute,
  getRouteApi,
  notFound,
} from '@tanstack/react-router'
import { AppShell } from '#/components/layout/app-shell'
import { loadBudgetShell } from '#/server/budgets'

export const Route = createFileRoute('/_authed/budgets/$budgetId')({
  loader: async ({ params }) => {
    const shell = await loadBudgetShell({ data: { budgetId: params.budgetId } })
    if (!shell) throw notFound()
    return shell
  },
  component: BudgetLayout,
})

const authed = getRouteApi('/_authed')

function BudgetLayout() {
  const { user } = Route.useRouteContext()
  const { budget, accounts, invites } = Route.useLoaderData()
  const budgets = authed.useLoaderData()
  return (
    <AppShell
      email={user.email}
      budget={budget}
      budgets={budgets}
      accounts={accounts}
      invites={invites}
    >
      <Outlet />
    </AppShell>
  )
}
