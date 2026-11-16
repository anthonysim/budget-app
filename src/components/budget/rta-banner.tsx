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
          'border-positive/30 bg-positive-soft text-positive-foreground',
        state === 'negative' &&
          'border-negative/30 bg-negative-soft text-negative-foreground',
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
        <div className="text-sm font-medium text-negative-foreground">
          {overspentCount} categor{overspentCount === 1 ? 'y is' : 'ies are'}{' '}
          overspent
        </div>
      ) : null}
    </div>
  )
}
