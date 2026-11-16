import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Headline number: label, value, and an optional delta against a named period. The delta carries
 * an arrow and words, never color alone.
 */
export function StatTile({
  label,
  value,
  delta,
}: {
  label: string
  value: ReactNode
  delta?: {
    text: string
    direction: 'up' | 'down' | 'flat'
    good: boolean
  } | null
}) {
  return (
    <div className="viz-root bg-[var(--viz-surface)] rounded-lg border p-4">
      <div className="text-sm text-[var(--viz-ink-2)]">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-[var(--viz-ink)]">
        {value}
      </div>
      {delta ? (
        <div
          className="mt-1 flex items-center gap-1 text-sm"
          style={{
            color:
              delta.direction === 'flat'
                ? 'var(--viz-ink-2)'
                : delta.good
                  ? 'var(--viz-good)'
                  : 'var(--viz-critical)',
          }}
        >
          {delta.direction === 'up' ? (
            <ArrowUpIcon className="size-4" aria-hidden />
          ) : delta.direction === 'down' ? (
            <ArrowDownIcon className="size-4" aria-hidden />
          ) : (
            <MinusIcon className="size-4" aria-hidden />
          )}
          {delta.text}
        </div>
      ) : null}
    </div>
  )
}
