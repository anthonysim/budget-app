import { describe, expect, it } from 'vitest'
import {
  createAccountSchema,
  moveWithinGroup,
  isOnBudgetType,
  startingBalanceFor,
} from './accounts'

describe('accounts', () => {
  it('classifies on-budget vs tracking', () => {
    expect(isOnBudgetType('checking')).toBe(true)
    expect(isOnBudgetType('credit_card')).toBe(true)
    expect(isOnBudgetType('mortgage')).toBe(false)
    expect(isOnBudgetType('asset')).toBe(false)
  })

  it('stores debt starting balances as negative', () => {
    expect(startingBalanceFor('credit_card', 250000)).toBe(-250000)
    expect(startingBalanceFor('credit_card', -250000)).toBe(-250000)
    expect(startingBalanceFor('checking', 1000)).toBe(1000)
    expect(startingBalanceFor('checking', -1000)).toBe(-1000)
  })

  it('validates create input', () => {
    const base = {
      budgetId: '3b3ed651-a8b6-4cdf-94e7-51660d1a6e7b',
      name: ' Checking ',
      type: 'checking',
      startingBalance: 1000,
    }
    expect(createAccountSchema.parse(base).name).toBe('Checking')
    expect(
      createAccountSchema.safeParse({ ...base, type: 'bogus' }).success,
    ).toBe(false)
    expect(
      createAccountSchema.safeParse({ ...base, startingBalance: 1.5 }).success,
    ).toBe(false)
    expect(createAccountSchema.safeParse({ ...base, name: '' }).success).toBe(
      false,
    )
  })

  it('moves an account within its group only', () => {
    const all = ['a', 'x', 'b', 'y', 'c']
    const group = ['a', 'b', 'c'] // x, y belong to another group
    expect(moveWithinGroup(all, group, 'b', -1)).toEqual([
      'b',
      'x',
      'a',
      'y',
      'c',
    ])
    expect(moveWithinGroup(all, group, 'b', 1)).toEqual([
      'a',
      'x',
      'c',
      'y',
      'b',
    ])
    expect(moveWithinGroup(all, group, 'a', -1)).toEqual(all)
    expect(moveWithinGroup(all, group, 'c', 1)).toEqual(all)
  })
})
