/**
 * Tooltip card positioned by the chart (left/top in px, relative to the chart container).
 * Values lead (strong ink), labels follow (secondary). Series are keyed with a short line,
 * never a box. Content comes from props as React text nodes, never as HTML strings.
 */
export function ChartTooltip({
  x,
  y,
  title,
  rows,
  containerWidth,
}: {
  x: number
  y: number
  title: string
  rows: Array<{ label: string; value: string; color?: string }>
  containerWidth: number
}) {
  const flip = x > containerWidth * 0.6
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-36 rounded-md border bg-[var(--viz-surface)] px-3 py-2 text-xs shadow-md"
      style={{
        left: x,
        top: y,
        transform: `translate(${flip ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
      }}
    >
      <div className="mb-1 text-[var(--viz-ink-2)]">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          {r.color ? (
            <span
              aria-hidden
              className="inline-block h-0.5 w-3"
              style={{ background: r.color }}
            />
          ) : null}
          <span className="text-[var(--viz-ink-2)]">{r.label}</span>
          <span className="ml-auto font-semibold text-[var(--viz-ink)] tabular-nums">
            {r.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function Legend({
  items,
}: {
  items: Array<{ label: string; color: string; kind?: 'rect' | 'line' }>
}) {
  return (
    <ul className="flex flex-wrap gap-4 text-xs text-[var(--viz-ink-2)]">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={i.kind === 'line' ? 'h-0.5 w-4' : 'size-2.5 rounded-sm'}
            style={{ background: i.color }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  )
}
