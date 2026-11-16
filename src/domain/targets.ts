import type { MonthString } from '#/lib/month'

/**
 * Category targets (goals). Pure math; amounts are integer milliunits.
 *
 * - needed_for_spending: a bill or expense of `amount` on a schedule (weekly, monthly, yearly or once
 *   by a date). behavior 'set_aside' = fund `amount` each cycle; 'refill' = top the category up to `amount`.
 * - have_balance: reach a balance of `amount` (optionally by a date).
 * - monthly_funding: assign `amount` every month (also used for monthly debt payments).
 */

export type TargetType =
  'needed_for_spending' | 'have_balance' | 'monthly_funding'
export type TargetRepeat = 'weekly' | 'monthly' | 'yearly' | 'once'
export type TargetBehavior = 'set_aside' | 'refill'

export interface Target {
  type: TargetType
  amount: number
  /** needed_for_spending only */
  repeat: TargetRepeat | null
  /** needed_for_spending: the due date / a due-date anchor. have_balance: optional "by" date. */
  dueDate: string | null
  behavior: TargetBehavior | null
}

export interface CategoryMonthFigures {
  carriedIn: number
  assigned: number
  activity: number
}

export type TargetStatus = 'funded' | 'underfunded' | 'none'

export interface TargetProgress {
  /** Total that should be assigned this month to stay on track. */
  neededThisMonth: number
  /** What is still missing: max(0, neededThisMonth - assigned). */
  underfunded: number
  /** 0..1 progress toward the goal amount for the current cycle. */
  progress: number
  status: TargetStatus
}

function ym(date: string): { y: number; m: number; d: number } {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number)
  return { y, m, d }
}

/** Months from `month` to the month containing `date`, inclusive. At least 1 (overdue counts as 1). */
export function monthsLeftInclusive(month: MonthString, date: string): number {
  const a = ym(month)
  const b = ym(date)
  return Math.max(1, (b.y - a.y) * 12 + (b.m - a.m) + 1)
}

/** How many times the weekday of `anchor` occurs in the given month. */
export function weekdayOccurrences(month: MonthString, anchor: string): number {
  const { y, m } = ym(month)
  const { y: ay, m: am, d: ad } = ym(anchor)
  const weekday = new Date(Date.UTC(ay, am - 1, ad)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === weekday) count++
  }
  return count
}

/** The month (YYYY-MM-01) of the next yearly occurrence of `anchor` on or after `month`. */
function nextYearlyDueMonth(month: MonthString, anchor: string): string {
  const cur = ym(month)
  const a = ym(anchor)
  const year = a.m >= cur.m ? cur.y : cur.y + 1
  return `${year}-${String(a.m).padStart(2, '0')}-01`
}

const ceilDiv = (n: number, d: number) => Math.ceil(n / d)

export function computeTargetProgress(
  target: Target,
  month: MonthString,
  fig: CategoryMonthFigures,
): TargetProgress {
  const { carriedIn, assigned, activity } = fig
  let needed = 0
  let goal = target.amount // amount used for the progress bar
  let funded = carriedIn + assigned // what counts toward the goal

  switch (target.type) {
    case 'monthly_funding': {
      needed = target.amount
      funded = assigned
      break
    }
    case 'have_balance': {
      // spending this month eats into the balance, so measure from carried-in + activity
      const base = carriedIn + activity
      const shortfall = Math.max(0, target.amount - base)
      const left = target.dueDate
        ? monthsLeftInclusive(month, target.dueDate)
        : 1
      needed = ceilDiv(shortfall, left)
      funded = carriedIn + assigned + activity
      break
    }
    case 'needed_for_spending': {
      const repeat = target.repeat ?? 'monthly'
      const refill = target.behavior === 'refill'
      if (repeat === 'monthly') {
        needed = refill ? Math.max(0, target.amount - carriedIn) : target.amount
      } else if (repeat === 'weekly') {
        const total =
          target.amount *
          weekdayOccurrences(month, target.dueDate ?? `${month}`)
        goal = total
        needed = refill ? Math.max(0, total - carriedIn) : total
      } else {
        // yearly or once: spread the shortfall over the months left until it is due
        const due =
          repeat === 'yearly' && target.dueDate
            ? nextYearlyDueMonth(month, target.dueDate)
            : (target.dueDate ?? month)
        const left = monthsLeftInclusive(month, due)
        needed = ceilDiv(Math.max(0, target.amount - carriedIn), left)
      }
      break
    }
  }

  const underfunded = Math.max(0, needed - assigned)
  const progress =
    goal > 0 ? Math.min(1, Math.max(0, funded / goal)) : needed === 0 ? 1 : 0
  const status: TargetStatus =
    needed === 0 ? 'none' : underfunded > 0 ? 'underfunded' : 'funded'
  return { neededThisMonth: needed, underfunded, progress, status }
}
