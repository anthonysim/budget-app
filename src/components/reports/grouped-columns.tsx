import { useRef, useState } from 'react'
import { ChartTooltip, Legend } from '#/components/reports/tooltip'
import { formatAxisAmount, niceTicks, shortMonth } from '#/lib/chart'
import { formatMilliunits } from '#/lib/money'

const W = 720
const H = 260
const M = { l: 62, r: 12, t: 14, b: 30 }
const INNER_W = W - M.l - M.r
const INNER_H = H - M.t - M.b
const MAX_BAR = 24
const GAP = 2

/** Bar with a 4px rounded data end and a square baseline. */
function columnPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return ''
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h} Z`
}

export interface ColumnRow {
  month: string
  a: number
  b: number
}

/**
 * Two series per month as thin columns with a 2px surface gap between them. Both are shown in
 * the legend (identity is never color alone). The hover target is the whole month band.
 */
export function GroupedColumns({
  rows,
  aLabel,
  bLabel,
  currency,
  ariaLabel,
}: {
  rows: Array<ColumnRow>
  aLabel: string
  bLabel: string
  currency: string
  ariaLabel: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<number | null>(null)
  const n = rows.length
  const { ticks, max } = niceTicks(
    0,
    Math.max(0, ...rows.flatMap((r) => [r.a, r.b])),
  )
  const band = INNER_W / Math.max(1, n)
  const barW = Math.min(MAX_BAR, (band - 8) / 2 - GAP / 2)
  const y = (v: number) => M.t + INNER_H * (1 - v / (max || 1))
  const spansYears =
    rows[0]?.month.slice(0, 4) !== rows.at(-1)?.month.slice(0, 4)
  const every = Math.max(1, Math.ceil(n / 12))
  const scale = (ref.current?.clientWidth ?? W) / W
  const row = active === null ? undefined : rows[active]

  return (
    <div className="flex flex-col gap-2">
      <Legend
        items={[
          { label: aLabel, color: 'var(--viz-s1)' },
          { label: bLabel, color: 'var(--viz-s2)' },
        ]}
      />
      <div ref={ref} className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          className="w-full overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-[var(--viz-s1)]"
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault()
              setActive((a) => Math.min(n - 1, (a ?? -1) + 1))
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault()
              setActive((a) => Math.max(0, (a ?? n) - 1))
            } else if (e.key === 'Escape') setActive(null)
          }}
        >
          <title>{ariaLabel}</title>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={M.l}
                x2={W - M.r}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? 'var(--viz-axis)' : 'var(--viz-grid)'}
                strokeWidth={1}
              />
              <text
                x={M.l - 8}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--viz-muted)"
              >
                {formatAxisAmount(t, currency)}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cx = M.l + band * i + band / 2
            const dim = active !== null && active !== i
            const aX = cx - GAP / 2 - barW
            const bX = cx + GAP / 2
            return (
              <g key={r.month} opacity={dim ? 0.55 : 1}>
                <path
                  d={columnPath(aX, y(r.a), barW, y(0) - y(r.a))}
                  fill="var(--viz-s1)"
                />
                <path
                  d={columnPath(bX, y(r.b), barW, y(0) - y(r.b))}
                  fill="var(--viz-s2)"
                />
                {i % every === 0 ? (
                  <text
                    x={cx}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--viz-muted)"
                  >
                    {shortMonth(r.month, spansYears)}
                  </text>
                ) : null}
                <rect
                  data-testid="month-hit"
                  x={M.l + band * i}
                  y={M.t}
                  width={band}
                  height={INNER_H}
                  fill="transparent"
                  onPointerMove={() => setActive(i)}
                />
              </g>
            )
          })}
        </svg>
        {row && active !== null ? (
          <ChartTooltip
            x={(M.l + band * active + band / 2) * scale}
            y={y(Math.max(row.a, row.b)) * scale}
            containerWidth={ref.current?.clientWidth ?? W}
            title={shortMonth(row.month, true)}
            rows={[
              {
                label: aLabel,
                value: formatMilliunits(row.a, currency),
                color: 'var(--viz-s1)',
              },
              {
                label: bLabel,
                value: formatMilliunits(row.b, currency),
                color: 'var(--viz-s2)',
              },
              {
                label: 'Net',
                value: formatMilliunits(row.a - row.b, currency),
              },
            ]}
          />
        ) : null}
      </div>
    </div>
  )
}
