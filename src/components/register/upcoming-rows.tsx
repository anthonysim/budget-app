import { Link } from '@tanstack/react-router'
import { Money } from '#/components/accounts/money'
import { formatDateString } from '#/lib/date'
import { FREQUENCY_LABELS } from '#/lib/schedule'
import { splitAmount } from '#/lib/transactions'
import type { ScheduledListRow } from '#/server/scheduled-query'

/**
 * Greyed, read-only rows for the next occurrence of each scheduled transaction.
 * In a single-account register, the other side of a scheduled transfer is shown reversed.
 */
export function UpcomingRows({
  scheduled,
  accountId,
  budget,
}: {
  scheduled: Array<ScheduledListRow>
  accountId?: string
  budget: { id: string; currency: string; dateFormat: string }
}) {
  const singleAccount = accountId !== undefined
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
          <tr
            key={s.id}
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
