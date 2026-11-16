import { formatMilliunits } from '#/lib/money'
import { cn } from '#/lib/utils'

/** Formatted amount; negative values render in the destructive color. */
export function Money({
  value,
  currency,
  className,
}: {
  value: number
  currency: string
  className?: string
}) {
  return (
    <span
      className={cn('tabular-nums', value < 0 && 'text-destructive', className)}
    >
      {formatMilliunits(value, currency)}
    </span>
  )
}
