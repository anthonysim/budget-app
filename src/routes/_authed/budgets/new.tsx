import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { AuthCard } from '#/components/auth/auth-card'
import { CreateBudgetForm } from '#/components/budgets/create-budget-form'

export const Route = createFileRoute('/_authed/budgets/new')({
  component: NewBudgetPage,
})

const authed = getRouteApi('/_authed')

function NewBudgetPage() {
  const budgets = authed.useLoaderData()
  const isFirst = budgets.length === 0
  return (
    <AuthCard
      title={isFirst ? 'Create your first budget' : 'New budget'}
      description={
        isFirst
          ? 'Name your budget to get started. You can add accounts and categories next.'
          : 'Create another budget.'
      }
    >
      <CreateBudgetForm canCancel={!isFirst} />
    </AuthCard>
  )
}
