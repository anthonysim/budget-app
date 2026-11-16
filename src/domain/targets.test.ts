import { describe, expect, it } from 'vitest'
import {
  computeTargetProgress,
  monthsLeftInclusive,
  weekdayOccurrences,
} from './targets'
import type { Target } from './targets'

const NOV = '2026-11-01'
const fig = (carriedIn = 0, assigned = 0, activity = 0) => ({
  carriedIn,
  assigned,
  activity,
})
const target = (over: Partial<Target>): Target => ({
  type: 'needed_for_spending',
  amount: 100_000,
  repeat: 'monthly',
  dueDate: '2026-11-15',
  behavior: 'set_aside',
  ...over,
})

describe('helpers', () => {
  it('monthsLeftInclusive', () => {
    expect(monthsLeftInclusive(NOV, '2026-11-20')).toBe(1)
    expect(monthsLeftInclusive(NOV, '2026-12-01')).toBe(2)
    expect(monthsLeftInclusive(NOV, '2027-02-10')).toBe(4)
    expect(monthsLeftInclusive(NOV, '2026-09-01')).toBe(1) // overdue
  })
  it('weekdayOccurrences', () => {
    // Nov 2026 starts on a Sunday and has 30 days: Sundays and Mondays occur 5 times, the rest 4
    expect(weekdayOccurrences(NOV, '2026-11-01')).toBe(5) // Sunday
    expect(weekdayOccurrences(NOV, '2026-11-02')).toBe(5) // Monday
    expect(weekdayOccurrences(NOV, '2026-11-03')).toBe(4) // Tuesday
  })
})

describe('needed_for_spending, monthly', () => {
  it('set aside: needs the full amount every month, ignoring leftovers', () => {
    const r = computeTargetProgress(target({}), NOV, fig(30_000, 0, 0))
    expect(r.neededThisMonth).toBe(100_000)
    expect(r.underfunded).toBe(100_000)
    expect(r.status).toBe('underfunded')
  })
  it('refill: only tops up to the amount', () => {
    const r = computeTargetProgress(
      target({ behavior: 'refill' }),
      NOV,
      fig(30_000, 0, 0),
    )
    expect(r.neededThisMonth).toBe(70_000)
    expect(r.underfunded).toBe(70_000)
  })
  it('is funded once enough is assigned', () => {
    const r = computeTargetProgress(target({}), NOV, fig(0, 100_000, 0))
    expect(r.underfunded).toBe(0)
    expect(r.status).toBe('funded')
    expect(r.progress).toBe(1)
  })
  it('reports partial progress', () => {
    const r = computeTargetProgress(target({}), NOV, fig(0, 40_000, 0))
    expect(r.underfunded).toBe(60_000)
    expect(r.progress).toBeCloseTo(0.4)
  })
})

describe('needed_for_spending, weekly / yearly / once', () => {
  it('weekly multiplies by the weekday occurrences in the month', () => {
    // $25 every Sunday, Nov 2026 has 5 Sundays
    const r = computeTargetProgress(
      target({ repeat: 'weekly', amount: 25_000, dueDate: '2026-11-01' }),
      NOV,
      fig(),
    )
    expect(r.neededThisMonth).toBe(125_000)
  })
  it('yearly spreads the shortfall over the months left until the due month', () => {
    // $1,200 due Dec 15, in November: 2 months left, nothing saved yet
    const r = computeTargetProgress(
      target({ repeat: 'yearly', amount: 1_200_000, dueDate: '2026-12-15' }),
      NOV,
      fig(),
    )
    expect(r.neededThisMonth).toBe(600_000)
    // with $600 already carried in, the remaining $600 over 2 months
    const r2 = computeTargetProgress(
      target({ repeat: 'yearly', amount: 1_200_000, dueDate: '2026-12-15' }),
      NOV,
      fig(600_000),
    )
    expect(r2.neededThisMonth).toBe(300_000)
  })
  it('yearly rolls to next year when this year occurrence has passed', () => {
    // due every Mar 1; in November the next one is Mar 2027: Nov, Dec, Jan, Feb, Mar = 5 months
    const r = computeTargetProgress(
      target({ repeat: 'yearly', amount: 400_000, dueDate: '2026-03-01' }),
      NOV,
      fig(),
    )
    expect(r.neededThisMonth).toBe(80_000)
  })
  it('once (custom date) spreads to the date; overdue needs everything now', () => {
    const r = computeTargetProgress(
      target({ repeat: 'once', amount: 300_000, dueDate: '2027-01-20' }),
      NOV,
      fig(),
    )
    expect(r.neededThisMonth).toBe(100_000)
    const overdue = computeTargetProgress(
      target({ repeat: 'once', amount: 300_000, dueDate: '2026-09-01' }),
      NOV,
      fig(100_000),
    )
    expect(overdue.neededThisMonth).toBe(200_000)
  })
})

describe('have_balance', () => {
  const t = (over: Partial<Target> = {}): Target => ({
    type: 'have_balance',
    amount: 600_000,
    repeat: null,
    dueDate: null,
    behavior: null,
    ...over,
  })
  it('without a date needs the whole shortfall now', () => {
    const r = computeTargetProgress(t(), NOV, fig(100_000))
    expect(r.neededThisMonth).toBe(500_000)
  })
  it('with a date spreads the shortfall', () => {
    // $600 by Jan 31 from nothing: Nov, Dec, Jan = 3 months
    const r = computeTargetProgress(t({ dueDate: '2027-01-31' }), NOV, fig())
    expect(r.neededThisMonth).toBe(200_000)
  })
  it('spending this month raises what is needed', () => {
    const r = computeTargetProgress(
      t({ dueDate: '2027-01-31' }),
      NOV,
      fig(300_000, 0, -60_000),
    )
    // base 240 -> shortfall 360 over 3 months
    expect(r.neededThisMonth).toBe(120_000)
  })
  it('is satisfied when already at the balance', () => {
    const r = computeTargetProgress(t(), NOV, fig(600_000))
    expect(r.status).toBe('none')
    expect(r.progress).toBe(1)
  })
  it('rounds the monthly need up', () => {
    const r = computeTargetProgress(
      t({ amount: 100_000, dueDate: '2027-01-31' }),
      NOV,
      fig(),
    )
    expect(r.neededThisMonth).toBe(33_334)
  })
})

describe('monthly_funding', () => {
  const t: Target = {
    type: 'monthly_funding',
    amount: 50_000,
    repeat: null,
    dueDate: null,
    behavior: null,
  }
  it('needs the amount each month regardless of balance', () => {
    expect(computeTargetProgress(t, NOV, fig(999_000)).neededThisMonth).toBe(
      50_000,
    )
  })
  it('progress is this month assigned over the amount', () => {
    const r = computeTargetProgress(t, NOV, fig(0, 25_000))
    expect(r.progress).toBeCloseTo(0.5)
    expect(r.underfunded).toBe(25_000)
  })
})
