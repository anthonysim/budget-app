import { createFileRoute, redirect } from '@tanstack/react-router'
import { listBudgets } from '#/server/budgets'

/** /budget is a stable entry point: send the user to their first budget, or to create one. */
export const Route = createFileRoute('/_authed/budget')({
  beforeLoad: async () => {
    const [first] = await listBudgets()
    if (!first) throw redirect({ to: '/budgets/new' })
    throw redirect({
      to: '/budgets/$budgetId/budget',
      params: { budgetId: first.id },
    })
  },
})
