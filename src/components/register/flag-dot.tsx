import { FLAG_COLORS } from '#/lib/transactions'
import type { Flag } from '#/lib/transactions'

/** Colored dot for a flagged transaction. The name is announced too, so color is never alone. */
export function FlagDot({ flag }: { flag: Flag | null }) {
  if (!flag) return null
  return (
    <span
      className="mr-1.5 inline-flex items-center"
      data-testid="flag-dot"
      data-flag={flag}
    >
      <span
        aria-hidden
        className="inline-block size-2.5 rounded-full"
        style={{ background: FLAG_COLORS[flag] }}
      />
      <span className="sr-only">{flag} flag</span>
    </span>
  )
}
