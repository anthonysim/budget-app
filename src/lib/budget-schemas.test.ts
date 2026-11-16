import { describe, expect, it } from 'vitest'
import { createBudgetSchema, renameBudgetSchema } from './budget-schemas'

describe('budget schemas', () => {
  it('trims names and defaults currency', () => {
    const r = createBudgetSchema.parse({ name: '  Home  ' })
    expect(r).toEqual({ name: 'Home', currency: 'USD' })
  })
  it('rejects empty, too long, and unknown currency', () => {
    expect(createBudgetSchema.safeParse({ name: '   ' }).success).toBe(false)
    expect(createBudgetSchema.safeParse({ name: 'x'.repeat(61) }).success).toBe(
      false,
    )
    expect(
      createBudgetSchema.safeParse({ name: 'ok', currency: 'XXX' }).success,
    ).toBe(false)
  })
  it('rename requires uuid', () => {
    expect(
      renameBudgetSchema.safeParse({ budgetId: 'nope', name: 'a' }).success,
    ).toBe(false)
    expect(
      renameBudgetSchema.safeParse({
        budgetId: '3b3ed651-a8b6-4cdf-94e7-51660d1a6e7b',
        name: 'a',
      }).success,
    ).toBe(true)
  })
})
