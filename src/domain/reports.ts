import { addMonths, firstOfMonth } from '#/lib/month'

/** Pure report helpers. Amounts are integer milliunits; dates are 'YYYY-MM-DD'. */

export const RANGE_PRESETS = [
  'this_month',
  '3m',
  '6m',
  '12m',
  'ytd',
  'all',
  'custom',
] as const
export type RangePreset = (typeof RANGE_PRESETS)[number]

export const RANGE_LABELS: Record<RangePreset, string> = {
  this_month: 'This month',
  '3m': 'Last 3 months',
  '6m': 'Last 6 months',
  '12m': 'Last 12 months',
  ytd: 'Year to date',
  all: 'All time',
  custom: 'Custom range',
}

function lastDayOfMonth(month: string): string {
  const [y = 0, m = 1] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Concrete date range for a preset. Ranges cover whole calendar months ending with the current
 * month. `from` is null for "all time" (the caller starts at the first transaction).
 */
export function rangeFromPreset(
  preset: Exclude<RangePreset, 'custom'>,
  today: string,
): { from: string | null; to: string } {
  const thisMonth = firstOfMonth(new Date(`${today}T00:00:00`))
  const to = lastDayOfMonth(thisMonth)
  switch (preset) {
    case 'this_month':
      return { from: thisMonth, to }
    case '3m':
      return { from: addMonths(thisMonth, -2), to }
    case '6m':
      return { from: addMonths(thisMonth, -5), to }
    case '12m':
      return { from: addMonths(thisMonth, -11), to }
    case 'ytd':
      return { from: `${thisMonth.slice(0, 4)}-01-01`, to }
    case 'all':
      return { from: null, to }
  }
}

/** First-of-month strings from the month of `from` through the month of `to`, inclusive. */
export function monthsInRange(from: string, to: string): Array<string> {
  const months: Array<string> = []
  let m = `${from.slice(0, 7)}-01`
  const last = `${to.slice(0, 7)}-01`
  while (m <= last && months.length < 600) {
    months.push(m)
    m = addMonths(m, 1)
  }
  return months
}

export interface LabelledAmount {
  label: string
  amount: number
}

/**
 * Keeps the `n` largest rows (by amount) and folds the rest into one "Other" row.
 * Rows must already be positive magnitudes; order of the result is largest first, Other last.
 */
export function foldTopN(
  rows: ReadonlyArray<LabelledAmount>,
  n: number,
  otherLabel = 'Other',
): Array<LabelledAmount> {
  const sorted = [...rows].sort((a, b) => b.amount - a.amount)
  if (sorted.length <= n) return sorted
  const top = sorted.slice(0, n)
  const rest = sorted.slice(n).reduce((s, r) => s + r.amount, 0)
  return [...top, { label: otherLabel, amount: rest }]
}

export interface MonthlyNet {
  month: string
  assets: number
  liabilities: number
}

export interface NetWorthPoint {
  month: string
  assets: number
  liabilities: number
  net: number
}

/**
 * Net worth at the end of each month: the balance before the range plus the cumulative
 * monthly changes. `liabilities` is the (negative) balance of debt accounts.
 */
export function netWorthSeries(
  opening: { assets: number; liabilities: number },
  changes: ReadonlyArray<MonthlyNet>,
  months: ReadonlyArray<string>,
): Array<NetWorthPoint> {
  const byMonth = new Map(changes.map((c) => [c.month, c]))
  let assets = opening.assets
  let liabilities = opening.liabilities
  return months.map((month) => {
    const c = byMonth.get(month)
    assets += c?.assets ?? 0
    liabilities += c?.liabilities ?? 0
    return { month, assets, liabilities, net: assets + liabilities }
  })
}

// ---- Age of Money -------------------------------------------------------------------------

export interface MoneyEvent {
  /** 'YYYY-MM-DD' */
  date: string
  /** > 0 money in, < 0 money out */
  amount: number
}

export interface OutflowAge {
  date: string
  /** Weighted average age (days) of the dollars this outflow spent. */
  age: number
  /** Milliunits of this outflow that were funded by earlier inflows. */
  weight: number
}

const DAY_MS = 86_400_000
const dayNumber = (date: string) =>
  Math.floor(new Date(`${date}T00:00:00Z`).getTime() / DAY_MS)

/**
 * First-in first-out: every outflow spends the oldest unspent dollars. The age of an outflow is
 * how long those dollars sat before being spent. Events must be in chronological order; on the
 * same day inflows are applied before outflows. An outflow larger than the available money only
 * counts its funded part.
 */
export function ageOfMoneyTimeline(
  events: ReadonlyArray<MoneyEvent>,
): Array<OutflowAge> {
  const ordered = [...events].sort((a, b) =>
    a.date === b.date ? b.amount - a.amount : a.date < b.date ? -1 : 1,
  )
  const queue: Array<{ day: number; remaining: number }> = []
  const result: Array<OutflowAge> = []
  let head = 0

  for (const e of ordered) {
    if (e.amount > 0) {
      queue.push({ day: dayNumber(e.date), remaining: e.amount })
    } else if (e.amount < 0) {
      let need = -e.amount
      let weight = 0
      let ageSum = 0
      const today = dayNumber(e.date)
      while (need > 0 && head < queue.length) {
        const chunk = queue[head]
        if (!chunk) break
        const take = Math.min(need, chunk.remaining)
        ageSum += take * (today - chunk.day)
        weight += take
        need -= take
        chunk.remaining -= take
        if (chunk.remaining === 0) head++
      }
      if (weight > 0) {
        result.push({ date: e.date, age: ageSum / weight, weight })
      }
    }
  }
  return result
}

/** Age of Money as of a date: the dollar-weighted average age of the last `window` outflows. */
export function ageOfMoneyAt(
  timeline: ReadonlyArray<OutflowAge>,
  asOf: string,
  window = 10,
): number | null {
  const recent = timeline.filter((o) => o.date <= asOf).slice(-window)
  const weight = recent.reduce((s, o) => s + o.weight, 0)
  if (weight === 0) return null
  const total = recent.reduce((s, o) => s + o.age * o.weight, 0)
  return Math.round(total / weight)
}
