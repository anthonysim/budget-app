import { useRef, useState } from 'react'
import { ChartTooltip } from '#/components/reports/tooltip'
import { formatMilliunits } from '#/lib/money'

/**
 * Ranked horizontal bars (one hue). Part-to-whole with more than a handful of parts reads best as
 * bars on a shared baseline. Bars are 16px, rounded at the data end only, value at the tip.
 */
export function BarList({
  rows,
  total,
  currency,
  ariaLabel,
}: {
  rows: Array<{ label: string; amount: number }>
  total: number
  currency: string
  ariaLabel: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ x: number; y: number; i: number } | null>(
    null,
  )
  const max = Math.max(1, ...rows.map((r) => r.amount))

  function show(e: React.PointerEvent | React.FocusEvent, i: number) {
    const box = ref.current?.getBoundingClientRect()
    const target = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (!box) return
    const px = 'clientX' in e ? e.clientX : target.left + target.width / 2
    setTip({ x: px - box.left, y: target.top - box.top + target.height / 2, i })
  }

  const active = tip ? rows[tip.i] : undefined
  return (
    <div ref={ref} className="relative" role="list" aria-label={ariaLabel}>
      {rows.map((r, i) => (
        <div
          key={r.label}
          role="listitem"
          tabIndex={0}
          onPointerMove={(e) => show(e, i)}
          onPointerLeave={() => setTip(null)}
          onFocus={(e) => show(e, i)}
          onBlur={() => setTip(null)}
          className="grid grid-cols-[minmax(6rem,11rem)_1fr] items-center gap-3 rounded py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--viz-s1)]"
        >
          <span
            className="truncate text-sm text-[var(--viz-ink-2)]"
            title={r.label}
          >
            {r.label}
          </span>
          <div className="flex items-center gap-2">
            <div
              data-testid="bar"
              className="h-4 rounded-r-[4px] transition-opacity"
              style={{
                width: `${Math.max(1, (r.amount / max) * 82)}%`,
                background: 'var(--viz-s1)',
                opacity: tip && tip.i !== i ? 0.55 : 1,
              }}
            />
            <span className="text-sm font-medium text-[var(--viz-ink)] tabular-nums">
              {formatMilliunits(r.amount, currency)}
            </span>
          </div>
        </div>
      ))}
      {tip && active ? (
        <ChartTooltip
          x={tip.x}
          y={tip.y}
          containerWidth={ref.current?.clientWidth ?? 600}
          title={active.label}
          rows={[
            {
              label: 'Spent',
              value: formatMilliunits(active.amount, currency),
              color: 'var(--viz-s1)',
            },
            {
              label: 'Share',
              value: `${total > 0 ? Math.round((active.amount / total) * 100) : 0}%`,
            },
          ]}
        />
      ) : null}
    </div>
  )
}
