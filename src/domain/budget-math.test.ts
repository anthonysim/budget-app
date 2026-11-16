import { describe, expect, it } from 'vitest'
import { computeBudgetMonth } from './budget-math'
import type { BudgetMathInput } from './budget-math'

const NOV = '2026-11-01'
const DEC = '2026-12-01'
const JAN = '2027-01-01'
const A = 'cat-a'
const B = 'cat-b'

function input(over: Partial<BudgetMathInput> = {}): BudgetMathInput {
  return {
    categoryIds: [A, B],
    assignments: [],
    activity: [],
    income: [],
    ...over,
  }
}

describe('computeBudgetMonth', () => {
  it('empty budget is all zeros', () => {
    const r = computeBudgetMonth(input(), NOV)
    expect(r.readyToAssign).toBe(0)
    expect(r.categories.get(A)).toEqual({
      carriedIn: 0,
      assigned: 0,
      activity: 0,
      available: 0,
      overspent: null,
    })
  })

  it('income minus assigned is Ready to Assign', () => {
    const r = computeBudgetMonth(
      input({
        income: [{ month: NOV, amount: 1000_000 }],
        assignments: [{ categoryId: A, month: NOV, assigned: 600_000 }],
      }),
      NOV,
    )
    expect(r.readyToAssign).toBe(400_000)
    expect(r.categories.get(A)?.available).toBe(600_000)
    expect(r.totals.assigned).toBe(600_000)
  })

  it('spending reduces available but not Ready to Assign', () => {
    const r = computeBudgetMonth(
      input({
        income: [{ month: NOV, amount: 1000_000 }],
        assignments: [{ categoryId: A, month: NOV, assigned: 600_000 }],
        activity: [
          { categoryId: A, month: NOV, amount: -100_000, creditAmount: 0 },
        ],
      }),
      NOV,
    )
    expect(r.readyToAssign).toBe(400_000)
    const a = r.categories.get(A)
    expect(a?.activity).toBe(-100_000)
    expect(a?.available).toBe(500_000)
  })

  it('positive available rolls into the next month', () => {
    const base = input({
      income: [{ month: NOV, amount: 1000_000 }],
      assignments: [{ categoryId: A, month: NOV, assigned: 600_000 }],
      activity: [
        { categoryId: A, month: NOV, amount: -100_000, creditAmount: 0 },
      ],
    })
    const dec = computeBudgetMonth(base, DEC)
    expect(dec.categories.get(A)).toMatchObject({
      carriedIn: 500_000,
      assigned: 0,
      available: 500_000,
    })
    // income still counts, assigned still counts: RTA unchanged
    expect(dec.readyToAssign).toBe(400_000)
  })

  it('cash overspending resets next month and reduces its Ready to Assign', () => {
    const base = input({
      income: [{ month: NOV, amount: 1000_000 }],
      assignments: [{ categoryId: A, month: NOV, assigned: 100_000 }],
      activity: [
        { categoryId: A, month: NOV, amount: -150_000, creditAmount: 0 },
      ],
    })
    const nov = computeBudgetMonth(base, NOV)
    expect(nov.categories.get(A)).toMatchObject({
      available: -50_000,
      overspent: 'cash',
    })
    // overspending does not hit the same month's RTA
    expect(nov.readyToAssign).toBe(900_000)
    expect(nov.totals.cashOverspent).toBe(50_000)

    const dec = computeBudgetMonth(base, DEC)
    expect(dec.categories.get(A)).toMatchObject({
      carriedIn: 0,
      available: 0,
      overspent: null,
    })
    expect(dec.readyToAssign).toBe(850_000)
    // and stays reduced afterwards
    expect(computeBudgetMonth(base, JAN).readyToAssign).toBe(850_000)
  })

  it('credit overspending resets but does not reduce Ready to Assign', () => {
    const base = input({
      income: [{ month: NOV, amount: 1000_000 }],
      assignments: [{ categoryId: A, month: NOV, assigned: 100_000 }],
      activity: [
        { categoryId: A, month: NOV, amount: -150_000, creditAmount: -150_000 },
      ],
    })
    const nov = computeBudgetMonth(base, NOV)
    expect(nov.categories.get(A)).toMatchObject({
      available: -50_000,
      overspent: 'credit',
    })
    expect(nov.totals.cashOverspent).toBe(0)
    const dec = computeBudgetMonth(base, DEC)
    expect(dec.categories.get(A)?.available).toBe(0)
    expect(dec.readyToAssign).toBe(900_000)
  })

  it('mixed spending: credit covers the overspent part first, cash is the rest', () => {
    // spent 150 total (20 on credit), had 100 -> overspent 50: 20 credit + 30 cash
    const base = input({
      income: [{ month: NOV, amount: 1000_000 }],
      assignments: [{ categoryId: A, month: NOV, assigned: 100_000 }],
      activity: [
        { categoryId: A, month: NOV, amount: -150_000, creditAmount: -20_000 },
      ],
    })
    const nov = computeBudgetMonth(base, NOV)
    expect(nov.categories.get(A)?.overspent).toBe('cash')
    expect(nov.totals.cashOverspent).toBe(30_000)
    expect(computeBudgetMonth(base, DEC).readyToAssign).toBe(900_000 - 30_000)
  })

  it('refunds (positive activity) increase available', () => {
    const r = computeBudgetMonth(
      input({
        assignments: [{ categoryId: A, month: NOV, assigned: 100_000 }],
        activity: [
          { categoryId: A, month: NOV, amount: 25_000, creditAmount: 0 },
        ],
      }),
      NOV,
    )
    expect(r.categories.get(A)?.available).toBe(125_000)
  })

  it('assignments in later months do not affect earlier months', () => {
    const base = input({
      income: [{ month: NOV, amount: 500_000 }],
      assignments: [
        { categoryId: A, month: NOV, assigned: 100_000 },
        { categoryId: B, month: JAN, assigned: 300_000 },
      ],
    })
    expect(computeBudgetMonth(base, NOV).readyToAssign).toBe(400_000)
    expect(computeBudgetMonth(base, DEC).readyToAssign).toBe(400_000)
    expect(computeBudgetMonth(base, JAN).readyToAssign).toBe(100_000)
  })

  it('overassigning makes Ready to Assign negative', () => {
    const r = computeBudgetMonth(
      input({
        income: [{ month: NOV, amount: 100_000 }],
        assignments: [{ categoryId: A, month: NOV, assigned: 250_000 }],
      }),
      NOV,
    )
    expect(r.readyToAssign).toBe(-150_000)
  })

  it('a target month before any data is all zeros', () => {
    const r = computeBudgetMonth(
      input({
        income: [{ month: DEC, amount: 100_000 }],
        assignments: [{ categoryId: A, month: DEC, assigned: 50_000 }],
      }),
      NOV,
    )
    expect(r.readyToAssign).toBe(0)
    expect(r.categories.get(A)?.available).toBe(0)
  })

  it('negative income (income refunded) reduces Ready to Assign', () => {
    const r = computeBudgetMonth(
      input({
        income: [
          { month: NOV, amount: 1000_000 },
          { month: NOV, amount: -200_000 },
        ],
      }),
      NOV,
    )
    expect(r.readyToAssign).toBe(800_000)
  })

  it('totals sum across categories', () => {
    const r = computeBudgetMonth(
      input({
        assignments: [
          { categoryId: A, month: NOV, assigned: 100_000 },
          { categoryId: B, month: NOV, assigned: 50_000 },
        ],
        activity: [
          { categoryId: B, month: NOV, amount: -20_000, creditAmount: 0 },
        ],
      }),
      NOV,
    )
    expect(r.totals).toEqual({
      assigned: 150_000,
      activity: -20_000,
      available: 130_000,
      cashOverspent: 0,
    })
  })

  it('rollover through a gap of empty months', () => {
    const base = input({
      income: [{ month: NOV, amount: 300_000 }],
      assignments: [{ categoryId: A, month: NOV, assigned: 300_000 }],
      activity: [
        { categoryId: A, month: JAN, amount: -50_000, creditAmount: 0 },
      ],
    })
    const jan = computeBudgetMonth(base, JAN)
    expect(jan.categories.get(A)).toMatchObject({
      carriedIn: 300_000,
      available: 250_000,
    })
    expect(jan.readyToAssign).toBe(0)
  })

  it('overspent category absorbs a later assignment in the same month', () => {
    const base = input({
      income: [{ month: NOV, amount: 1000_000 }],
      assignments: [{ categoryId: A, month: NOV, assigned: 150_000 }],
      activity: [
        { categoryId: A, month: NOV, amount: -150_000, creditAmount: 0 },
      ],
    })
    // assigned enough to cover: no overspending anywhere
    const nov = computeBudgetMonth(base, NOV)
    expect(nov.categories.get(A)?.overspent).toBeNull()
    expect(computeBudgetMonth(base, DEC).readyToAssign).toBe(850_000)
  })
})
