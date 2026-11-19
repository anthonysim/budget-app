import { Fragment, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PencilIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Money } from '#/components/accounts/money'
import { ScheduledDialog } from '#/components/scheduled/scheduled-dialog'
import { formatDateString } from '#/lib/date'
import { FREQUENCY_LABELS } from '#/lib/schedule'
import { splitAmount } from '#/lib/transactions'
import type { CategoryGroupRow } from '#/server/categories-query'
import type { ScheduledListRow } from '#/server/scheduled-query'
import type { PayeeRow } from '#/server/transactions-query'

/**
 * Greyed rows for the next occurrence of each scheduled transaction; the pencil opens it in an edit dialog. In a single-account register, the other side of a scheduled transfer is shown
 * reversed and is read-only (edit it from its own account or the Scheduled page).
 */
export function UpcomingRows({
  scheduled,
  accountId,
  budget,
  accounts,
  payees,
  categoryGroups,
  inflowCategoryId,
}: {
  scheduled: Array<ScheduledListRow>
  accountId?: string
  accounts: Array<{
    id: string
    name: string
    onBudget: boolean
    closed: boolean
  }>
  payees: Array<PayeeRow>
  categoryGroups: Array<CategoryGroupRow>
  inflowCategoryId: string | null
  budget: { id: string; currency: string; dateFormat: string }
}) {
  const singleAccount = accountId !== undefined
  const [editingId, setEditingId] = useState<string | null>(null)
  return (
    <>
      {scheduled.map((s) => {
        const reversed = singleAccount && s.accountId !== accountId
        const amount = reversed ? -s.amount : s.amount
        const { outflow, inflow } = splitAmount(amount)
        const payee = reversed
          ? `Transfer: ${s.accountName}`
          : s.transferAccountName
            ? `Transfer: ${s.transferAccountName}`
            : (s.payeeName ?? '—')
        return (
          <Fragment key={s.id}>
            <tr
              data-testid="upcoming-row"
              className="bg-muted/10 text-muted-foreground border-t italic"
            >
              <td />
              {!singleAccount ? (
                <td className="px-2 py-1.5">{s.accountName}</td>
              ) : null}
              <td className="px-2 py-1.5 tabular-nums">
                {formatDateString(s.nextDate, budget.dateFormat)}
              </td>
              <td className="px-2 py-1.5">{payee}</td>
              <td className="px-2 py-1.5">
                {reversed ? '' : (s.categoryName ?? '')}
              </td>
              <td className="px-2 py-1.5">
                {FREQUENCY_LABELS[s.frequency]}
                {s.memo ? ` · ${s.memo}` : ''}
              </td>
              <td className="px-2 py-1.5 text-right">
                {outflow ? (
                  <Money value={-outflow} currency={budget.currency} />
                ) : null}
              </td>
              <td className="px-2 py-1.5 text-right">
                {inflow ? (
                  <Money value={inflow} currency={budget.currency} />
                ) : null}
              </td>
              <td className="px-2 py-1.5 text-center text-xs">Sched.</td>
              {singleAccount ? <td /> : null}
              <td className="px-2 py-1.5">
                <div className="flex justify-end">
                  {reversed ? (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Edit on the Scheduled page"
                      title="Edit on the Scheduled page"
                    >
                      <Link
                        to="/budgets/$budgetId/scheduled"
                        params={{ budgetId: budget.id }}
                      >
                        <PencilIcon />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Edit scheduled transaction"
                      onClick={() => setEditingId(s.id)}
                    >
                      <PencilIcon />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
            {!reversed && editingId === s.id ? (
              <ScheduledDialog
                open
                onOpenChange={(open) => {
                  if (!open) setEditingId(null)
                }}
                budgetId={budget.id}
                scheduled={s}
                accounts={accounts}
                payees={payees}
                categoryGroups={categoryGroups}
                inflowCategoryId={inflowCategoryId}
              />
            ) : null}
          </Fragment>
        )
      })}
    </>
  )
}
