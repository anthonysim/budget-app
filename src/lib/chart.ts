/** Round, human-friendly axis ticks that include 0 and cover [min, max]. */
export function niceTicks(
  min: number,
  max: number,
  target = 4,
): { ticks: Array<number>; min: number; max: number } {
  const lo = Math.min(0, min)
  const hi = Math.max(0, max)
  if (lo === hi) return { ticks: [0, 1], min: 0, max: 1 }

  // smallest 1/2/5 x 10^k step that keeps the tick count near the target
  const pow = Math.pow(10, Math.floor(Math.log10((hi - lo) / target)))
  const step =
    [1, 2, 5, 10]
      .map((m) => m * pow)
      .find((st) => (hi - lo) / st <= target + 1) ?? 10 * pow

  const first = Math.floor(lo / step) * step
  const last = Math.ceil(hi / step) * step
  const ticks: Array<number> = []
  for (let v = first; v <= last + step / 2; v += step) {
    ticks.push(Math.round(v / step) * step)
  }
  return { ticks, min: first, max: last }
}

/** Axis label for an amount in milliunits: full under 10,000, compact (10K, 2.5M) from there. */
export function formatAxisAmount(milli: number, currency = 'USD'): string {
  const dollars = milli / 1000
  const abs = Math.abs(dollars)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    notation: abs >= 10_000 ? 'compact' : 'standard',
  }).format(dollars)
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** 'YYYY-MM-01' -> 'Nov' (or 'Nov 26' when `withYear`). */
export function shortMonth(month: string, withYear = false): string {
  const [y = '', m = '1'] = month.split('-')
  const name = SHORT_MONTHS[Number(m) - 1] ?? ''
  return withYear ? `${name} ${y.slice(2)}` : name
}
