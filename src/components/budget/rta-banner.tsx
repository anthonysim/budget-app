import { Money } from '#/components/accounts/money'
import { cn } from '#/lib/utils'

export function RtaBanner({
  readyToAssign,
  currency,
  overspentCount,
}: {
  readyToAssign: number
  currency: string
  overspentCount: number
}) {
  const state =
    readyToAssign > 0 ? 'positive' : readyToAssign < 0 ? 'negative' : 'zero'
  return (
    <div
      role="status"
      aria-label="Ready to Assign"
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3',
        state === 'positive' &&
          'border-green-600/30 bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200',
        state === 'negative' &&
          'border-red-600/30 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200',
        state === 'zero' && 'bg-muted',
      )}
    >
      <div>
        <div className="text-2xl font-semibold tabular-nums">
          <Money
            value={readyToAssign}
            currency={currency}
            className="text-inherit"
          />
        </div>
        <div className="text-sm">
          {state === 'positive'
            ? 'Ready to Assign'
            : state === 'negative'
              ? 'Overassigned: you assigned more than you have'
              : 'All money assigned'}
        </div>
      </div>
      {overspentCount > 0 ? (
        <div className="text-sm font-medium text-red-700 dark:text-red-300">
          {overspentCount} categor{overspentCount === 1 ? 'y is' : 'ies are'}{' '}
          overspent
        </div>
      ) : null}
    </div>
  )
}
