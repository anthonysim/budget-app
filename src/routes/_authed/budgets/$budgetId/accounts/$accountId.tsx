import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useTransition } from 'react'
import { PencilIcon } from 'lucide-react'
import { toast } from 'sonner'
import { EditAccountDialog } from '#/components/accounts/edit-account-dialog'
import { Money } from '#/components/accounts/money'
import { NotFoundView } from '#/components/not-found-view'
import { Button } from '#/components/ui/button'
import { ACCOUNT_TYPE_INFO } from '#/lib/accounts'
import { ReconcileDialog } from '#/components/accounts/reconcile-dialog'
import { Register } from '#/components/register/register'
import { closeAccount, reopenAccount } from '#/server/accounts'
import { loadRegister } from '#/server/transactions'

const layout = getRouteApi('/_authed/budgets/$budgetId')

export const Route = createFileRoute(
  '/_authed/budgets/$budgetId/accounts/$accountId',
)({
  loader: ({ params }) =>
    loadRegister({
      data: { budgetId: params.budgetId, accountId: params.accountId },
    }),
  component: AccountPage,
})

function AccountPage() {
  const { accountId } = Route.useParams()
  const register = Route.useLoaderData()
  const { budget, accounts } = layout.useLoaderData()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return <NotFoundView />
  const canEdit = budget.role !== 'viewer'
  const wasClosed = account.closed

  function toggleClosed() {
    startTransition(async () => {
      try {
        const action = wasClosed ? reopenAccount : closeAccount
        await action({ data: { budgetId: budget.id, accountId } })
        await router.invalidate()
        toast.success(wasClosed ? 'Account reopened' : 'Account closed')
      } catch {
        toast.error('Could not update the account')
      }
    })
  }

  const balances = [
    { label: 'Cleared', value: account.clearedBalance },
    { label: 'Uncleared', value: account.unclearedBalance },
    { label: 'Working', value: account.workingBalance },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {account.name}
            {account.closed ? (
              <span className="text-muted-foreground ml-2 text-base font-normal">
                (closed)
              </span>
            ) : null}
          </h1>
          <p className="text-muted-foreground text-sm">
            {ACCOUNT_TYPE_INFO[account.type].label} ·{' '}
            {account.onBudget ? 'On budget' : 'Tracking'}
          </p>
          {account.note ? <p className="mt-2 text-sm">{account.note}</p> : null}
          {account.lastReconciledAt ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Last reconciled{' '}
              {new Date(account.lastReconciledAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            <EditAccountDialog
              budgetId={budget.id}
              accountId={account.id}
              name={account.name}
              note={account.note}
            >
              <Button variant="outline">
                <PencilIcon /> Edit
              </Button>
            </EditAccountDialog>
            {!account.closed ? (
              <ReconcileDialog
                budgetId={budget.id}
                accountId={account.id}
                accountType={account.type}
                clearedBalance={account.clearedBalance}
                currency={budget.currency}
              />
            ) : null}
            <Button variant="outline" disabled={pending} onClick={toggleClosed}>
              {account.closed ? 'Reopen account' : 'Close account'}
            </Button>
          </div>
        ) : null}
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {balances.map((b) => (
          <div key={b.label} className="rounded-lg border p-4">
            <dt className="text-muted-foreground text-sm">{b.label}</dt>
            <dd className="mt-1 text-xl font-semibold">
              <Money value={b.value} currency={budget.currency} />
            </dd>
          </div>
        ))}
      </dl>

      <Register
        budget={budget}
        accounts={accounts}
        data={register}
        accountId={account.id}
      />
    </div>
  )
}
