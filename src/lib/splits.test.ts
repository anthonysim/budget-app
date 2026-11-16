import { describe, expect, it } from 'vitest'
import { reconcileDifference, splitRemaining, validateSplit } from './splits'

describe('splits', () => {
  it('computes the remaining amount', () => {
    expect(splitRemaining(-10_000, [{ amount: -4_000 }])).toBe(-6_000)
    expect(
      splitRemaining(-10_000, [{ amount: -4_000 }, { amount: -6_000 }]),
    ).toBe(0)
  })

  it('validates a split', () => {
    const ok = [{ amount: -4_000 }, { amount: -6_000 }]
    expect(validateSplit(-10_000, ok)).toBeNull()
    expect(validateSplit(-10_000, [{ amount: -10_000 }])).toMatch(
      /at least two/,
    )
    expect(
      validateSplit(-10_000, [{ amount: -4_000 }, { amount: -5_000 }]),
    ).toMatch(/add up/)
    expect(
      validateSplit(-10_000, [{ amount: -10_000 }, { amount: 0 }]),
    ).toMatch(/zero/)
  })

  it('supports mixed-sign lines (refund inside a purchase)', () => {
    expect(
      validateSplit(-7_000, [{ amount: -10_000 }, { amount: 3_000 }]),
    ).toBeNull()
  })

  it('reconcile difference', () => {
    expect(reconcileDifference(500_000, 500_000)).toBe(0)
    expect(reconcileDifference(510_000, 500_000)).toBe(10_000)
    expect(reconcileDifference(490_000, 500_000)).toBe(-10_000)
  })
})
