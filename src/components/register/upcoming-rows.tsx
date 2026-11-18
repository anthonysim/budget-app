import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Money } from '#/components/accounts/money'
import { UpcomingEditRow } from '#/components/register/upcoming-edit-row'
import { cn } from '#/lib/utils'
import { formatDateString } from '#/lib/date'
import { FREQUENCY_LABELS } from '#/lib/schedule'
import { splitAmount } from '#/lib/transactions'
import type { CategoryGroupRow } from '#/server/categories-query'
import type { ScheduledListRow } from '#/server/scheduled-query'
import type { PayeeRow } from '#/server/transactions-query'

/**
 * Greyed rows for the next occurrence of each scheduled transaction; double-clicking a row (or
 * pressing Enter on it) edits it inline. In a single-account register, the other side of a scheduled transfer is shown
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
        if (editingId === s.id && !reversed) {
          return (
            <UpcomingEditRow
              key={s.id}
              budgetId={budget.id}
              scheduled={s}
              accounts={accounts}
              payees={payees}
              categoryGroups={categoryGroups}
              inflowCategoryId={inflowCategoryId}
              showAccountColumn={!singleAccount}
              showBalanceColumn={singleAccount}
              onDone={() => setEditingId(null)}
            />
          )
        }
        return (
          <tr
            key={s.id}
            data-testid="upcoming-row"
            title={reversed ? undefined : 'Double-click to edit'}
            tabIndex={reversed ? undefined : 0}
            onDoubleClick={reversed ? undefined : () => setEditingId(s.id)}
            onKeyDown={
              reversed
                ? undefined
                : (e) => {
                    if (e.key === 'Enter' && e.target === e.currentTarget) {
                      setEditingId(s.id)
                    }
                  }
            }
            className={cn(
              'bg-muted/10 text-muted-foreground border-t italic',
              !reversed &&
                'hover:bg-muted/30 focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-inset',
            )}
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
              <Link
                to="/budgets/$budgetId/scheduled"
                params={{ budgetId: budget.id }}
                className="text-xs underline"
              >
                Manage
              </Link>
            </td>
          </tr>
        )
      })}
    </>
  )
}
