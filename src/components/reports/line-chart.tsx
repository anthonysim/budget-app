import { useId, useRef, useState } from 'react'
import { ChartTooltip } from '#/components/reports/tooltip'
import { niceTicks, shortMonth } from '#/lib/chart'

const W = 720
const H = 260
const M = { l: 62, r: 56, t: 14, b: 30 }
const INNER_W = W - M.l - M.r
const INNER_H = H - M.t - M.b

export interface LinePoint {
  /** 'YYYY-MM-01' */
  month: string
  value: number | null
}

/**
 * One series over time: 2px line, ~10% area wash, 8px end dot with a surface ring, hairline
 * gridlines, crosshair tooltip that snaps to the nearest month (also reachable by arrow keys),
 * value labelled at the line's end. Gaps (null) break the line.
 */
export function LineChart({
  points,
  seriesLabel,
  format,
  formatAxis,
  ariaLabel,
}: {
  points: Array<LinePoint>
  seriesLabel: string
  /** Full value text for tooltips. */
  format: (value: number) => string
  /** Compact text for axis ticks and the end label. */
  formatAxis: (value: number) => string
  ariaLabel: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const clipId = useId()
  const [active, setActive] = useState<number | null>(null)

  const values = points.flatMap((p) => (p.value === null ? [] : [p.value]))
  const { ticks, min, max } = niceTicks(
    values.length ? Math.min(...values) : 0,
    values.length ? Math.max(...values) : 1,
  )
  const n = points.length
  const x = (i: number) =>
    n <= 1 ? M.l + INNER_W / 2 : M.l + (INNER_W * i) / (n - 1)
  const y = (v: number) => M.t + INNER_H * (1 - (v - min) / (max - min || 1))

  // contiguous runs of non-null points
  const runs: Array<Array<number>> = []
  points.forEach((p, i) => {
    if (p.value === null) return
    const last = runs.at(-1)
    if (last && last.at(-1) === i - 1) last.push(i)
    else runs.push([i])
  })

  const spansYears =
    points[0]?.month.slice(0, 4) !== points.at(-1)?.month.slice(0, 4)
  const every = Math.max(1, Math.ceil(n / 8))
  const lastIdx = values.length
    ? points.map((p) => p.value !== null).lastIndexOf(true)
    : -1

  function nearest(clientX: number): number | null {
    const box = ref.current?.getBoundingClientRect()
    if (!box || n === 0) return null
    const px = ((clientX - box.left) / box.width) * W
    let best: number | null = null
    let dist = Infinity
    points.forEach((p, i) => {
      if (p.value === null) return
      const d = Math.abs(x(i) - px)
      if (d < dist) {
        dist = d
        best = i
      }
    })
    return best
  }

  function step(dir: 1 | -1) {
    const idxs = points.flatMap((p, i) => (p.value === null ? [] : [i]))
    if (!idxs.length) return
    const cur =
      active === null ? (dir === 1 ? -1 : idxs.length) : idxs.indexOf(active)
    const next = idxs[Math.min(idxs.length - 1, Math.max(0, cur + dir))]
    setActive(next ?? null)
  }

  const scale = (ref.current?.clientWidth ?? W) / W
  const activePoint = active === null ? undefined : points[active]
  const activeValue = activePoint?.value ?? null

  return (
    <div ref={ref} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        className="w-full overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-[var(--viz-s1)]"
        onPointerMove={(e) => setActive(nearest(e.clientX))}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            step(1)
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            step(-1)
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
              stroke={
                t === 0 && min < 0 ? 'var(--viz-axis)' : 'var(--viz-grid)'
              }
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
              {formatAxis(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % every === 0 ? (
            <text
              key={p.month}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize={11}
              fill="var(--viz-muted)"
            >
              {shortMonth(p.month, spansYears)}
            </text>
          ) : null,
        )}

        <clipPath id={clipId}>
          <rect x={M.l} y={M.t} width={INNER_W} height={INNER_H} />
        </clipPath>
        {runs.map((run) => {
          const first = run[0] ?? 0
          const lastOfRun = run.at(-1) ?? first
          const line = run
            .map(
              (i, k) =>
                `${k === 0 ? 'M' : 'L'}${x(i)},${y(points[i]?.value ?? 0)}`,
            )
            .join(' ')
          const area = `${line} L${x(lastOfRun)},${y(0)} L${x(first)},${y(0)} Z`
          return (
            <g key={first}>
              {run.length > 1 ? (
                <path
                  d={area}
                  fill="var(--viz-s1)"
                  opacity={0.1}
                  clipPath={`url(#${clipId})`}
                />
              ) : null}
              <path
                d={line}
                fill="none"
                stroke="var(--viz-s1)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          )
        })}

        {lastIdx >= 0 ? (
          <>
            <circle
              cx={x(lastIdx)}
              cy={y(points[lastIdx]?.value ?? 0)}
              r={4}
              fill="var(--viz-s1)"
              stroke="var(--viz-surface)"
              strokeWidth={2}
            />
            <text
              x={x(lastIdx) + 10}
              y={y(points[lastIdx]?.value ?? 0)}
              dominantBaseline="middle"
              fontSize={12}
              fontWeight={600}
              fill="var(--viz-ink)"
            >
              {formatAxis(points[lastIdx]?.value ?? 0)}
            </text>
          </>
        ) : null}

        {active !== null && activePoint && activeValue !== null ? (
          <>
            <line
              x1={x(active)}
              x2={x(active)}
              y1={M.t}
              y2={M.t + INNER_H}
              stroke="var(--viz-axis)"
              strokeWidth={1}
            />
            <circle
              cx={x(active)}
              cy={y(activeValue)}
              r={4}
              fill="var(--viz-s1)"
              stroke="var(--viz-surface)"
              strokeWidth={2}
            />
          </>
        ) : null}
      </svg>
      {active !== null && activePoint && activeValue !== null ? (
        <ChartTooltip
          x={x(active) * scale}
          y={y(activeValue) * scale}
          containerWidth={ref.current?.clientWidth ?? W}
          title={shortMonth(activePoint.month, true)}
          rows={[
            {
              label: seriesLabel,
              value: format(activeValue),
              color: 'var(--viz-s1)',
            },
          ]}
        />
      ) : null}
    </div>
  )
}
