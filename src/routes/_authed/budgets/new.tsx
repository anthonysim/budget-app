import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { AuthCard } from '#/components/auth/auth-card'
import { InvitesBanner } from '#/components/sharing/invites-banner'
import { listMyInvites } from '#/server/members'
import { CreateBudgetForm } from '#/components/budgets/create-budget-form'

export const Route = createFileRoute('/_authed/budgets/new')({
  loader: () => listMyInvites(),
  component: NewBudgetPage,
})

const authed = getRouteApi('/_authed')

function NewBudgetPage() {
  const budgets = authed.useLoaderData()
  const invites = Route.useLoaderData()
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
      <InvitesBanner invites={invites} />
      <CreateBudgetForm canCancel={!isFirst} />
    </AuthCard>
  )
}
