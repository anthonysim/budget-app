import { describe, expect, it } from 'vitest'
import { formatDateString, todayString } from './date'

describe('date', () => {
  it('todayString uses the local calendar day', () => {
    expect(todayString(new Date(2026, 10, 5))).toBe('2026-11-05')
  })
  it('formats by budget date format', () => {
    expect(formatDateString('2026-11-05')).toBe('11/05/2026')
    expect(formatDateString('2026-11-05', 'DD/MM/YYYY')).toBe('05/11/2026')
    expect(formatDateString('2026-11-05', 'YYYY-MM-DD')).toBe('2026-11-05')
  })
})
