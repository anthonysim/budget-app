import { z } from 'zod'
import { createTransactionSchema, dateSchema } from '#/lib/transactions'

export const FREQUENCIES = [
  'once',
  'daily',
  'weekly',
  'biweekly',
  'twice_monthly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannual',
  'yearly',
] as const
export type Frequency = (typeof FREQUENCIES)[number]

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  once: 'Once',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every other week',
  twice_monthly: 'Twice a month',
  monthly: 'Monthly',
  bimonthly: 'Every 2 months',
  quarterly: 'Every 3 months',
  semiannual: 'Twice a year',
  yearly: 'Yearly',
}

const MONTH_STEP: Partial<Record<Frequency, number>> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  yearly: 12,
}

/** Max occurrences created in one catch-up run (guards against a daily schedule left for years). */
export const MAX_CATCH_UP = 120

function parse(date: string): { y: number; m: number; d: number } {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number)
  return { y, m, d }
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function format(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function addDays(date: string, days: number): string {
  const { y, m, d } = parse(date)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return format(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}

/** Same day-of-month `anchorDay` (clamped to the month length) `months` months later. */
function addMonthsAnchored(
  date: string,
  months: number,
  anchorDay: number,
): string {
  const { y, m } = parse(date)
  const total = y * 12 + (m - 1) + months
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return format(ny, nm, Math.min(anchorDay, daysInMonth(ny, nm)))
}

/** The two days of the month used by a twice-monthly schedule, ascending. */
function twiceMonthlyDays(anchorDay: number): [number, number] {
  const other = anchorDay <= 15 ? anchorDay + 15 : anchorDay - 15
  return anchorDay < other ? [anchorDay, other] : [other, anchorDay]
}

/**
 * The occurrence after `date`, or null for a one-off.
 * `anchorDay` is the original day-of-month, so Jan 31 -> Feb 28 -> Mar 31 (no drift).
 */
export function nextOccurrence(
  date: string,
  frequency: Frequency,
  anchorDay: number,
): string | null {
  switch (frequency) {
    case 'once':
      return null
    case 'daily':
      return addDays(date, 1)
    case 'weekly':
      return addDays(date, 7)
    case 'biweekly':
      return addDays(date, 14)
    case 'twice_monthly': {
      const { y, m, d } = parse(date)
      const dim = daysInMonth(y, m)
      const [a, b] = twiceMonthlyDays(anchorDay).map((x) =>
        Math.min(x, dim),
      ) as [number, number]
      if (d < a) return format(y, m, a)
      if (d < b) return format(y, m, b)
      return addMonthsAnchored(
        format(y, m, 1),
        1,
        twiceMonthlyDays(anchorDay)[0],
      )
    }
    default:
      return addMonthsAnchored(date, MONTH_STEP[frequency] ?? 1, anchorDay)
  }
}

/**
 * Occurrences due on or before `until`, starting from `next` (inclusive), and the schedule's
 * next date afterwards (null when a one-off has been entered or the end date passed).
 */
export function dueOccurrences(
  next: string,
  frequency: Frequency,
  anchorDay: number,
  until: string,
  endDate: string | null = null,
  max: number = MAX_CATCH_UP,
): { due: Array<string>; nextDate: string | null } {
  const due: Array<string> = []
  let cursor: string | null = next
  while (cursor && cursor <= until && due.length < max) {
    if (endDate && cursor > endDate) {
      cursor = null
      break
    }
    due.push(cursor)
    cursor = nextOccurrence(cursor, frequency, anchorDay)
  }
  if (cursor && endDate && cursor > endDate) cursor = null
  return { due, nextDate: cursor }
}

export function dayOfMonth(date: string): number {
  return parse(date).d
}

const scheduleFields = {
  frequency: z.enum(FREQUENCIES),
  endDate: dateSchema.nullable(),
}

/** A scheduled transaction is a transaction template plus a recurrence. */
export const scheduledInputSchema = createTransactionSchema
  .omit({ cleared: true })
  .extend(scheduleFields)

export const createScheduledSchema = scheduledInputSchema

export const updateScheduledSchema = scheduledInputSchema.extend({
  scheduledId: z.uuid(),
})

export const scheduledRefSchema = z.object({
  budgetId: z.uuid(),
  scheduledId: z.uuid(),
})
