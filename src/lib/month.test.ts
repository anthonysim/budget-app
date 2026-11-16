import { describe, expect, it } from 'vitest'
import { addMonths, compareMonths, firstOfMonth, formatMonth } from './month'

describe('month', () => {
  it('firstOfMonth', () => {
    expect(firstOfMonth(new Date(2026, 10, 15))).toBe('2026-11-01')
  })
  it('addMonths crosses year boundaries', () => {
    expect(addMonths('2026-11-01', 2)).toBe('2027-01-01')
    expect(addMonths('2026-01-01', -1)).toBe('2025-12-01')
    expect(addMonths('2026-03-01', 0)).toBe('2026-03-01')
  })
  it('compareMonths', () => {
    expect(compareMonths('2026-01-01', '2026-02-01')).toBe(-1)
    expect(compareMonths('2026-02-01', '2026-01-01')).toBe(1)
    expect(compareMonths('2026-02-01', '2026-02-01')).toBe(0)
  })
  it('formatMonth', () => {
    expect(formatMonth('2026-11-01')).toBe('November 2026')
  })
})
