/**
 * Debt payoff projection. Pure integer math (milliunits). Interest accrues monthly at APR/12 on
 * the balance and is rounded to the nearest milliunit each month.
 */

export interface PayoffInput {
  /** Amount owed, positive. */
  balance: number
  /** Annual interest rate in basis points (1999 = 19.99%). */
  aprBps: number
  /** Total payment made each month. */
  payment: number
}

export interface PayoffMonth {
  /** 1 = next month */
  month: number
  interest: number
  principal: number
  balance: number
}

export interface PayoffResult {
  /** Months until the balance reaches zero; null if it never does. */
  months: number | null
  totalInterest: number
  totalPaid: number
  schedule: Array<PayoffMonth>
  /** The payment does not even cover the monthly interest. */
  neverPaysOff: boolean
}

export const MAX_PAYOFF_MONTHS = 600

export function projectPayoff(input: PayoffInput): PayoffResult {
  const { balance: start, aprBps, payment } = input
  const schedule: Array<PayoffMonth> = []
  if (start <= 0) {
    return {
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      schedule,
      neverPaysOff: false,
    }
  }
  const monthlyRate = aprBps / 10_000 / 12

  let balance = start
  let totalInterest = 0
  let totalPaid = 0
  for (let month = 1; month <= MAX_PAYOFF_MONTHS; month++) {
    const interest = Math.round(balance * monthlyRate)
    // a payment that does not cover the interest only grows the debt
    if (payment <= interest) {
      return {
        months: null,
        totalInterest,
        totalPaid,
        schedule,
        neverPaysOff: true,
      }
    }
    const paid = Math.min(payment, balance + interest)
    const principal = paid - interest
    balance -= principal
    totalInterest += interest
    totalPaid += paid
    schedule.push({ month, interest, principal, balance })
    if (balance <= 0) {
      return {
        months: month,
        totalInterest,
        totalPaid,
        schedule,
        neverPaysOff: false,
      }
    }
  }
  return {
    months: null,
    totalInterest,
    totalPaid,
    schedule,
    neverPaysOff: false,
  }
}

export interface PayoffComparison {
  baseline: PayoffResult
  withExtra: PayoffResult
  monthsSaved: number | null
  interestSaved: number | null
}

/** Compares paying `payment` with paying `payment + extra`. */
export function comparePayoff(
  input: PayoffInput,
  extra: number,
): PayoffComparison {
  const baseline = projectPayoff(input)
  const withExtra = projectPayoff({ ...input, payment: input.payment + extra })
  const comparable = baseline.months !== null && withExtra.months !== null
  return {
    baseline,
    withExtra,
    monthsSaved: comparable
      ? (baseline.months ?? 0) - (withExtra.months ?? 0)
      : null,
    interestSaved: comparable
      ? baseline.totalInterest - withExtra.totalInterest
      : null,
  }
}

/** 'YYYY-MM-01' for `months` months after `from` ('YYYY-MM-01'). */
export function payoffMonth(from: string, months: number): string {
  const [y = 0, m = 1] = from.split('-').map(Number)
  const total = y * 12 + (m - 1) + months
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`
}
