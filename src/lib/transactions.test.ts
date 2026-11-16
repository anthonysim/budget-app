import { describe, expect, it } from 'vitest'
import {
  bulkUpdateSchema,
  combineAmount,
  createTransactionSchema,
  dateSchema,
  matchesSearch,
  runningBalances,
  splitAmount,
} from './transactions'

const id = '3b3ed651-a8b6-4cdf-94e7-51660d1a6e7b'

describe('transactions lib', () => {
  it('validates dates strictly', () => {
    expect(dateSchema.safeParse('2026-11-15').success).toBe(true)
    expect(dateSchema.safeParse('2026-02-30').success).toBe(false)
    expect(dateSchema.safeParse('11/15/2026').success).toBe(false)
  })

  it('splits and combines amounts', () => {
    expect(splitAmount(-5000)).toEqual({ outflow: 5000, inflow: 0 })
    expect(splitAmount(7000)).toEqual({ outflow: 0, inflow: 7000 })
    expect(combineAmount(5000, 0)).toBe(-5000)
    expect(combineAmount(0, 7000)).toBe(7000)
  })

  it('computes running balances', () => {
    const m = runningBalances([
      { id: 'a', amount: 1000 },
      { id: 'b', amount: -400 },
      { id: 'c', amount: 250 },
    ])
    expect([m.get('a'), m.get('b'), m.get('c')]).toEqual([1000, 600, 850])
  })

  it('searches case-insensitively across fields', () => {
    expect(matchesSearch('gro', ['Groceries', null])).toBe(true)
    expect(matchesSearch('xyz', ['Groceries', 'Whole Foods'])).toBe(false)
    expect(matchesSearch('  ', ['anything'])).toBe(true)
  })

  it('validates create input', () => {
    const ok = {
      budgetId: id,
      accountId: id,
      date: '2026-11-15',
      payeeName: ' Whole Foods ',
      categoryId: null,
      memo: null,
      amount: -42500,
      cleared: 'uncleared',
    }
    expect(createTransactionSchema.parse(ok).payeeName).toBe('Whole Foods')
    expect(
      createTransactionSchema.safeParse({ ...ok, amount: 1.5 }).success,
    ).toBe(false)
    expect(
      createTransactionSchema.safeParse({ ...ok, cleared: 'reconciled' })
        .success,
    ).toBe(false)
  })

  it('bulk update needs something to change', () => {
    expect(
      bulkUpdateSchema.safeParse({ budgetId: id, transactionIds: [id] })
        .success,
    ).toBe(false)
    expect(
      bulkUpdateSchema.safeParse({
        budgetId: id,
        transactionIds: [id],
        cleared: 'cleared',
      }).success,
    ).toBe(true)
    expect(
      bulkUpdateSchema.safeParse({
        budgetId: id,
        transactionIds: [id],
        categoryId: null,
      }).success,
    ).toBe(true)
  })
})
