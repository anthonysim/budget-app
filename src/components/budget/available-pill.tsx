import { Money } from '#/components/accounts/money'
import { cn } from '#/lib/utils'
import type { BudgetCategoryRow } from '#/lib/budget-month'

/** Green = money available, grey = empty, red = cash overspent, yellow = credit overspent. */
export function AvailablePill({
  category,
  currency,
}: {
  category: Pick<BudgetCategoryRow, 'available' | 'overspent'>
  currency: string
}) {
  const tone =
    category.overspent === 'cash'
      ? 'red'
      : category.overspent === 'credit'
        ? 'yellow'
        : category.available > 0
          ? 'green'
          : 'grey'
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-block min-w-24 rounded-full px-3 py-0.5 text-right text-sm font-medium tabular-nums',
        tone === 'green' &&
          'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200',
        tone === 'grey' && 'bg-muted text-muted-foreground',
        tone === 'red' &&
          'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200',
        tone === 'yellow' &&
          'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200',
      )}
    >
      <Money
        value={category.available}
        currency={currency}
        className="text-inherit"
      />
    </span>
  )
}
