import { useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '#/lib/utils'

/**
 * Chart container: title, caption, and a Chart/Table toggle. The table is the accessible twin of
 * the chart, so every value is reachable without hovering.
 */
export function ChartCard({
  title,
  caption,
  chart,
  table,
  className,
}: {
  title: string
  caption?: string
  chart: ReactNode
  table: ReactNode
  className?: string
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  return (
    <figure
      className={cn(
        'viz-root bg-[var(--viz-surface)] flex flex-col gap-3 rounded-lg border p-4',
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-[var(--viz-ink)]">
            {title}
          </h2>
          {caption ? (
            <p className="text-sm text-[var(--viz-ink-2)]">{caption}</p>
          ) : null}
        </div>
        <div
          role="group"
          aria-label={`${title} view`}
          className="flex rounded-md border text-xs"
        >
          {(['chart', 'table'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn(
                'px-2.5 py-1 capitalize first:rounded-l-md last:rounded-r-md',
                view === v
                  ? 'bg-[var(--viz-ink)] text-[var(--viz-surface)]'
                  : 'text-[var(--viz-ink-2)] hover:bg-[var(--viz-grid)]',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </figcaption>
      {view === 'chart' ? chart : table}
    </figure>
  )
}

/** Plain data table used for every chart's table view. */
export function DataTable({
  columns,
  rows,
}: {
  columns: Array<string>
  rows: Array<Array<ReactNode>>
}) {
  return (
    <div className="max-h-80 overflow-auto">
      <table className="w-full text-sm text-[var(--viz-ink)]">
        <thead className="text-left text-[var(--viz-ink-2)]">
          <tr>
            {columns.map((c, i) => (
              <th
                key={c}
                className={cn('px-2 py-1 font-medium', i > 0 && 'text-right')}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[var(--viz-grid)]">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className={cn(
                    'px-2 py-1',
                    j > 0 && 'text-right tabular-nums',
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="py-10 text-center text-sm text-[var(--viz-ink-2)]">
      {children}
    </p>
  )
}
