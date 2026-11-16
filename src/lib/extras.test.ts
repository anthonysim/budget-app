import { describe, expect, it } from 'vitest'
import { saveMonthNoteSchema } from './budget-month'
import { escapeLike, searchSchema } from './search'
import { FLAGS, FLAG_COLORS, setFlagSchema } from './transactions'
import { updateAccountSchema } from './accounts'

const id = '3b3ed651-a8b6-4cdf-94e7-51660d1a6e7b'

describe('search', () => {
  it('escapes LIKE wildcards so text matches literally', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\')
    expect(escapeLike('plain')).toBe('plain')
  })
  it('validates the query', () => {
    expect(searchSchema.safeParse({ budgetId: id, q: '  ' }).success).toBe(
      false,
    )
    expect(
      searchSchema.safeParse({ budgetId: id, q: 'x'.repeat(101) }).success,
    ).toBe(false)
    expect(searchSchema.parse({ budgetId: id, q: ' coffee ' }).q).toBe('coffee')
  })
})

describe('flags', () => {
  it('every flag has a color', () => {
    for (const f of FLAGS) expect(FLAG_COLORS[f]).toMatch(/^#[0-9a-f]{6}$/i)
  })
  it('validates setting and clearing flags', () => {
    expect(
      setFlagSchema.safeParse({
        budgetId: id,
        transactionIds: [id],
        flag: 'red',
      }).success,
    ).toBe(true)
    expect(
      setFlagSchema.safeParse({
        budgetId: id,
        transactionIds: [id],
        flag: null,
      }).success,
    ).toBe(true)
    expect(
      setFlagSchema.safeParse({
        budgetId: id,
        transactionIds: [id],
        flag: 'pink',
      }).success,
    ).toBe(false)
    expect(
      setFlagSchema.safeParse({ budgetId: id, transactionIds: [], flag: 'red' })
        .success,
    ).toBe(false)
  })
})

describe('month notes and debt details', () => {
  it('month note allows clearing and caps length', () => {
    expect(
      saveMonthNoteSchema.safeParse({
        budgetId: id,
        month: '2026-11-01',
        note: '',
      }).success,
    ).toBe(true)
    expect(
      saveMonthNoteSchema.safeParse({
        budgetId: id,
        month: '2026-11-15',
        note: 'x',
      }).success,
    ).toBe(false)
    expect(
      saveMonthNoteSchema.safeParse({
        budgetId: id,
        month: '2026-11-01',
        note: 'x'.repeat(2001),
      }).success,
    ).toBe(false)
  })
  it('account update accepts optional APR and minimum payment', () => {
    const base = { budgetId: id, accountId: id, name: 'Visa', note: null }
    expect(updateAccountSchema.safeParse(base).success).toBe(true)
    expect(
      updateAccountSchema.safeParse({
        ...base,
        aprBps: 1999,
        minPayment: 35_000,
      }).success,
    ).toBe(true)
    expect(updateAccountSchema.safeParse({ ...base, aprBps: -1 }).success).toBe(
      false,
    )
    expect(
      updateAccountSchema.safeParse({ ...base, aprBps: 100_001 }).success,
    ).toBe(false)
  })
})
