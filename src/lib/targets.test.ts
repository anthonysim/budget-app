import { describe, expect, it } from 'vitest'
import { setTargetSchema } from './targets'

const id = '3b3ed651-a8b6-4cdf-94e7-51660d1a6e7b'
const base = {
  budgetId: id,
  categoryId: id,
  type: 'needed_for_spending',
  amount: 100_000,
  repeat: 'monthly',
  dueDate: '2026-12-01',
  behavior: 'set_aside',
}

describe('setTargetSchema', () => {
  it('accepts a complete spending target', () => {
    expect(setTargetSchema.safeParse(base).success).toBe(true)
  })
  it('spending targets need repeat, due date and behavior', () => {
    expect(setTargetSchema.safeParse({ ...base, repeat: null }).success).toBe(
      false,
    )
    expect(setTargetSchema.safeParse({ ...base, dueDate: null }).success).toBe(
      false,
    )
    expect(setTargetSchema.safeParse({ ...base, behavior: null }).success).toBe(
      false,
    )
  })
  it('balance and monthly targets need only an amount', () => {
    const rest = { repeat: null, dueDate: null, behavior: null }
    expect(
      setTargetSchema.safeParse({ ...base, ...rest, type: 'have_balance' })
        .success,
    ).toBe(true)
    expect(
      setTargetSchema.safeParse({ ...base, ...rest, type: 'monthly_funding' })
        .success,
    ).toBe(true)
  })
  it('rejects zero and negative amounts', () => {
    expect(setTargetSchema.safeParse({ ...base, amount: 0 }).success).toBe(
      false,
    )
    expect(setTargetSchema.safeParse({ ...base, amount: -5 }).success).toBe(
      false,
    )
  })
})
