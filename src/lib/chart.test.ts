import { describe, expect, it } from 'vitest'
import { formatAxisAmount, niceTicks, shortMonth } from './chart'

describe('niceTicks', () => {
  it('rounds to clean numbers and includes zero', () => {
    const t = niceTicks(0, 87_000, 4)
    expect(t.ticks).toEqual([0, 20_000, 40_000, 60_000, 80_000, 100_000])
    expect(t.min).toBe(0)
    expect(t.max).toBe(100_000)
  })
  it('handles negative ranges', () => {
    const t = niceTicks(-350, 120, 4)
    expect(t.ticks[0]).toBeLessThanOrEqual(-350)
    expect(t.ticks).toContain(0)
    expect(t.ticks.at(-1)).toBeGreaterThanOrEqual(120)
  })
  it('handles an all-zero series', () => {
    expect(niceTicks(0, 0).ticks).toEqual([0, 1])
  })
})

describe('formatAxisAmount', () => {
  it('is full under 10,000 and compact above', () => {
    expect(formatAxisAmount(2_500_000)).toBe('$2,500')
    expect(formatAxisAmount(25_000_000)).toBe('$25K')
    expect(formatAxisAmount(-1_200_000)).toBe('-$1,200')
  })
})

describe('shortMonth', () => {
  it('abbreviates months', () => {
    expect(shortMonth('2026-11-01')).toBe('Nov')
    expect(shortMonth('2026-11-01', true)).toBe('Nov 26')
  })
})
