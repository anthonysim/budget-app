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
        'flex h-9 w-fit items-center gap-2 rounded-lg border px-3 text-sm',
        state === 'positive' &&
          'border-positive/30 bg-positive-soft text-positive-foreground',
        state === 'negative' &&
          'border-negative/30 bg-negative-soft text-negative-foreground',
        state === 'zero' && 'border-primary bg-primary text-primary-foreground',
      )}
    >
      <Money
        value={readyToAssign}
        currency={currency}
        className="font-semibold text-inherit tabular-nums"
      />
      <span aria-hidden>·</span>
      <span>
        {state === 'positive'
          ? 'Ready to Assign'
          : state === 'negative'
            ? 'Overassigned'
            : 'All money assigned'}
      </span>
      {overspentCount > 0 ? (
        <span className="text-negative-foreground border-l pl-2 font-medium">
          {overspentCount} overspent
        </span>
      ) : null}
    </div>
  )
}
