/**
 * Budget months are stored as `date` strings on the first of the month: 'YYYY-MM-01'.
 * All helpers work on those strings in UTC to avoid timezone drift.
 */
export type MonthString = string

export function firstOfMonth(date: Date = new Date()): MonthString {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export function addMonths(month: MonthString, delta: number): MonthString {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}

export function compareMonths(a: MonthString, b: MonthString): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function formatMonth(month: MonthString, locale = 'en-US'): string {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)))
}

/** 'YYYY-MM' (URL form) -> 'YYYY-MM-01', or null if invalid. */
export function monthFromParam(param: unknown): MonthString | null {
  if (typeof param !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(param)) {
    return null
  }
  return `${param}-01`
}

/** 'YYYY-MM-01' -> 'YYYY-MM' for URLs. */
export function monthToParam(month: MonthString): string {
  return month.slice(0, 7)
}
